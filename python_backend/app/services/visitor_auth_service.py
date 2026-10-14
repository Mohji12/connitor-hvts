"""Visitor account authentication: password and OAuth."""

from __future__ import annotations

import hashlib
import logging
import re
import secrets
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

import bcrypt
import httpx
from fastapi import HTTPException
from jose import jwt
from sqlalchemy.orm import Session

from app.config import get_settings, is_test_mode_enabled
from app.models import VisitorAccount, VisitorAccountAuth
from app.models.enums import ProfileStatus, VisitorAuthProvider
from app.services.messaging_service import EmailService
from app.services.visitor_account_service import VisitorAccountService
from app.utils.timezone import now_ist

logger = logging.getLogger(__name__)

_oauth_states: dict[str, dict[str, str]] = {}


class VisitorAuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.email = EmailService()
        self.accounts = VisitorAccountService(db)

    def _issue_jwt(self, account: VisitorAccount) -> str:
        settings = get_settings()
        expiry_hours = settings.visitor_jwt_expiry_hours
        issued = now_ist()
        expires = issued + timedelta(hours=expiry_hours)
        payload = {
            "sub": account.id,
            "role": "VISITOR",
            "email": account.email,
            "phone": account.phone,
            "name": f"{account.firstName} {account.lastName}".strip(),
            "profileStatus": account.profileStatus,
            "iat": int(issued.timestamp()),
            "exp": int(expires.timestamp()),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

    def login_with_password(self, identifier: str, password: str) -> dict[str, Any]:
        ident = identifier.strip().lower()
        account = (
            self.db.query(VisitorAccount)
            .filter(
                (VisitorAccount.email == ident)
                | (VisitorAccount.phone == re.sub(r"\D", "", identifier))
            )
            .first()
        )
        if not account:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if account.profileStatus != ProfileStatus.ACTIVE.value:
            if account.phoneVerified:
                self.accounts._activate_if_ready(account.id)
                self.db.refresh(account)
            if account.profileStatus != ProfileStatus.ACTIVE.value:
                raise HTTPException(
                    status_code=403,
                    detail="Account is not active. Verify your WhatsApp number to continue.",
                )

        auth = (
            self.db.query(VisitorAccountAuth)
            .filter(
                VisitorAccountAuth.visitorAccountId == account.id,
                VisitorAccountAuth.provider == VisitorAuthProvider.PASSWORD.value,
            )
            .first()
        )
        if not auth or not auth.passwordHash:
            raise HTTPException(status_code=401, detail="Password login not configured for this account")
        if not bcrypt.checkpw(password.encode(), auth.passwordHash.encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = self._issue_jwt(account)
        self.accounts._audit(account.id, "LOGIN_PASSWORD", actor_type="VISITOR", actor_id=account.id)
        self.db.commit()
        return {
            "access_token": token,
            "token_type": "bearer",
            "accountId": account.id,
            "name": f"{account.firstName} {account.lastName}".strip(),
        }

    def _account_by_phone(self, phone: str) -> VisitorAccount | None:
        normalized = re.sub(r"\D", "", phone or "")[-10:]
        if len(normalized) != 10:
            raise HTTPException(status_code=400, detail="Enter your 10-digit registered mobile number.")
        return self.db.query(VisitorAccount).filter(VisitorAccount.phone == normalized).first()

    def forgot_password(self, phone: str) -> dict[str, Any]:
        """Send a reset code on WhatsApp (SMS fallback) to the registered mobile."""
        account = self._account_by_phone(phone)
        if not account:
            raise HTTPException(status_code=404, detail="No account found with this mobile number.")
        now = now_ist()
        if (
            account.phoneVerificationAttempts >= 3
            and account.phoneVerificationExpiry
            and account.phoneVerificationExpiry > now
        ):
            raise HTTPException(
                status_code=429,
                detail="Too many wrong codes. Wait 10 minutes, then request a new code.",
            )

        settings = get_settings()
        otp = f"{secrets.randbelow(900000) + 100000}"
        if is_test_mode_enabled(settings):
            otp = settings.e2e_fixed_otp if len(settings.e2e_fixed_otp) == 6 else "123456"
        account.phoneVerificationOtpHash = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
        account.phoneVerificationExpiry = now + timedelta(minutes=10)
        account.phoneVerificationAttempts = 0
        self.db.commit()

        result: dict[str, Any] = {"message": "A 6-digit code has been sent to your WhatsApp."}
        if is_test_mode_enabled(settings):
            result["testOtp"] = otp
            return result
        try:
            self.accounts.sms.send_profile_phone_otp(account.phone, otp, valid_minutes=10)
        except Exception as exc:
            logger.error("Password reset OTP failed: %s", exc)
            raise HTTPException(status_code=503, detail="Failed to send the reset code. Please try again later.") from exc
        return result

    def reset_password(self, phone: str, otp: str, new_password: str) -> dict[str, str]:
        account = self._account_by_phone(phone)
        invalid = HTTPException(status_code=400, detail="Invalid or expired code.")
        if not account or not account.phoneVerificationOtpHash or not account.phoneVerificationExpiry:
            raise invalid
        if account.phoneVerificationExpiry < now_ist():
            raise HTTPException(status_code=400, detail="Code expired. Request a new one.")
        if account.phoneVerificationAttempts >= 3:
            raise HTTPException(
                status_code=429,
                detail="Too many wrong codes. Wait 10 minutes, then request a new code.",
            )
        if not bcrypt.checkpw(otp.encode(), account.phoneVerificationOtpHash.encode()):
            account.phoneVerificationAttempts += 1
            self.db.commit()
            raise invalid

        account.phoneVerificationOtpHash = None
        account.phoneVerificationExpiry = None
        account.phoneVerificationAttempts = 0
        account.phoneVerified = True

        password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        auth = (
            self.db.query(VisitorAccountAuth)
            .filter(
                VisitorAccountAuth.visitorAccountId == account.id,
                VisitorAccountAuth.provider == VisitorAuthProvider.PASSWORD.value,
            )
            .first()
        )
        if auth:
            auth.passwordHash = password_hash
        else:
            self.db.add(
                VisitorAccountAuth(
                    visitorAccountId=account.id,
                    provider=VisitorAuthProvider.PASSWORD.value,
                    passwordHash=password_hash,
                )
            )
        self.accounts._audit(account.id, "PASSWORD_RESET_BY_PHONE")
        self.db.commit()
        self.accounts._activate_if_ready(account.id)
        return {"message": "Password updated. Sign in with your new password."}

    def oauth_authorize_url(self, provider: str) -> dict[str, str]:
        settings = get_settings()
        state = secrets.token_urlsafe(16)
        redirect_base = settings.visitor_oauth_redirect_base or settings.frontend_url.rstrip("/")
        callback = f"{redirect_base}/api/public/visitor-auth/{provider}/callback"

        if provider == "google":
            if not settings.google_oauth_client_id:
                raise HTTPException(status_code=503, detail="Google OAuth not configured")
            params = {
                "client_id": settings.google_oauth_client_id,
                "redirect_uri": callback,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "online",
                "prompt": "select_account",
            }
            url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
        elif provider == "linkedin":
            if not settings.linkedin_oauth_client_id:
                raise HTTPException(status_code=503, detail="LinkedIn OAuth not configured")
            params = {
                "response_type": "code",
                "client_id": settings.linkedin_oauth_client_id,
                "redirect_uri": callback,
                "state": state,
                "scope": "openid profile email",
            }
            url = f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")

        _oauth_states[state] = {"provider": provider}
        return {"authorizationUrl": url, "state": state}

    def oauth_callback(self, provider: str, code: str, state: str) -> dict[str, Any]:
        if state not in _oauth_states or _oauth_states[state].get("provider") != provider:
            raise HTTPException(status_code=400, detail="Invalid OAuth state")
        del _oauth_states[state]

        settings = get_settings()
        redirect_base = settings.visitor_oauth_redirect_base or settings.frontend_url.rstrip("/")
        callback = f"{redirect_base}/api/public/visitor-auth/{provider}/callback"

        if provider == "google":
            profile = self._exchange_google(code, callback)
            provider_enum = VisitorAuthProvider.GOOGLE
        elif provider == "linkedin":
            profile = self._exchange_linkedin(code, callback)
            provider_enum = VisitorAuthProvider.LINKEDIN
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")

        email = profile.get("email", "").lower()
        subject = profile.get("sub", "")
        if not email or not subject:
            raise HTTPException(status_code=400, detail="OAuth profile missing email")

        account = self.db.query(VisitorAccount).filter(VisitorAccount.email == email).first()
        if not account:
            names = (profile.get("name") or "Visitor User").split(" ", 1)
            account = VisitorAccount(
                firstName=names[0],
                lastName=names[1] if len(names) > 1 else "",
                phone=f"oauth{hashlib.sha256(subject.encode()).hexdigest()[:10]}",
                email=email,
                emailType="PERSONAL",
                emailVerified=True,
                phoneVerified=False,
                profileStatus=ProfileStatus.PENDING_VERIFICATION.value,
            )
            self.db.add(account)
            self.db.flush()

        auth = (
            self.db.query(VisitorAccountAuth)
            .filter(
                VisitorAccountAuth.visitorAccountId == account.id,
                VisitorAccountAuth.provider == provider_enum.value,
            )
            .first()
        )
        if not auth:
            self.db.add(
                VisitorAccountAuth(
                    visitorAccountId=account.id,
                    provider=provider_enum.value,
                    providerSubject=subject,
                )
            )

        if account.profileStatus != ProfileStatus.ACTIVE.value and account.emailVerified:
            account.profileStatus = ProfileStatus.ACTIVE.value

        token = self._issue_jwt(account)
        self.accounts._audit(account.id, f"LOGIN_{provider_enum.value}", actor_type="VISITOR", actor_id=account.id)
        self.db.commit()
        return {
            "access_token": token,
            "token_type": "bearer",
            "accountId": account.id,
            "isNewAccount": account.profileStatus != ProfileStatus.ACTIVE.value,
        }

    def _exchange_google(self, code: str, redirect_uri: str) -> dict[str, str]:
        settings = get_settings()
        token_resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=30,
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Google token exchange failed")
        access_token = token_resp.json().get("access_token")
        user_resp = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Google profile fetch failed")
        data = user_resp.json()
        return {
            "sub": data.get("sub", ""),
            "email": data.get("email", ""),
            "name": data.get("name", ""),
        }

    def _exchange_linkedin(self, code: str, redirect_uri: str) -> dict[str, str]:
        settings = get_settings()
        token_resp = httpx.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.linkedin_oauth_client_id,
                "client_secret": settings.linkedin_oauth_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="LinkedIn token exchange failed")
        access_token = token_resp.json().get("access_token")
        user_resp = httpx.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="LinkedIn profile fetch failed")
        data = user_resp.json()
        return {
            "sub": data.get("sub", ""),
            "email": data.get("email", ""),
            "name": data.get("name", ""),
        }

