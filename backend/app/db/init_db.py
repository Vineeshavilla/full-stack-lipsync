from sqlalchemy.orm import Session
from app.db.base import Base, engine
from app.models.user import User
from app.models.project import Project
from app.core.security import get_password_hash

def init_db(db: Session) -> None:
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create initial admin user if it doesn't exist
    admin = db.query(User).filter(User.email == "admin@example.com").first()
    if not admin:
        admin = User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Created admin user")
    else:
        print("Admin user already exists") 