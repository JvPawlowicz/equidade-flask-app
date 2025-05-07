#!/bin/bash

# Script para preparar a aplicação Equidade Clínica para implantação no cPanel
# Este script prepara os arquivos, compacta-os e os deixa prontos para upload

# Cores para output
VERDE='\033[0;32m'
AMARELO='\033[1;33m'
VERMELHO='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${VERDE}Iniciando preparação da aplicação Equidade Clínica para implantação no cPanel...${NC}"

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo -e "${VERMELHO}Erro: Este script deve ser executado na raiz do projeto${NC}"
    exit 1
fi

# Criar pasta temporária para implantação
echo -e "${AMARELO}Criando diretório temporário para implantação...${NC}"
rm -rf ./deploy
mkdir -p ./deploy/equidade-clinica

# Copiar arquivos necessários
echo -e "${AMARELO}Copiando arquivos do projeto...${NC}"
cp -r ./server ./db ./shared ./client/public ./package.json ./package-lock.json ./tsconfig.json ./deploy/equidade-clinica/

# Criar arquivo .env de exemplo
echo -e "${AMARELO}Criando arquivo .env de exemplo...${NC}"
cat > ./deploy/equidade-clinica/.env.example << EOL
# Configurações do ambiente
NODE_ENV=production
PORT=3000

# Configurações do banco de dados PostgreSQL
DATABASE_URL=postgres://usuario:senha@hostname:5432/equidade_clinica

# Segurança da sessão - Gere um segredo forte (comando: openssl rand -hex 32)
SESSION_SECRET=seu_segredo_muito_seguro_aqui

# Configurações do servidor
WEBSITE_URL=https://seu-dominio.com
EOL

# Criar diretório uploads
echo -e "${AMARELO}Criando diretório uploads...${NC}"
mkdir -p ./deploy/equidade-clinica/uploads
chmod 755 ./deploy/equidade-clinica/uploads

# Criar README.md com instruções
echo -e "${AMARELO}Criando README com instruções de implantação...${NC}"
cat > ./deploy/equidade-clinica/README.md << EOL
# Equidade Clínica - Sistema de Gerenciamento

## Instruções para Implantação

1. Descompacte este arquivo no diretório desejado no seu servidor cPanel
2. Renomeie o arquivo .env.example para .env e configure-o com suas credenciais
3. No terminal do cPanel, navegue até o diretório do projeto e execute:
   \`\`\`
   npm install --production
   npm run db:push
   npm run db:seed
   \`\`\`
4. Configure a aplicação Node.js no cPanel conforme as instruções no Manual de Instalação

Para instruções detalhadas, consulte o arquivo instalacao_cpanel.md incluído neste pacote.

## Credenciais Padrão

- Administrador: admin / admin123
- Coordenador: coordenador / coord123
- Outros perfis estão listados no manual de instalação

*IMPORTANTE: Altere todas as senhas após o primeiro login!*
EOL

# Copiar manual de instalação
echo -e "${AMARELO}Copiando manual de instalação...${NC}"
cp ./docs/instalacao_cpanel.md ./deploy/equidade-clinica/

# Criar arquivo para armazenar as credenciais
echo -e "${AMARELO}Criando arquivo de credenciais padrão...${NC}"
cat > ./deploy/equidade-clinica/credenciais_padrao.md << EOL
# Credenciais Padrão do Sistema Equidade Clínica

Este arquivo contém as credenciais padrão para acesso ao sistema. Por segurança, exclua este arquivo após a implantação e altere todas as senhas.

| Perfil de Acesso | Usuário | Senha |
|------------------|---------|-------|
| Administrador | admin | admin123 |
| Coordenador | coordenador | coord123 |
| Profissional (Psicólogo) | amanda | amanda123 |
| Profissional (Fisioterapeuta) | carlos | carlos123 |
| Profissional (Fonoaudiólogo) | juliana | juliana123 |
| Estagiário | estagiario | estagiario123 |
| Secretário(a) | secretaria | secretaria123 |

**ATENÇÃO**: Este arquivo contém informações sensíveis. Após a implantação e a criação de contas de usuários personalizadas, exclua este arquivo do servidor e altere todas as senhas padrão.
EOL

# Compactar tudo em um arquivo zip
echo -e "${AMARELO}Compactando arquivos para distribuição...${NC}"
cd ./deploy
zip -r equidade-clinica.zip equidade-clinica/
cd ..

echo -e "${VERDE}Preparação concluída!${NC}"
echo -e "O arquivo para implantação está disponível em: ${AMARELO}./deploy/equidade-clinica.zip${NC}"
echo -e "Instruções detalhadas para implantação estão no arquivo: ${AMARELO}./docs/instalacao_cpanel.md${NC}"