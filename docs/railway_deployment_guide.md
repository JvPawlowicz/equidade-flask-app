# Guia de Implantação no Railway

Este guia irá ajudá-lo a implantar o Sistema Equidade Clínica no Railway, uma plataforma moderna que simplifica o processo de implantação e gerenciamento de aplicações.

## Pré-requisitos

1. Uma conta no [Railway](https://railway.app/)
2. Seu código fonte no GitHub (recomendado para integração contínua)
3. Acesso a todos os arquivos do projeto

## Passo 1: Preparar seu projeto

Antes de implantar, certifique-se de que seu projeto está adequadamente configurado:

1. Crie um arquivo `railway.json` na raiz do projeto:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run db:push"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. Adicione um endpoint de healthcheck no arquivo `server/routes.ts`:

```typescript
// Adicione esta rota às suas rotas existentes
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

3. Atualize o script `start` no seu `package.json`:

```json
"scripts": {
  "start": "tsx server/index.ts",
  ...
}
```

## Passo 2: Criar um novo projeto no Railway

1. Faça login no [Railway](https://railway.app/)
2. Clique em "New Project" na dashboard
3. Selecione "Deploy from GitHub repo"
4. Conecte sua conta GitHub se ainda não estiver conectada
5. Selecione o repositório do Sistema Equidade Clínica

## Passo 3: Configurar o banco de dados PostgreSQL

1. No painel do projeto, clique em "New"
2. Selecione "Database" → "PostgreSQL"
3. Aguarde a criação do banco de dados (alguns segundos)
4. Após criado, clique no serviço PostgreSQL
5. Vá para a aba "Variables"
6. Observe que o Railway criou automaticamente uma variável chamada `DATABASE_URL`

## Passo 4: Configurar variáveis de ambiente para a aplicação

1. Clique no serviço da sua aplicação (não no PostgreSQL)
2. Vá para a aba "Variables"
3. Adicione as seguintes variáveis:
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: Gere um valor aleatório (pode usar [Random.org](https://www.random.org/strings/))
   - `PORT`: `5000` (o Railway gerenciará a porta externa automaticamente)

## Passo 5: Configurar o deploy automático

1. No serviço da sua aplicação, vá para a aba "Settings"
2. Em "Deploy Triggers":
   - Defina o branch como `main` (ou outro branch principal)
   - Mantenha "Automatic Deploys" ativado

## Passo 6: Executar o primeiro deploy

1. No serviço da sua aplicação, clique na aba "Deployments"
2. Clique em "Deploy Now"
3. Aguarde o processo de build e deploy concluir (pode levar alguns minutos)

## Passo 7: Acessar sua aplicação

1. Após o deploy ser concluído com sucesso, clique na aba "Settings"
2. Em "Domains", você verá o URL gerado pelo Railway para sua aplicação
3. Clique no URL para acessar sua aplicação

## Dicas importantes

### Monitoramento e logs

1. Acesse a aba "Deployments" e clique no deploy ativo
2. Clique em "View Logs" para ver os logs em tempo real
3. Use os filtros disponíveis para encontrar problemas específicos

### Atualizando a aplicação

1. Faça push das alterações para seu repositório GitHub
2. O Railway detectará automaticamente as alterações e iniciará um novo deploy
3. Você pode acompanhar o progresso na aba "Deployments"

### Configurando domínio personalizado

1. Vá para a aba "Settings" do serviço da sua aplicação
2. Em "Domains", clique em "Custom Domain"
3. Siga as instruções para configurar seu domínio personalizado

### Configurando banco de dados para produção

Para aplicações em produção, considere:

1. Configurar backups automáticos (disponível nos planos pagos)
2. Monitorar o uso de recursos do banco de dados na aba "Metrics"
3. Configurar alertas para uso de recursos (disponível nos planos pagos)

## Solução de problemas comuns

### Deploy falha durante o build

- Verifique os logs de build para identificar erros específicos
- Certifique-se de que o script `db:push` está configurado corretamente
- Verifique se todas as dependências estão listadas no `package.json`

### Erro de conexão com o banco de dados

- Verifique se a variável `DATABASE_URL` está configurada corretamente
- Teste a conexão executando `npm run db:push` localmente com a mesma URL
- Verifique se o banco de dados PostgreSQL está ativo

### Aplicação não inicia após o deploy

- Verifique os logs de inicialização para identificar erros
- Certifique-se de que o comando `start` está configurado corretamente
- Verifique se todas as variáveis de ambiente necessárias estão configuradas

## Custos e escalabilidade

O Railway opera com um modelo de preços baseado em créditos:

1. Plano gratuito: $5 em créditos por mês, sem cartão de crédito
2. Plano desenvolvedor: $20/mês para $20 em créditos + recursos avançados

Para a aplicação Equidade Clínica com tráfego de teste beta, o plano gratuito pode ser suficiente inicialmente. À medida que o uso aumentar, você pode atualizar para o plano desenvolvedor ou ajustar os recursos conforme necessário.

Para controlar custos:
- Monitore o uso de recursos na aba "Usage" do projeto
- Configure limites de recursos para serviços individuais
- Desative serviços quando não estiverem em uso

## Recursos adicionais

- [Documentação oficial do Railway](https://docs.railway.app/)
- [Guia de precificação do Railway](https://railway.app/pricing)
- [Fórum da comunidade Railway](https://community.railway.app/)

---

Com esse guia, você deve ser capaz de implantar o Sistema Equidade Clínica no Railway para testes beta de forma rápida e eficiente. A plataforma oferece uma experiência moderna e simplificada, perfeita para aplicações Node.js com PostgreSQL.