from flask import Blueprint, render_template, redirect, url_for, flash, request, session, abort
from flask_login import login_required, current_user
import pyotp, qrcode, io, base64
from ..models import db

security = Blueprint('security', __name__)

@security.route('/enable-2fa', methods=['GET', 'POST'])
@login_required
def enable_2fa():
    if not current_user.is_admin():
        abort(403)
    
    if request.method == 'POST':
        code = request.form.get('code')
        if current_user.verify_2fa_code(code):
            current_user.two_factor_enabled = True
            backup_codes = current_user.generate_backup_codes()
            db.session.commit()
            return render_template('security/backup_codes.html', codes=backup_codes)
        else:
            flash('Código inválido', 'danger')
    
    # Gera QR Code para o autenticador
    if not current_user.two_factor_secret:
        current_user.generate_2fa_secret()
        db.session.commit()
    
    totp = pyotp.TOTP(current_user.two_factor_secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name='Equidade')
    
    qr = qrcode.make(uri)
    buffered = io.BytesIO()
    qr.save(buffered)
    qr_img = base64.b64encode(buffered.getvalue()).decode('ascii')
    
    return render_template('security/enable_2fa.html', qr_img=qr_img, secret=current_user.two_factor_secret)