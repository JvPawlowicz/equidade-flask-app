# ⚠️ Principais Problemas e Mudanças Necessárias (Auditoria 2025)

Atenção: Esta plataforma requer ajustes para ser totalmente usável e segura. Veja abaixo os principais pontos identificados na auditoria:

## Problemas Atuais
- **Ambiguidade de Backend:** O README e parte do projeto descrevem um backend Node.js/Express/PostgreSQL, mas há uma implementação Flask/Python ativa (pasta `app/`, `run.py`, `requirements.txt`).
- **Dependências e Inicialização:** O ambiente Python requer dependências específicas (ver `requirements.txt`) e inicialização via Flask, não Node.js.
- **Banco de Dados:** Scripts de seed e migração estão em TypeScript (para Node.js), mas o backend Flask espera modelos SQLAlchemy. Não há integração automática entre os dois.
- **Autenticação:** O fluxo de autenticação Flask está funcional, mas precisa de testes manuais e ajustes para integração total com o frontend.
- **Proteção de Segurança:** Algumas proteções (CSRF, hash de senha, login_required) estão presentes, mas precisam ser revisadas e testadas.
- **Modificações em Dependências:** Havia código indevido em `flask_limiter` (corrigido), mas é importante garantir que dependências de terceiros não sejam alteradas manualmente.
- **Documentação Desatualizada:** O README não reflete o fluxo real de uso para o backend Flask.

## Mudanças Recomendadas
1. **Escolher e Documentar o Backend Oficial:** Definir se o backend principal será Flask/Python ou Node.js/Express, e remover/reorganizar arquivos para evitar confusão.
2. **Atualizar o README:** Explicar claramente como rodar o backend Flask (comando, dependências, variáveis de ambiente, criação do banco, seed de usuários admin).
3. **Padronizar Scripts de Seed:** Criar um comando Python para popular o banco de dados do Flask com usuários de teste/admin.
4. **Testar e Corrigir Fluxo de Autenticação:** Garantir que login, cadastro, dashboard e logout funcionem ponta-a-ponta.
5. **Revisar Segurança:** Validar CSRF, hash de senha, proteção de rotas e mensagens flash.
6. **Remover ou Isolar Código Node.js se não for usado:** Para evitar conflitos e facilitar manutenção.
7. **Adicionar Testes Automatizados:** Para rotas críticas de autenticação e dashboard.

---

## Como Tornar a Plataforma Usável (Backend Flask)

### 1. Instalação do Backend Flask

