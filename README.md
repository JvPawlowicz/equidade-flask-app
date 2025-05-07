# Equidade - Sistema de Gestão para Clínicas de Atendimento a Pessoas com Deficiência

## Visão Geral

Equidade é um sistema completo de gestão para clínicas de atendimento a pessoas com deficiência, desenvolvido para otimizar o fluxo de trabalho e melhorar o atendimento aos pacientes. Este sistema integra funcionalidades de agendamento, gestão de prontuários, acompanhamento de evoluções terapêuticas, controle de unidades e salas, sistema de chat interno, e muito mais.

## Principais Funcionalidades

- **Gestão de Pacientes**: Cadastro completo com histórico médico, documentos e evoluções
- **Agendamento Inteligente**: Sistema avançado de agendamento com alertas e notificações
- **Controle de Unidades e Salas**: Gerenciamento de múltiplas unidades e disponibilidade de salas
- **Evoluções Terapêuticas**: Documentação e acompanhamento do progresso dos pacientes
- **Chat Interno**: Comunicação em tempo real entre profissionais
- **Gestão de Documentos**: Upload, assinatura e compartilhamento de documentos
- **Relatórios e Estatísticas**: Dados analíticos para tomada de decisão
- **Controle de Acesso**: Diferentes níveis de permissão baseados em cargos
- **Acessibilidade**: Interface adaptada para diferentes necessidades
- **Suporte Offline**: Funcionalidades disponíveis mesmo sem conexão à internet

## Tecnologias Utilizadas

- **Frontend**: React, TailwindCSS, Shadcn/UI, React Query
- **Backend**: Node.js, Express
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Comunicação em Tempo Real**: WebSockets
- **PWA**: Progressive Web App com suporte offline
- **Autenticação**: Sistema de autenticação customizado com controle de sessão

## Requisitos

- Node.js 20.x ou superior
- PostgreSQL 15.x ou superior
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## Instalação para Desenvolvimento

1. Clone o repositório:
   ```bash
   git clone https://github.com/equidade/sistema-clinica.git
   cd sistema-clinica
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente (copie o arquivo .env.example):
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com as configurações do seu ambiente
   ```

4. Configure o banco de dados:
   ```bash
   npm run db:push   # Cria/atualiza as tabelas do banco
   npm run db:seed   # Popula o banco com dados iniciais
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

6. Acesse a aplicação:
   ```
   http://localhost:5000
   ```

## Implantação em Produção

Para implantar em produção, recomendamos utilizar o Railway, uma plataforma moderna e simples para hospedagem de aplicações web.

Consulte o [Guia de Implantação no Railway](docs/railway_deployment_guide.md) para instruções detalhadas.

## Estrutura do Projeto

```
├── client/                 # Frontend da aplicação
│   ├── public/             # Arquivos públicos
│   └── src/                # Código-fonte do frontend
│       ├── components/     # Componentes React
│       ├── hooks/          # React Hooks customizados
│       ├── lib/            # Utilitários e funções
│       └── pages/          # Páginas da aplicação
├── server/                 # Backend da aplicação
│   ├── index.ts            # Ponto de entrada
│   ├── routes.ts           # Definição de rotas da API
│   └── auth.ts             # Sistema de autenticação
├── db/                     # Configuração do banco de dados
│   ├── index.ts            # Conexão com banco
│   └── seed.ts             # População inicial
├── shared/                 # Código compartilhado
│   └── schema.ts           # Schemas do banco de dados
├── scripts/                # Scripts de utilidade
└── docs/                   # Documentação
```

## Usuários Padrão

Para testes e desenvolvimento, os seguintes usuários são criados durante o seed:

- **Administrador**: admin / admin123
- **Coordenador**: coordenador / coord123
- **Profissional**: amanda / amanda123, carlos / carlos123, juliana / juliana123
- **Estagiário**: estagiario / estagiario123
- **Secretário**: secretaria / secretaria123

## Contribuição

Para contribuir com o desenvolvimento:

1. Crie um fork do repositório
2. Crie um branch para sua feature (`git checkout -b feature/nome-da-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para o branch (`git push origin feature/nome-da-feature`)
5. Abra um Pull Request

## Suporte

Para obter suporte, entre em contato pelo e-mail suporte@equidade.com.br ou abra uma issue no repositório do projeto.

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para mais detalhes.

---

Desenvolvido com ❤️ para melhorar o atendimento às pessoas com deficiência.