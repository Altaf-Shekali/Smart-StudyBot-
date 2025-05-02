from db import Base, engine
from models import User

# Create the database tables
Base.metadata.create_all(bind=engine)
print("✅ Tables created successfully.")
