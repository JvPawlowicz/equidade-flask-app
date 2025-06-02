from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from .models import User
from . import db
from werkzeug.security import generate_password_hash, check_password_hash

main = Blueprint('main', __name__)

@main.route('/')
def index():
    """
    Rota principal do sistema. Exibe a página inicial.
    """
    return render_template('index.html')

@main.route('/dashboard')
@login_required
def dashboard():
    """
    Rota do dashboard. Requer autenticação.
    Exibe o painel principal do usuário logado.
    """
    return render_template('dashboard.html')

@main.route('/logout')
@login_required
def logout():
    """
    Rota de logout. Encerra a sessão do usuário logado.
    """
    logout_user()
    flash('Você foi desconectado com sucesso!', 'success')
    return redirect(url_for('main.index'))
