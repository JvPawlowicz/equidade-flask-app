# Documentação do Sistema Equidade Clínica

Bem-vindo à documentação completa do Sistema Equidade Clínica, uma plataforma de gerenciamento para clínicas multidisciplinares especializadas no atendimento a pessoas com deficiência.

## Documentos Disponíveis

### Implantação e Instalação

- [**Manual de Instalação no cPanel**](instalacao_cpanel.md) - Instruções detalhadas para implantação em hospedagem compartilhada com cPanel
- [**Script de Preparação para Implantação**](preparar_implantacao.sh) - Script para preparar os arquivos para implantação
- [**Comandos de Implantação**](comandos_implantacao.sh) - Script com os comandos necessários para instalação em produção

### Funcionalidades e Recursos

- [**Funcionalidades Implementadas**](funcionalidades_implementadas.md) - Lista completa das funcionalidades disponíveis no sistema
- [**Permissões por Perfil de Acesso**](permissoes_por_perfil.md) - Detalhamento das permissões de cada nível de acesso no sistema
- [**Recursos de Acessibilidade**](recursos_acessibilidade.md) - Guia dos recursos de acessibilidade disponíveis no sistema
- [**Guia de Recursos Mobile e Offline**](guia_mobile_offline.md) - Instruções para uso do sistema em dispositivos móveis e sem conexão

### Credenciais Padrão

| Perfil de Acesso | Usuário | Senha |
|------------------|---------|-------|
| Administrador | admin | admin123 |
| Coordenador | coordenador | coord123 |
| Profissional (Psicólogo) | amanda | amanda123 |
| Profissional (Fisioterapeuta) | carlos | carlos123 |
| Profissional (Fonoaudiólogo) | juliana | juliana123 |
| Estagiário | estagiario | estagiario123 |
| Secretário(a) | secretaria | secretaria123 |

**IMPORTANTE**: Altere as senhas imediatamente após o primeiro acesso!

## Visão Geral do Sistema

O Equidade Clínica é uma plataforma completa para gerenciamento de clínicas multidisciplinares, desenvolvida com foco em:

- **Acessibilidade:** Interface projetada para ser acessível a todos os usuários
- **Mobilidade:** Funcionamento otimizado em dispositivos móveis
- **Disponibilidade:** Recursos offline para garantir acesso mesmo sem internet
- **Segurança:** Proteção de dados sensíveis de pacientes e profissionais
- **Colaboração:** Ferramentas para trabalho em equipe multidisciplinar

## Arquitetura Técnica

O sistema foi desenvolvido utilizando tecnologias modernas:

- **Frontend:** React.js, TypeScript, TailwindCSS, Shadcn UI
- **Backend:** Node.js, Express, WebSockets
- **Banco de Dados:** PostgreSQL com Drizzle ORM
- **Autenticação:** Sistema de sessão seguro com Passport.js
- **PWA:** Progressive Web App para experiência mobile nativa

## Suporte e Contato

Para assistência técnica, entre em contato através dos canais:

- **E-mail de Suporte:** suporte@equidadeclinica.com.br
- **Telefone:** (11) XXXX-XXXX
- **Horário de Atendimento:** Segunda a Sexta, 9h às 18h

---

© 2025 Equidade Clínica - Todos os direitos reservados