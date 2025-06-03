#!/bin/bash
# Comandos para implantação do sistema Equidade Clínica em ambiente de produção

# ========================================
# Configuração de variáveis
# ========================================
# Altere estes valores conforme sua configuração
DOMINIO="equidadeclinica.com.br"
DIRETORIO="/home/usuario/public_html/$DOMINIO"
DB_NAME="equidade_clinica"
DB_USER="equidade_user"
DB_PASS="senha_segura_aqui"
DB_HOST="localhost"
PORTA_NODE=3000

# ========================================
# 1. Preparação do ambiente
# ========================================
echo "Iniciando instalação do Equidade Clínica..."
echo "Criando diretório de instalação..."
mkdir -p $DIRETORIO
cd $DIRETORIO

# ========================================
# 2. Atualização do código-fonte
# ========================================
echo "Atualizando código-fonte..."
git pull origin main

# ========================================
# 3. Instalação de dependências Python
# ========================================
echo "Instalando dependências..."
source venv/bin/activate || python -m venv venv
pip install -r requirements.txt

# ========================================
# 4. Configuração do banco de dados
# ========================================
echo "Configurando banco de dados..."

# Executar a criação do esquema (usando drizzle-kit)
echo "Criando esquema do banco de dados..."
npm run db:push

# Executar a população de dados iniciais
echo "Populando banco de dados com dados iniciais..."
npm run db:seed

# ========================================
# 5. Configuração do serviço Node.js
# ========================================
echo "Configurando serviço Node.js..."

# Criar script de serviço PM2 (gerenciador de processos Node)
# Se PM2 for usado para gerenciar o processo
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "equidade-clinica",
    script: "server/index.js",
    env: {
      NODE_ENV: "production",
      PORT: $PORTA_NODE
    },
    instances: 1,
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "500M",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    combine_logs: true
  }]
}
EOL

# ========================================
# 6. Configuração do diretório de uploads
# ========================================
echo "Configurando diretório de uploads..."
mkdir -p uploads
chmod 755 uploads

# ========================================
# 7. Configuração de proxy reverso
# ========================================
echo "Configurando proxy reverso..."

# Para Apache (.htaccess)
cat > .htaccess << EOL
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteRule ^(.*)$ http://localhost:$PORTA_NODE/\$1 [P,L]
</IfModule>
EOL

# ========================================
# 8. Iniciar aplicação
# ========================================
echo "Iniciando aplicação..."

# Usando PM2
echo "Iniciando serviço com PM2..."
pm2 start ecosystem.config.js

# ========================================
# 9. Configuração de inicialização automática
# ========================================
echo "Configurando inicialização automática..."
pm2 save
pm2 startup

# Reiniciar Gunicorn (se necessário)
echo "Reiniciando Gunicorn..."
sudo systemctl restart gunicorn

# Verificar status
echo "Verificando status da aplicação..."
curl http://localhost:5000/health

echo ""
echo "=============================================================="
echo "Instalação do Equidade Clínica concluída com sucesso!"
echo "Acesse: https://$DOMINIO"
echo ""
echo "Credenciais padrão:"
echo "Usuário: admin"
echo "Senha: admin123"
echo ""
echo "IMPORTANTE: Altere a senha administrativa após o primeiro login!"
echo "=============================================================="