# Documentação - Sistema Equidade

## Estrutura do Projeto
```
app/
├── auth/         # Autenticação e autorização
├── models/       # Modelos do banco de dados
├── routes/       # Rotas da aplicação
├── services/     # Lógica de negócio
├── static/       # Arquivos estáticos (CSS/JS)
├── templates/    # Templates HTML
└── utils/        # Utilitários
```

## Tecnologias
- Backend: Python/Flask
- Database: PostgreSQL/SQLite
- ORM: SQLAlchemy
- Autenticação: Flask-Login
- Segurança: Flask-Talisman, Flask-WTF

## Guias
- [Deployment Railway](railway_deployment_guide.md)
- [Permissões](permissoes_por_perfil.md)
- [Recursos de Acessibilidade](recursos_acessibilidade.md)
- [Funcionalidades](funcionalidades_implementadas.md)

## Desenvolvimento
1. Clone o repositório
2. Configure ambiente virtual Python
3. Instale dependências: `pip install -r requirements.txt`
4. Configure `.env`
5. Rode migrations: `flask db upgrade`
6. Inicie servidor: `flask run`

## Testes
```bash
pytest
pytest --cov=app
```

## Deploy
- Uso do Gunicorn em produção
- PostgreSQL para banco de dados
- Logs em JSON
- Monitoramento via `/health`