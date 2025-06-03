# Guia de Deploy no Railway (Python/Flask)

## Pré-requisitos

- Conta no Railway (https://railway.app/)
- Repositório git configurado
- Python 3.10+

## Configuração de Variáveis de Ambiente

Configure as seguintes variáveis no Railway:

```
SECRET_KEY=sua-chave-secreta
CSRF_SECRET=sua-chave-csrf
DATABASE_URL=postgresql://...  # Fornecido pelo Railway
FLASK_ENV=production
```

## Deploy

1. Conecte seu repositório no Railway
2. O Railway detectará automaticamente que é um projeto Python
3. O deploy será feito automaticamente usando:
   - Nixpacks para build
   - Gunicorn para servidor
   - PostgreSQL para banco de dados

## Monitoramento

- Use o endpoint `/health` para monitorar o status
- Logs disponíveis no dashboard do Railway
- Métricas básicas fornecidas pelo Railway

## Troubleshooting

1. **Erro de build**: Verifique `requirements.txt`
2. **Erro de database**: Confirme `DATABASE_URL`
3. **Erro 500**: Verifique os logs do Railway