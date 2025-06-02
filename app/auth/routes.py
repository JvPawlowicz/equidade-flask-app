"""
Rotas de autenticação e registro de usuários do sistema Equidade.
Inclui login, logout, registro e recuperação de senha.
"""

from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from werkzeug.security import check_password_hash
from flask_login import login_user, logout_user, current_user, login_required
from .forms import LoginForm, RegistrationForm
from ..models import User, Role
from .. import db
from .decorators import role_required
from datetime import datetime
from .admin_routes import InviteToken

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    """Rota para login de usuários."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        
        if user and user.check_password(form.password.data):
            if not user.is_active:
                flash('Conta desativada. Contate o administrador.', 'danger')
                return redirect(url_for('auth.login'))
                
            if user.is_admin() and user.two_factor_enabled:
                session['2fa_user_id'] = user.id
                session['2fa_remember'] = form.remember.data
                return redirect(url_for('security.verify_2fa'))
            
            next_page = request.args.get('next')
            if not next_page or not next_page.startswith('/'):
                next_page = url_for('main.dashboard')
                
            login_user(user, remember=form.remember.data)
            return redirect(next_page)
        else:
            flash('Email ou senha incorretos', 'danger')
    
    return render_template('auth/login.html', form=form)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    """Rota para registro de novos usuários."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
        
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data
        )
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        
        flash('Cadastro realizado com sucesso! Você já pode fazer login.', 'success')
        return redirect(url_for('auth.login'))
        
    return render_template('auth/register.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    """Rota para logout de usuários."""
    logout_user()
    flash('Você foi desconectado com sucesso.', 'info')
    return redirect(url_for('auth.login'))

@auth.route('/admin/dashboard')
@login_required
@role_required(Role.ADMIN)
def admin_dashboard():
    """Rota para o painel do administrador."""
    return render_template('admin/dashboard.html')

@auth.route('/perfil')
@login_required
def perfil():
    """Rota para o perfil do usuário."""
    return render_template('perfil.html', user=current_user)

@auth.route('/admin/users', methods=['GET', 'POST'])
@login_required
@role_required(Role.ADMIN)
def admin_users():
    """Rota para gerenciamento de usuários pelo administrador."""
    page = request.args.get('page', 1, type=int)
    role_filter = request.args.get('role')
    status_filter = request.args.get('status')
    
    query = User.query
    
    if role_filter:
        query = query.filter_by(role=Role(role_filter))
    if status_filter:
        query = query.filter_by(is_active=(status_filter == 'active'))
    
    users = query.paginate(page=page, per_page=10, error_out=False)
    
    if request.method == 'POST' and 'user_id' in request.form:
        # Lógica para atualizar roles com proteção CSRF
        pass
    
    return render_template('admin/users.html', users=users)


@auth.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    """Rota para cadastro de usuários via convite."""
    token_value = request.args.get('token')
    token = None
    
    if token_value:
        token = InviteToken.query.filter_by(token=token_value, is_used=False).first()
        if token and token.expires_at < datetime.utcnow():
            flash('Este convite expirou', 'danger')
            token = None
    
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(email=form.email.data)
        user.set_password(form.password.data)
        
        if token:
            user.role = Role.ADMIN
            token.is_used = True
            token.used_by = user.id
            token.used_at = datetime.utcnow()
            
        db.session.add(user)
        db.session.commit()
        
        flash('Cadastro realizado com sucesso!', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('cadastro.html', form=form, token=token)