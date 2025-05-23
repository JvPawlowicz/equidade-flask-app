from enum import Enum
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from datetime import datetime, timedelta
from . import db
import pyotp

class Role(Enum):
    USER = 'user'
    ADMIN = 'admin'

from . import db
from flask_login import UserMixin

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
    name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.Enum(Role), default=Role.USER, nullable=False)
    two_factor_secret = db.Column(db.String(255))
    two_factor_enabled = db.Column(db.Boolean, default=False)
    backup_codes = db.Column(db.Text)  # JSON array criptografado

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def is_admin(self):
        return self.role == Role.ADMIN
    
    def __repr__(self):
        return f'<User {self.username}>'


class UserActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(200), nullable=False)
    target_user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship('User', foreign_keys=[admin_id])
    target_user = db.relationship('User', foreign_keys=[target_user_id])


class InviteToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))
    is_used = db.Column(db.Boolean, default=False)
    used_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    used_at = db.Column(db.DateTime)

    creator = db.relationship('User', foreign_keys=[created_by])
    user = db.relationship('User', foreign_keys=[used_by])

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(32)

    def generate_2fa_secret(self):
        self.two_factor_secret = pyotp.random_base32()
        return self.two_factor_secret

    def verify_2fa_code(self, code):
        totp = pyotp.TOTP(self.two_factor_secret)
        return totp.verify(code)

    def generate_backup_codes(self):
        codes = [secrets.token_hex(4) for _ in range(10)]
        self.backup_codes = generate_password_hash(json.dumps(codes))
        return codes
