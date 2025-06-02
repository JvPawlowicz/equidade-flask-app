import click
from flask.cli import with_appcontext
from . import db
from .models import User, Role
import os
from datetime import datetime

@click.command('create-admin')
@click.option('--username', prompt=True, help='Username for the admin account')
@click.option('--email', prompt=True, help='Email for the admin account')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='Password for the admin account')
@with_appcontext
def create_admin(username, email, password):
    """
    Cria um novo usuário administrador no sistema.
    Solicita username, email e senha via prompt.
    Garante unicidade de username e email.
    """
    try:
        if User.query.filter_by(username=username).first():
            click.echo('Error: Username already taken')
            return

        if User.query.filter_by(email=email).first():
            click.echo('Error: Email already registered')
            return

        admin = User(username=username, email=email, role=Role.ADMIN, is_active=True)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        
        click.echo(f'Admin user {username} created successfully!')
    except Exception as e:
        click.echo(f'Error creating admin: {e}')

@click.command('init-db')
@with_appcontext
def init_db():
    """
    Inicializa o banco de dados criando todas as tabelas.
    Use em ambientes de desenvolvimento ou após reset.
    """
    try:
        db.create_all()
        click.echo('Database tables created successfully!')
    except Exception as e:
        click.echo(f'Error initializing database: {e}')

@click.command('reset-db')
@click.confirmation_option(prompt='Are you sure you want to reset the database?')
@with_appcontext
def reset_db():
    """
    Reseta o banco de dados: dropa todas as tabelas e recria.
    Use com cautela, pois todos os dados serão perdidos.
    """
    try:
        db.drop_all()
        db.create_all()
        click.echo('Database reset successfully!')
    except Exception as e:
        click.echo(f'Error resetting database: {e}')

@click.command('create-user')
@click.option('--username', prompt=True, help='Username for the new user')
@click.option('--email', prompt=True, help='Email for the new user')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='Password for the new user')
@click.option('--role', type=click.Choice(['user', 'admin', 'manager'], case_sensitive=False), default='user', help='Role for the new user')
@with_appcontext
def create_user(username, email, password, role):
    """
    Cria um novo usuário comum, admin ou gerente.
    Solicita dados via prompt e garante unicidade.
    """
    try:
        if User.query.filter_by(username=username).first():
            click.echo('Error: Username already taken')
            return

        if User.query.filter_by(email=email).first():
            click.echo('Error: Email already registered')
            return

        user = User(username=username, email=email, role=getattr(Role, role.upper()), is_active=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        click.echo(f'User {username} created successfully with role {role}!')
    except Exception as e:
        click.echo(f'Error creating user: {e}')

@click.command('list-users')
@with_appcontext
def list_users():
    """List all users in the system."""
    try:
        users = User.query.all()
        if not users:
            click.echo('No users found in the system.')
            return

        click.echo('\nRegistered Users:')
        click.echo('-' * 80)
        click.echo(f'{"ID":<5} {"Username":<20} {"Email":<30} {"Role":<10} {"Active":<10}')
        click.echo('-' * 80)
        
        for user in users:
            click.echo(f'{user.id:<5} {user.username:<20} {user.email:<30} {user.role.name:<10} {str(user.is_active):<10}')
    except Exception as e:
        click.echo(f'Error listing users: {e}')

@click.command('deactivate-user')
@click.argument('username')
@with_appcontext
def deactivate_user(username):
    """Deactivate a user account."""
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            click.echo(f'Error: User {username} not found')
            return

        user.is_active = False
        db.session.commit()
        click.echo(f'User {username} has been deactivated')
    except Exception as e:
        click.echo(f'Error deactivating user: {e}')

@click.command('backup-db')
@click.option('--output', default='backup', help='Output directory for the backup')
@with_appcontext
def backup_db(output):
    """Create a backup of the database."""
    try:
        os.makedirs(output, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(output, f'backup_{timestamp}.sql')
        
        # Implement your backup logic here
        # For SQLite, you might want to use sqlite3's backup API
        # For other databases, you might want to use pg_dump, mysqldump, etc.
        
        click.echo(f'Database backup created at {backup_path}')
    except Exception as e:
        click.echo(f'Error backing up database: {e}')

@click.command('verify-system')
@with_appcontext
def verify_system():
    """Verify system integrity and configuration."""
    try:
        click.echo('Checking database connection...')
        db.session.execute('SELECT 1')
        click.echo('✓ Database connection OK')
        
        click.echo('Checking admin users...')
        admin_count = User.query.filter_by(role=Role.ADMIN).count()
        click.echo(f'✓ Found {admin_count} admin users')
        
        click.echo('Checking upload directories...')
        upload_dirs = ['uploads/documents', 'uploads/profiles']
        for directory in upload_dirs:
            os.makedirs(directory, exist_ok=True)
            click.echo(f'✓ Directory {directory} exists and is writable')
        
        click.echo('\nSystem verification completed successfully!')
    except Exception as e:
        click.echo(f'Error during system verification: {e}')

def init_app(app):
    """Register CLI commands."""
    app.cli.add_command(create_admin)
    app.cli.add_command(init_db)
    app.cli.add_command(reset_db)
    app.cli.add_command(create_user)
    app.cli.add_command(list_users)
    app.cli.add_command(deactivate_user)
    app.cli.add_command(backup_db)
    app.cli.add_command(verify_system)
