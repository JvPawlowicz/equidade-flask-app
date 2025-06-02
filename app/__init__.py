"""
Inicialização da aplicação Flask Equidade.
Configura extensões, logging, blueprints e tratamento global de erros.
"""

from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from decouple import config
from dotenv import load_dotenv
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))
from app.utils.logging import setup_logging

# Extensões globais
csrf = CSRFProtect()
db = SQLAlchemy()
login_manager = LoginManager()


def create_app():
    """Cria e configura a aplicação Flask."""
    load_dotenv()
    app = Flask(__name__)
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    instance_path = os.path.join(base_dir, 'instance')

    # Configurações básicas
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'troque-esta-chave')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(instance_path, "equidade.db")}')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.config['ENV'] = os.environ.get('FLASK_ENV', 'production')
    if app.config['ENV'] == 'production':
        app.config['SESSION_COOKIE_SECURE'] = True
        app.config['REMEMBER_COOKIE_SECURE'] = True
        app.config['PREFERRED_URL_SCHEME'] = 'https'

    # Garantir que o diretório instance existe
    try:
        if not os.path.exists(instance_path):
            os.makedirs(instance_path)
            print(f"Created instance directory at {instance_path}")
    except OSError as e:
        print(f"Error creating instance directory: {e}")
        pass

    # Inicializar extensões
    db.init_app(app)
    csrf.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    # Segurança
    talisman = Talisman(app)
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["200 per day", "50 per hour"]
    )

    # Registrar blueprints
    from .routes import main
    from .auth.routes import auth
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')

    # Registrar comandos CLI
    from . import cli
    cli.init_app(app)

    # Configurar logging
    setup_logging(app)

    # Tratamento global de exceções
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Tratamento global de exceções."""
        app.logger.exception('Erro não tratado: %s', e)
        return render_template('errors/500.html', error=e), 500

    # Registrar handlers de erro
    @app.errorhandler(404)
    def not_found_error(error):
        """Handler para erro 404 - Página não encontrada."""
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handler para erro 500 - Erro interno do servidor."""
        db.session.rollback()
        return render_template('errors/500.html'), 500

    return app
