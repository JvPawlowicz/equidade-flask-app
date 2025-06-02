"""
Script para criar um usuário administrador padrão no banco de dados.
Execute apenas em ambientes de desenvolvimento ou inicialização do sistema.
"""

import sys
import os

# Permitir rodar de qualquer lugar
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import User

app = create_app()

with app.app_context():
    # Verifica se o usuário admin já existe
    if not User.query.filter_by(username="admin").first():
        # Cria um novo usuário admin com senha padrão
        admin = User(username="admin", email="admin@admin.com")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()
        print("Usuário admin criado com sucesso!")
    else:
        print("Usuário admin já existe.")
