from sqlalchemy.orm import Session

from app.models import Visit, Visitor


class VisitorSearchService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def search_visitors(self, phone: str, branch_id: str) -> dict:
        visitor = self.db.query(Visitor).filter(Visitor.phone == phone, Visitor.branchId == branch_id).first()
        if not visitor:
            return {"found": False}

        last_visit = (
            self.db.query(Visit)
            .filter(Visit.visitorId == visitor.id, Visit.branchId == branch_id)
            .order_by(Visit.createdAt.desc())
            .first()
        )
        return {
            "found": True,
            "visitor": {
                "id": visitor.id,
                "firstName": visitor.firstName,
                "lastName": visitor.lastName,
                "phone": visitor.phone,
                "email": visitor.email,
                "photo": visitor.photo,
                "company": visitor.company,
                "designation": visitor.designation,
                "lastVisit": {
                    "visitDate": last_visit.createdAt.isoformat(),
                    "status": last_visit.status,
                }
                if last_visit
                else None,
            },
        }
