if __name__ == '__main__':
    from app import create_app, db
    from app.models import User, Role

    app = create_app()
    with app.app_context():
        # Create all tables
        db.create_all()

        # Check if admin user exists
        admin = User.query.filter_by(role=Role.ADMIN).first()
        if not admin:
            # Create admin user
            admin = User(
                username='admin',
                email='admin@example.com',
                role=Role.ADMIN,
                is_active=True
            )
            admin.set_password('Admin@123')
            db.session.add(admin)
            db.session.commit()
            print('Admin user created successfully!')
        
        print('Database initialized successfully!')
