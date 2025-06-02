import pytest
from app import create_app

def test_app_exists():
    app = create_app()
    assert app is not None
    assert app.config['SECRET_KEY']

def test_home_route():
    app = create_app()
    client = app.test_client()
    response = client.get('/')
    assert response.status_code in (200, 302)  # 302 se redirecionar para login
