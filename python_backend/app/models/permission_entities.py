"""Fine-grained permissions for delivery and attendant modules."""

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Permission(Base):
    __tablename__ = "Permission"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    module: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class RolePermission(Base):
    __tablename__ = "RolePermission"
    __table_args__ = (UniqueConstraint("role", "permissionCode", name="RolePermission_role_code_key"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), index=True)
    permissionCode: Mapped[str] = mapped_column(String(64), index=True)
