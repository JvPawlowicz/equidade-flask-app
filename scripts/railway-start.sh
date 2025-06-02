#!/bin/bash

# Script de inicialização para deploy Python/Flask no Railway

set -e

echo "🚀 Preparando inicialização no Railway..."

# Verificar se o ambiente de produção está configurado
if [ "$NODE_ENV" != "production" ]; then
  export NODE_ENV="production"
  echo "⚠️ NODE_ENV não definido, configurando para 'production'"
fi

# Verificar se a variável DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERRO: DATABASE_URL não está definida"
  exit 1
fi

# Verificar se a variável SESSION_SECRET está definida
if [ -z "$SESSION_SECRET" ]; then
  echo "❌ ERRO: SESSION_SECRET não está definida"
  exit 1
fi

# Criar diretório de uploads se não existir
if [ ! -d "uploads" ]; then
  echo "📁 Criando diretório de uploads..."
  mkdir -p uploads
fi

# Verificar e atualizar esquema do banco de dados
echo "📊 Verificando banco de dados..."
DB_STATUS=$(npx drizzle-kit check:pg --config=./drizzle.production.config.ts 2>&1)

if [[ $DB_STATUS == *"ERROR"* ]] || [[ $DB_STATUS == *"migrations"* ]]; then
  echo "⚠️ Esquema do banco de dados precisa ser atualizado"
  echo "🔄 Aplicando alterações..."
  npx drizzle-kit push --force --config=./drizzle.production.config.ts

  # Verificar se o banco de dados está vazio
  if [[ $DB_STATUS == *"tables created"* ]] || [ "$FORCE_SEED" = "true" ]; then
    echo "🌱 Populando banco de dados..."
    NODE_ENV=production tsx db/seed.ts
  fi
else
  echo "✅ Banco de dados OK - Nenhuma alteração necessária"
fi

# Inicializa banco de dados se necessário
if [ -f "app/seed_admin.py" ]; then
  echo "🌱 Rodando seed_admin.py para criar admin padrão (ignora erro se já existir)"
  python app/seed_admin.py || true
fi

# Inicia o servidor Flask com Gunicorn
exec gunicorn run:app