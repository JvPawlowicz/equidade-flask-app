from app import create_app
from app.commands import init_db_command

app = create_app()
app.cli.add_command(init_db_command)

if __name__ == '__main__':
    app.run(debug=True)
