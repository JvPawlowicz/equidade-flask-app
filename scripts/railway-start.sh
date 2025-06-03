#!/bin/bash

# Script de inicialização para deploy Python/Flask no Railway

set -e

echo "🚀 Iniciando deploy no Railway..."

# Ativar ambiente virtual
echo "📦 Ativando ambiente virtual..."
. /opt/venv/bin/activate

# Verificar variáveis de ambiente
echo "🔍 Verificando variáveis de ambiente..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL não está definida"
    exit 1
fi

if [ -z "$SECRET_KEY" ]; then
    echo "⚠️ WARNING: SECRET_KEY não definida, usando valor padrão"
    export SECRET_KEY="dev-key-change-this"
fi

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p instance uploads/documents uploads/profiles logs

# Aguardar banco de dados (se for PostgreSQL)
if [[ $DATABASE_URL == postgresql* ]]; then
    echo "⏳ Aguardando banco de dados..."
    for i in {1..30}; do
        python -c "from sqlalchemy import create_engine; create_engine('$DATABASE_URL').connect()" && break
        echo "Tentativa $i/30"
        sleep 1
    done
fi

# Aplicar migrações do banco de dados
echo "🔄 Aplicando migrações..."
flask db upgrade || true

# Inicializar banco de dados se necessário
if [ -f "app/seed_admin.py" ]; then
    echo "🌱 Criando usuário admin padrão..."
    python app/seed_admin.py || true
fi

# Iniciar Gunicorn
echo "🚀 Iniciando servidor..."
exec gunicorn --workers=2 --threads=4 --timeout=0 --access-logfile=- --error-logfile=- --bind=0.0.0.0:$PORT run:app