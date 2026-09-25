# Deploy scripts (Windows)

1. `Copy-Item config.example.env config.env` and edit.
2. Run:

```powershell
.\scripts\deploy\deploy-all.ps1
# or
.\scripts\deploy\deploy-backend.ps1
.\scripts\deploy\deploy-frontend.ps1
```

Full guide: [`docs/knowledge/deployment/DEPLOY-AUTOMATION.md`](../../docs/knowledge/deployment/DEPLOY-AUTOMATION.md)
