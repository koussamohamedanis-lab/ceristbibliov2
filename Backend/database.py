import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 1. Charger les variables d'environnement du fichier .env
load_dotenv()

# 2. Récupérer l'URL de connexion
# Elle doit être : postgresql://postgres:anis@localhost:8888/ceristbiblio
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Sécurité au cas où le .env n'est pas trouvé
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("ERREUR : L'URL de la base de données n'a pas été trouvée. Vérifie ton fichier .env")

# 3. Créer le moteur SQLAlchemy
# On ajoute echo=True pour voir les requêtes SQL dans la console (très utile pour ton PFE)
engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)

# 4. Créer la fabrique de sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Base pour les modèles (User, Publication, etc.)
Base = declarative_base()

# 6. Fonction de dépendance (utilisée dans les routes FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()