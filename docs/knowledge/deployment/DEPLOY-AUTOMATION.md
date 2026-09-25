# Connitor deploy automation

Backend → **EC2** at [https://connitor.bengalurutechcommunity.com](https://connitor.bengalurutechcommunity.com)  
Frontend → **Vercel** at [https://coninter-main.vercel.app](https://coninter-main.vercel.app) (Git: `dittocodes/coninter-main`, branch `main`, app root `frontend`)

## One-time setup

### 1. Local config

```powershell
cd C:\Users\Ditto\Desktop\connitor\connitor-main
Copy-Item .\scripts\deploy\config.example.env .\scripts\deploy\config.env
notepad .\scripts\deploy\config.env
```

| Key | Purpose |
| --- | --- |
| `FRONTEND_HEALTH_URL` | Production Vercel URL (trailing slash OK) |
| `NEXT_PUBLIC_BACKEND_API_URL` | API host baked into the frontend build |
| `VERCEL_GIT_REMOTE` / `VERCEL_GIT_BRANCH` | For `-UseGitPush` (default remote `coninter` → `main`) |
| `EC2_*` | Backend SSH/rsync settings |

### 2. Vercel

1. Import [dittocodes/coninter-main](https://github.com/dittocodes/coninter-main) in the Vercel dashboard.
2. **Root Directory:** `frontend`
3. **Environment variables** (Production + Preview): `NEXT_PUBLIC_BACKEND_API_URL=https://connitor.bengalurutechcommunity.com`
4. Build uses [`frontend/vercel.json`](../../../frontend/vercel.json) (`dist/` + SPA rewrites).

CLI login (once per machine):

```powershell
npx vercel@latest login
npx vercel@latest link --project coninter-main
```

### 3. EC2: browser origins and public links

On the server `python_backend/.env`:

```bash
PUBLIC_FRONTEND_URL=https://coninter-main.vercel.app
CORS_ALLOWED_ORIGINS=https://coninter-main.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

Then `sudo systemctl restart conni`.

### 4. EC2: systemd (recommended)

```bash
sudo cp /home/ubuntu/connitor/scripts/deploy/connitor-api.service.example /etc/systemd/system/connitor-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now connitor-api
```

Put nginx/Caddy in front for HTTPS on `connitor.bengalurutechcommunity.com` → app port.

---

## Deploy commands (from Windows)

```powershell
# Backend only
.\scripts\deploy\deploy-backend.ps1

# Frontend → Vercel production (local build verify + vercel deploy --prod)
.\scripts\deploy\deploy-frontend.ps1

# Frontend via Git push (Vercel auto-build on main)
.\scripts\deploy\deploy-frontend.ps1 -UseGitPush

# Both
.\scripts\deploy\deploy-all.ps1
```

Options:

```powershell
.\scripts\deploy\deploy-backend.ps1 -Method rsync
.\scripts\deploy\deploy-frontend.ps1 -SkipBuild
.\scripts\deploy\deploy-all.ps1 -BackendOnly
.\scripts\deploy\deploy-all.ps1 -FrontendOnly
```

Every push to `main` on `coninter-main` also triggers a Vercel production deploy when Git is connected.

---

## Flow

```text
deploy-all.ps1
 ├─ deploy-backend.ps1
 │   ├─ scp remote-backend-update.sh
 │   ├─ git pull  OR  rsync python_backend/
 │   ├─ pip install + optional migrations
 │   └─ systemctl restart conni
 └─ deploy-frontend.ps1
     ├─ (optional) npm run build → dist/  (sanity check)
     └─ vercel deploy --prod   OR   git push coninter → main
```

---

## Retiring AWS Amplify

Amplify is **no longer used** for this project. After Vercel is verified:

1. In [AWS Amplify Console](https://ap-south-1.console.aws.amazon.com/amplify/), open the old Connitor app and **delete the app** (or disable auto-build) so traffic is not split.
2. Remove old `*.amplifyapp.com` URLs from EC2 `CORS_ALLOWED_ORIGINS` and `PUBLIC_FRONTEND_URL` once nothing points at them.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Vercel 404 on routes | Ensure `frontend/vercel.json` rewrites and **Root Directory** = `frontend` |
| `vercel deploy` not logged in | Run `npx vercel login` and `vercel link` |
| SSH Permission denied | Fix `EC2_SSH_KEY` / security group |
| CORS errors from Vercel | Add `https://coninter-main.vercel.app` to EC2 `CORS_ALLOWED_ORIGINS` |
| Frontend hits wrong API | Set `NEXT_PUBLIC_BACKEND_API_URL` in Vercel env and redeploy |
