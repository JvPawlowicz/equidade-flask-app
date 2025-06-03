from flask import Blueprint, jsonify
from app import db

health = Blueprint('health', __name__)

@health.route('/health')
def healthcheck():
    try:
        # Verifica conexão com banco de dados
        db.session.execute('SELECT 1')
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'version': '1.0.0'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
