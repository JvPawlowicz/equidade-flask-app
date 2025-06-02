"""
Comandos utilitários customizados para o sistema Equidade.
Inclui comandos de manutenção, backup, restore, etc.
"""

import click
from flask.cli import with_appcontext
from . import db

def init_db():
    """Inicializa o banco de dados criando todas as tabelas."""
    from . import create_app
    app = create_app()
    with app.app_context():
        db.create_all()

@click.command('init-db')
def init_db_command():
    """Comando para criar as tabelas do banco de dados."""
    init_db()
    click.echo('Initialized the database.')