```bash
# No diretório raiz do projeto:
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 2. Configuração de Variáveis de Ambiente
Crie um arquivo `.env` ou defina as variáveis necessárias, por exemplo:
```
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=sua-chave-secreta
SQLALCHEMY_DATABASE_URI=sqlite:///equidade.db
```

### 3. Criação do Banco de Dados
Abra o shell do Flask e execute:
```powershell
$env:FLASK_APP = "run.py"; flask shell
```
No shell interativo:
```python
from app import db
from app.models import User
# Cria as tabelas
db.create_all()
```

### 4. (Opcional) Criar Usuário Admin Manualmente
Você pode rodar o script automático:
```powershell
python app/seed_admin.py
```
Ou criar manualmente no shell do Flask:
```python
from app.models import User
admin = User(username="admin", email="admin@admin.com")
admin.set_password("admin123")
db.session.add(admin)
db.session.commit()
```

### 5. Rodar o Servidor Flask
```powershell
$env:FLASK_APP = "run.py"; flask run
```
Acesse em: http://localhost:5000

### 6. Testar Fluxo de Autenticação
- Acesse `/login` e `/cadastro` para testar login/cadastro.
- Após login, acesse `/dashboard` (rota protegida).
- Teste logout e mensagens flash.

### 7. Recomendações de Organização
- Se optar pelo backend Flask, remova ou mova para outra pasta os arquivos de Node.js/TypeScript para evitar confusão.
- Atualize o README para refletir apenas o backend em uso.
- Implemente um comando Flask CLI para seed de usuários, se desejar automatizar a criação de admins/testes.
- Adicione testes automatizados com `pytest` e `Flask-Testing`.

---

# Equidade - Sistema de Gestão para Clínicas (Flask/Python)

## Visão Geral
Equidade é um sistema completo de gestão para clínicas de atendimento a pessoas com deficiência, desenvolvido em Python/Flask com foco em segurança, acessibilidade e usabilidade.

## Tecnologias Utilizadas
- **Backend**: Python 3.10+ com Flask
- **Banco de Dados**: SQLite/PostgreSQL com SQLAlchemy
- **Frontend**: Templates Flask com TailwindCSS e Bootstrap
- **Segurança**: Flask-Login, Flask-WTF (CSRF), Bcrypt, Flask-Talisman
- **Rate Limiting**: Flask-Limiter
- **Testes**: pytest, pytest-cov

---

## Instalação e Execução

### 1. Instale as dependências
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```
SECRET_KEY=sua-chave-secreta
DATABASE_URL=sqlite:///instance/db.sqlite
FLASK_ENV=development
```

### 3. Inicialize o banco de dados
```powershell
python app/seed_admin.py  # Cria admin padrão
# ou
python -m flask db upgrade  # Se usar Flask-Migrate
```

### 4. Execute o servidor
```powershell
$env:FLASK_APP = "run.py"; flask run
```
Acesse: http://localhost:5000

---

## Testes Automatizados

- Para rodar os testes:
```powershell
python -m pytest
```
- Para cobertura de código:
```powershell
python -m pytest --cov=app --cov-report=term-missing
```

---

## Auditoria e Pendências

- Veja o arquivo `Kayron - Breno Prog/auditoria_pendente.md` para detalhes de erros, validações e recomendações.
- Arquivos Node.js/TypeScript legados estão listados em `_legacy_node_typescript_files.txt`.

---

## Observações
- O backend oficial é Flask/Python. Arquivos Node.js/TypeScript não são mais utilizados.
- Para dúvidas ou contribuições, consulte a documentação na pasta `docs/`.

---

# Guia rápido para deploy no Render.com (Flask)

1. **Procfile**: já configurado para `web: gunicorn run:app`
2. **requirements.txt**: já inclui gunicorn e dependências Flask
3. **nixpacks.toml**: já configurado para Python/Flask
4. **.env**: configure as variáveis de ambiente no painel do Render (use `.env` como exemplo)
5. **Banco de dados**: por padrão usa SQLite, mas recomenda-se PostgreSQL em produção (ajuste `DATABASE_URL`)
6. **Diretório `instance/`**: Render precisa de permissão de escrita para SQLite, ou use PostgreSQL
7. **Comando de inicialização**: Render usará automaticamente o comando do Procfile

**Passos:**
- Faça push do repositório para o GitHub
- Crie um novo serviço Web no Render, conecte ao repositório
- Defina as variáveis de ambiente conforme `.env`
- (Opcional) Ajuste `DATABASE_URL` para PostgreSQL
- Deploy!

Para dúvidas, consulte a [documentação oficial do Render para Python](https://render.com/docs/deploy-flask).

---

# Guia rápido para deploy no Railway (Flask)

1. **Procfile**: já configurado para `web: ./scripts/railway-start.sh`
2. **requirements.txt**: já inclui gunicorn e dependências Flask
3. **nixpacks.toml**: já configurado para Python/Flask
4. **.env**: configure as variáveis de ambiente no painel do Railway (use `.env` como exemplo)
5. **Banco de dados**: por padrão usa SQLite, mas recomenda-se PostgreSQL em produção (ajuste `DATABASE_URL`)
6. **Diretório `instance/`**: Railway precisa de permissão de escrita para SQLite, ou use PostgreSQL
7. **Comando de inicialização**: Railway usará automaticamente o comando do Procfile

**Passos:**
- Faça push do repositório para o GitHub
- Crie um novo projeto no Railway, conecte ao repositório
- Defina as variáveis de ambiente conforme `.env`
- (Opcional) Ajuste `DATABASE_URL` para PostgreSQL
- Deploy!

Para dúvidas, consulte a [documentação oficial do Railway para Python](https://docs.railway.app/deploy/deployments/python/).

---

Desenvolvido com ❤️ para melhorar o atendimento às pessoas com deficiência.