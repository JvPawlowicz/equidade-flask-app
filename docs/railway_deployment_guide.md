# Guia de Implantação no Railway

## Introdução

Este guia fornece as instruções para implantar a aplicação Equidade no Railway, uma plataforma moderna de hospedagem que oferece simplicidade, escalabilidade e confiabilidade para aplicações web.

## Pré-requisitos

1. Conta no Railway (https://railway.app/)
2. Git instalado em sua máquina
3. Código-fonte da aplicação Equidade
4. Uma instância PostgreSQL para uso em produção

## Passos para Implantação

### 1. Preparação do Projeto

Antes de iniciar a implantação, certifique-se de que o projeto está pronto:

- Todas as variáveis de ambiente estão configuradas no arquivo `.env.example`
- O endpoint de healthcheck está implementado em `/api/health`
- Os scripts de construção e inicialização estão configurados no `package.json`
- O banco de dados PostgreSQL está atualizado com o esquema mais recente

### 2. Criação do Projeto no Railway

1. Faça login na plataforma Railway
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte sua conta GitHub e selecione o repositório da aplicação Equidade
5. Railway irá detectar automaticamente que é um projeto Node.js

### 3. Configuração do Banco de Dados

1. No painel do projeto, clique em "New"
2. Selecione "Database" e depois "PostgreSQL"
3. Aguarde a criação da instância do PostgreSQL
4. O Railway criará automaticamente uma variável de ambiente `DATABASE_URL` que será usada pela aplicação

### 4. Configuração das Variáveis de Ambiente

1. No painel do projeto, navegue até a seção "Variables"
2. Adicione as seguintes variáveis:
   - `NODE_ENV=production`
   - `PORT=5000` (o Railway atribuirá automaticamente a porta para você)
   - `SESSION_SECRET=um_segredo_muito_longo_e_aleatorio`
   - Quaisquer outras variáveis específicas da aplicação

### 5. Configuração de Construção e Implantação

1. Na seção "Settings" do seu projeto:
2. Verifique se o diretório raiz está configurado corretamente (normalmente "/")
3. Configure os comandos de construção e inicialização:
   - Build Command: `npm run build`
   - Start Command: `npm start`

### 6. Implantação

1. Após configurar tudo, o Railway iniciará automaticamente o processo de construção e implantação
2. Você pode acompanhar o progresso na seção "Deployments"
3. Quando o status mudar para "Success", sua aplicação estará online

### 7. Configuração de Domínio (Opcional)

1. Na seção "Settings", vá para "Custom Domain"
2. Adicione seu domínio personalizado (ex: equidade.com.br)
3. Siga as instruções para configurar os registros DNS com seu provedor de domínio
4. O Railway fornecerá um certificado SSL automaticamente

## Monitoramento e Logs

1. Acesse a seção "Metrics" para visualizar o desempenho da aplicação
2. Na seção "Logs", você pode visualizar os logs em tempo real da aplicação
3. A rota `/api/health` pode ser usada para verificar a saúde da aplicação

## Configuração de CI/CD

O Railway integra-se automaticamente com GitHub, permitindo implantações automáticas:

1. Cada push para a branch principal iniciará uma nova implantação
2. Você pode configurar implantações para branches diferentes (staging, development)
3. Configure as regras de implantação em "Settings" > "Deployments"

## Backup do Banco de Dados

O Railway oferece backups automatizados do banco de dados PostgreSQL:

1. Acesse a instância do PostgreSQL no painel do Railway
2. Na aba "Backups", você pode configurar a frequência dos backups
3. Para restaurar um backup, selecione-o e clique em "Restore"

## Escalonamento

Para escalonar sua aplicação:

1. Na seção "Settings" do seu serviço, vá para "Usage Limits"
2. Ajuste os limites de CPU, memória e largura de banda conforme necessário
3. O Railway escalará automaticamente dentro desses limites

## Resolução de Problemas

- **Falha na Implantação**: Verifique os logs na seção "Deployments" para identificar o problema
- **Problemas de Conexão com Banco de Dados**: Verifique se a variável `DATABASE_URL` está corretamente configurada
- **Erros 500**: Use a rota `/api/health` para verificar a saúde da aplicação e diagnóstico

## Migração dos Dados (de cPanel para Railway)

Para migrar seus dados do cPanel para o Railway:

1. No cPanel, exporte seu banco de dados PostgreSQL:
   ```bash
   pg_dump -h seu_host -U seu_usuario -d sua_base -F c -f backup.dump
   ```

2. Restaure no Railway usando o URL de conexão fornecido:
   ```bash
   pg_restore -d postgres://seu_url_railway backup.dump
   ```

## Suporte

Para obter suporte adicional:

- Documentação do Railway: https://docs.railway.app/
- Comunidade do Railway: https://community.railway.app/
- Suporte da Equidade: suporte@equidade.com.br

---

Última atualização: Maio 2025