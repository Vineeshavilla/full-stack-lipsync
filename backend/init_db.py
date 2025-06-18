from app.db.database import engine
from app.models.user import Base as UserBase
from app.models.project import Base as ProjectBase

def init_database():
    print("Creating database tables...")
    UserBase.metadata.create_all(bind=engine)
    ProjectBase.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_database() 