from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, EmailField, SelectField, TextAreaField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError, Optional
from ..models import User

class LoginForm(FlaskForm):
    email = EmailField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Senha', validators=[DataRequired()])
    remember = BooleanField('Lembrar-me')
    submit = SubmitField('Entrar')

class RegistrationForm(FlaskForm):
    username = StringField('Nome de usuário', validators=[DataRequired(), Length(min=3, max=50)])
    email = EmailField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Senha', validators=[DataRequired(), Length(min=6)])
    password2 = PasswordField('Confirmar senha', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Cadastrar')

    def validate_username(self, field):
        if User.query.filter_by(username=field.data).first():
            raise ValidationError('Este nome de usuário já está em uso.')

    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError('Este email já está cadastrado.')

class ProfileUpdateForm(FlaskForm):
    username = StringField('Nome de usuário', validators=[DataRequired(), Length(min=3, max=50)])
    email = EmailField('Email', validators=[DataRequired(), Email()])
    full_name = StringField('Nome completo', validators=[Optional(), Length(max=100)])
    bio = TextAreaField('Biografia', validators=[Optional(), Length(max=500)])
    submit = SubmitField('Atualizar Perfil')

    def __init__(self, original_username, original_email, *args, **kwargs):
        super(ProfileUpdateForm, self).__init__(*args, **kwargs)
        self.original_username = original_username
        self.original_email = original_email

    def validate_username(self, field):
        if field.data != self.original_username:
            if User.query.filter_by(username=field.data).first():
                raise ValidationError('Este nome de usuário já está em uso.')

    def validate_email(self, field):
        if field.data != self.original_email:
            if User.query.filter_by(email=field.data).first():
                raise ValidationError('Este email já está cadastrado.')

class PasswordResetRequestForm(FlaskForm):
    email = EmailField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Solicitar redefinição de senha')

class PasswordResetForm(FlaskForm):
    password = PasswordField('Nova senha', validators=[DataRequired(), Length(min=6)])
    password2 = PasswordField('Confirmar nova senha', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Redefinir senha')

class TwoFactorSetupForm(FlaskForm):
    code = StringField('Código de verificação', validators=[DataRequired(), Length(min=6, max=6)])
    submit = SubmitField('Verificar')

class AdminUserCreateForm(FlaskForm):
    username = StringField('Nome de usuário', validators=[DataRequired(), Length(min=3, max=50)])
    email = EmailField('Email', validators=[DataRequired(), Email()])
    role = SelectField('Perfil', choices=[
        ('user', 'Usuário'),
        ('admin', 'Administrador'),
        ('manager', 'Gerente')
    ], validators=[DataRequired()])
    password = PasswordField('Senha', validators=[DataRequired(), Length(min=6)])
    submit = SubmitField('Criar Usuário')

    def validate_username(self, field):
        if User.query.filter_by(username=field.data).first():
            raise ValidationError('Este nome de usuário já está em uso.')

    def validate_email(self, field):
        if User.query.filter_by(email=field.data).first():
            raise ValidationError('Este email já está cadastrado.')

class InviteUserForm(FlaskForm):
    email = EmailField('Email', validators=[DataRequired(), Email()])
    role = SelectField('Perfil', choices=[
        ('user', 'Usuário'),
        ('admin', 'Administrador'),
        ('manager', 'Gerente')
    ], validators=[DataRequired()])
    submit = SubmitField('Enviar Convite')
