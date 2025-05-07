# Manual de Instalação do Equidade Clínica no cPanel

Este documento fornece instruções detalhadas para implantar o sistema de gerenciamento Equidade Clínica em servidores que utilizam cPanel.

## Requisitos

- Acesso a uma conta cPanel
- Node.js versão 18 ou superior (recomendado: 20.x)
- PostgreSQL 14 ou superior
- Domínio ou subdomínio configurado
- Certificado SSL (recomendado para segurança)

## Estrutura de Arquivos para Upload

Organize os arquivos da seguinte forma antes de fazer upload para o cPanel:

```
equidade-clinica/
├── .env                  # Arquivo de configuração de ambiente (criar a partir do modelo)
├── package.json          # Dependências do projeto
├── db/                   # Scripts do banco de dados
│   ├── index.js          # Conexão com o banco de dados
│   └── seed.js           # Script para popular o banco com dados iniciais
├── public/               # Arquivos estáticos compilados
│   ├── index.html
│   ├── assets/
│   └── ...
├── server/               # Código do servidor
│   ├── index.js
│   ├── routes.js
│   ├── auth.js
│   └── ...
└── uploads/              # Diretório para armazenar uploads (certifique-se de que tenha permissões adequadas)
```

## Passos para Instalação

### 1. Preparação do Banco de Dados

1. No cPanel, acesse **Databases > MySQL Databases** ou **PostgreSQL Databases** (dependendo do seu servidor)
2. Crie um novo banco de dados chamado `equidade_clinica`
3. Crie um novo usuário para o banco de dados (ex: `equidade_user`)
4. Conceda permissões completas ao usuário para o banco criado
5. Anote o nome do banco, usuário e senha para uso posterior

### 2. Upload dos Arquivos

1. Acesse **File Manager** no cPanel
2. Navegue até o diretório `public_html` ou crie um subdiretório específico
3. Faça upload dos arquivos da aplicação usando a função de upload ou via FTP
4. Certifique-se de manter a estrutura de pastas intacta

### 3. Configuração do Ambiente

1. Crie ou edite o arquivo `.env` com as seguintes configurações:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://usuario:senha@hostname:5432/equidade_clinica
SESSION_SECRET=seu_segredo_muito_seguro_aqui
```

2. Substitua os valores pelos adequados à sua configuração de banco de dados
3. Certifique-se de usar um SESSION_SECRET forte e único para segurança

### 4. Instalação das Dependências

1. No cPanel, abra o **Terminal** ou use **SSH Access**
2. Navegue até a pasta de instalação:
   ```bash
   cd public_html/seu_diretorio
   ```
3. Instale as dependências:
   ```bash
   npm install --production
   ```

### 5. Configuração do Banco de Dados

1. Execute o script para criar as tabelas (a ferramenta Drizzle gerencia isso automaticamente):
   ```bash
   npm run db:push
   ```
2. Execute o script para popular o banco com dados iniciais:
   ```bash
   npm run db:seed
   ```

### 6. Configuração do Node.js Application

1. No cPanel, acesse **Setup Node.js App**
2. Configure um novo aplicativo Node.js com:
   - **Node.js version**: Selecione a versão 20.x
   - **Application mode**: Production
   - **Application root**: Caminho para sua aplicação (ex: `/home/usuario/public_html/seu_diretorio`)
   - **Application URL**: URL completa para acesso (ex: `https://seu_dominio.com`)
   - **Application startup file**: `server/index.js`
   - **Passenger log file**: mantenha o padrão ou defina um local específico

### 7. Configuração do Proxy Reverso (opcional)

Se você quiser usar o Apache como proxy reverso para o aplicativo Node.js:

1. Crie ou edite o arquivo `.htaccess` na raiz do seu diretório web:
   ```
   RewriteEngine On
   RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
   ```

2. Isso direcionará todo o tráfego para seu aplicativo Node.js rodando na porta 3000

### 8. Iniciando a Aplicação

1. No painel Setup Node.js App, clique em **Start Application**
2. Verifique os logs para garantir que a aplicação iniciou corretamente
3. Acesse o URL configurado para verificar se o aplicativo está funcionando

## Configurações Adicionais

### Certificado SSL

Para garantir a segurança das informações:

1. No cPanel, acesse **SSL/TLS Status**
2. Instale um certificado SSL para seu domínio ou use o Let's Encrypt
3. Certifique-se de que o site está configurado para forçar HTTPS

### Configuração de E-mail (opcional)

Se a aplicação usar envio de e-mails:

1. Configure as credenciais SMTP no arquivo `.env`:
   ```
   SMTP_HOST=seu_servidor_smtp
   SMTP_PORT=587
   SMTP_USER=seu_usuario
   SMTP_PASS=sua_senha
   SMTP_FROM=noreply@seu_dominio.com
   ```

### Backup Automático

Configure backups regulares:

1. No cPanel, acesse **Backup Wizard** ou **Backup**
2. Configure backups automáticos para o banco de dados e arquivos
3. Considere armazenar backups em um local externo para segurança adicional

## Resolução de Problemas

### Aplicação não inicia

1. Verifique os logs de erro no cPanel > Logs > Error Log
2. Certifique-se de que as variáveis de ambiente estão configuradas corretamente
3. Verifique se o Node.js está configurado e funcionando

### Problemas de Banco de Dados

1. Verifique se o usuário do banco tem permissões adequadas
2. Teste a conexão com o banco manualmente usando o terminal
3. Verifique os logs do aplicativo para erros específicos

### Erro 500 ou Página em Branco

1. Verifique os logs do Node.js
2. Certifique-se de que todos os arquivos foram carregados corretamente
3. Verifique permissões de arquivos, especialmente na pasta `uploads`

## Manutenção

### Atualizações do Sistema

Para atualizar a aplicação para uma nova versão:

1. Faça backup do banco de dados e arquivos
2. Faça upload dos novos arquivos, substituindo os antigos
3. Execute `npm install --production` para atualizar dependências
4. Execute `npm run db:push` para atualizar o esquema do banco de dados
5. Reinicie a aplicação

### Monitoramento

Monitore regularmente:

1. Uso de recursos do servidor (CPU, memória)
2. Espaço em disco, especialmente na pasta `uploads`
3. Logs de erro para identificar problemas potenciais

## Credenciais Padrão

Para o primeiro acesso:

| Perfil de Acesso | Usuário | Senha |
|------------------|---------|-------|
| Administrador | admin | admin123 |
| Coordenador | coordenador | coord123 |
| Profissional (Psicólogo) | amanda | amanda123 |
| Profissional (Fisioterapeuta) | carlos | carlos123 |
| Profissional (Fonoaudiólogo) | juliana | juliana123 |
| Estagiário | estagiario | estagiario123 |
| Secretário(a) | secretaria | secretaria123 |

**IMPORTANTE**: Altere as senhas imediatamente após o primeiro login!

## Suporte

Para suporte técnico adicional, entre em contato:

- E-mail: suporte@equidadeclinica.com.br
- Telefone: (11) XXXX-XXXX
- Horário: Segunda a Sexta, 9h às 18h

---

© 2025 Equidade Clínica - Todos os direitos reservados