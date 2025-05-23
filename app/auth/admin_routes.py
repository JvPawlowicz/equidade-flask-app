from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from ..models import InviteToken, db, Role
from .decorators import role_required

admin = Blueprint('admin', __name__, url_prefix='/admin')

@admin.route('/invites')
@login_required
@role_required(Role.ADMIN)
def list_invites():
    invites = InviteToken.query.order_by(InviteToken.created_at.desc()).all()
    return render_template('admin/invites.html', invites=invites)

@admin.route('/invites/new', methods=['POST'])
@login_required
@role_required(Role.ADMIN)
def create_invite():
    token = InviteToken()
    token.token = InviteToken.generate_token()
    token.created_by = current_user.id
    
    db.session.add(token)
    db.session.commit()
    
    flash(f'Convite gerado: {token.token}', 'success')
    return redirect(url_for('admin.list_invites'))