"""Quick MySQL connectivity check for python_backend."""
import re
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import get_settings  # noqa: E402


def mask_url(url: str) -> str:
    return re.sub(r":([^:@/]+)@", ":****@", url)


def prisma_to_sqlalchemy(url: str) -> str:
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+pymysql://", 1)
    return url


def try_connect(label: str, url: str) -> bool:
    print(f"\n--- {label} ---")
    print("URL:", mask_url(url))
    engine = create_engine(url, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT VERSION()")).scalar()
            db = conn.execute(text("SELECT DATABASE()")).scalar()
            tables = conn.execute(text("SHOW TABLES")).fetchall()
        print("Status: CONNECTED")
        print("MySQL version:", version)
        print("Current database:", db)
        print("Table count:", len(tables))
        return True
    except Exception as exc:
        print("Status: FAILED")
        print("Error:", type(exc).__name__, exc)
        return False


def main() -> None:
    settings = get_settings()
    python_env = ROOT / ".env"
    backend_env = ROOT.parent / "backend" / ".env"

    print("python_backend/.env exists:", python_env.exists())
    print("backend/.env exists:", backend_env.exists())

    ok = try_connect("python_backend config (app.config)", settings.database_url)

    if backend_env.exists():
        for line in backend_env.read_text(encoding="utf-8").splitlines():
            if line.startswith("DATABASE_URL="):
                raw = line.split("=", 1)[1].strip().strip('"').strip("'")
                ok_backend = try_connect("backend/.env (converted for PyMySQL)", prisma_to_sqlalchemy(raw))
                if ok_backend and not python_env.exists():
                    print("\nTip: Copy DATABASE_URL to python_backend/.env and use mysql+pymysql:// prefix:")
                    print("  DATABASE_URL=mysql+pymysql://user:pass@host:port/hvts")
                break

    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
