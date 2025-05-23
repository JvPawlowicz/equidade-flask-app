from flask_wtf.csrf import CSRFProtect
from decouple import config
from flask import Flask
from flask_talisman import Talisman

csrf = CSRFProtect()

def init_app(app: Flask):
    # Configurações básicas
    app.config['SECRET_KEY'] = config('SECRET_KEY')
    app.config['WTF_CSRF_SECRET_KEY'] = config('CSRF_SECRET')
    app.config['WTF_CSRF_TIME_LIMIT'] = 3600
    
    # Proteção CSRF
    csrf.init_app(app)
    
    # Headers de segurança HTTP
    Talisman(
        app,
        force_https=True,
        strict_transport_security=True,
        session_cookie_secure=True,
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self'",
            'style-src': "'self'",
            'img-src': "'self' data:"
        }
    )