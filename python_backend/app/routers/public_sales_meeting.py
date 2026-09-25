from html import escape
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import public_route
from app.services.sales_meeting_dispatch import dispatch_sales_meeting_outcome_email
from app.services.sales_meeting_service import SalesMeetingService

router = APIRouter()


def _result_html(*, title: str, message: str, ok: bool) -> str:
    color = "#0d9488" if ok else "#b91c1c"
    heading = "Attendance recorded" if ok else "Unable to confirm"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(title)}</title>
</head>
<body style="margin:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:{color};padding:20px 24px;color:#ffffff;">
          <h1 style="margin:0;font-size:20px;">{escape(heading)}</h1>
        </td></tr>
        <tr><td style="padding:24px;color:#334155;font-size:15px;line-height:1.6;">
          <p style="margin:0;">{escape(message)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


@router.get("/{pass_id}/confirm")
@public_route
def confirm_meeting_get(
    pass_id: str,
    background_tasks: BackgroundTasks,
    token: str = Query(..., min_length=16),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    service = SalesMeetingService(db)
    if not status:
        try:
            preview = service.preview(pass_id, token)
        except HTTPException as exc:
            return HTMLResponse(
                _result_html(title="Confirmation", message=str(exc.detail), ok=False),
                status_code=exc.status_code,
            )
        if not preview["canAct"]:
            detail = "This confirmation link has already been used." if preview["used"] else "This confirmation link has expired."
            return HTMLResponse(_result_html(title="Confirmation", message=detail, ok=False), status_code=410)
        return HTMLResponse(
            _result_html(
                title="Confirm meeting",
                message="Open the Meeting Started or Meeting Not Attended button from your email to record attendance.",
                ok=True,
            )
        )
    try:
        result = service.confirm(pass_id, token, status)
    except HTTPException as exc:
        return HTMLResponse(
            _result_html(title="Confirmation", message=str(exc.detail), ok=False),
            status_code=exc.status_code,
        )
    background_tasks.add_task(dispatch_sales_meeting_outcome_email, result["visitId"])
    return HTMLResponse(
        _result_html(
            title="Attendance recorded",
            message=f"Recorded as {result['meetingStatus'].replace('_', ' ')} for pass {result['passId']}.",
            ok=True,
        )
    )


@router.post("/{pass_id}/confirm")
@public_route
def confirm_meeting_post(
    pass_id: str,
    db: Annotated[Session, Depends(get_db)],
    background_tasks: BackgroundTasks,
    token: str = Query(..., min_length=16),
    status: str = Query(...),
):
    result = SalesMeetingService(db).confirm(pass_id, token, status)
    background_tasks.add_task(dispatch_sales_meeting_outcome_email, result["visitId"])
    return JSONResponse(result)


@router.get("/{pass_id}/confirm/preview")
@public_route
def confirm_meeting_preview(
    pass_id: str,
    token: str = Query(..., min_length=16),
    db: Session = Depends(get_db),
):
    return SalesMeetingService(db).preview(pass_id, token)
