# Permissões por Perfil no Sistema Equidade Clínica

Este documento detalha as permissões e funcionalidades disponíveis para cada perfil de acesso no sistema Equidade Clínica.

## Visão Geral

O sistema Equidade Clínica implementa um controle de acesso baseado em papéis (RBAC - Role-Based Access Control), onde cada usuário possui um papel específico que determina suas permissões no sistema.

## Perfis de Acesso

### 1. Administrador (`admin`)

O administrador tem acesso completo ao sistema, incluindo todas as funcionalidades administrativas.

**Permissões:**
- Gerenciamento completo de usuários (criar, editar, desativar)
- Gerenciamento de unidades/filiais
- Configurações globais do sistema
- Visualização de logs de auditoria
- Acesso a relatórios gerenciais
- Gerenciamento de convênios
- Todas as permissões dos perfis abaixo

**Funcionalidades Específicas:**
- Painel administrativo completo
- Configuração de horários de funcionamento
- Definição de papéis e permissões
- Visualização de estatísticas de uso do sistema
- Gerenciamento de backups de dados

### 2. Coordenador (`coordinator`)

Coordenadores têm amplo acesso às funcionalidades de gestão, mas com algumas limitações administrativas.

**Permissões:**
- Gestão de profissionais de sua unidade
- Aprovação de evoluções de estagiários
- Gerenciamento de agendamentos
- Visualização de relatórios operacionais
- Gerenciamento de pacientes
- Gerenciamento parcial de unidades (apenas as atribuídas)

**Funcionalidades Específicas:**
- Painel de supervisão de equipe
- Relatórios de produtividade
- Gestão de ocorrências
- Atribuição de pacientes a profissionais
- Visualização do fluxo de pacientes

### 3. Profissional (`professional`)

Profissionais têm acesso às funcionalidades essenciais para atendimentos e acompanhamento de pacientes.

**Permissões:**
- Visualização de sua agenda
- Registro de evoluções de atendimentos
- Acesso a prontuários de seus pacientes
- Supervisão de estagiários designados
- Troca de mensagens com equipe

**Funcionalidades Específicas:**
- Registro de evoluções clínicas
- Encaminhamentos internos
- Aprovação de evoluções de estagiários supervisionados
- Visualização de histórico de atendimentos
- Upload de documentos relacionados a pacientes
- Criação de relatórios clínicos

### 4. Estagiário (`intern`)

Estagiários têm acesso limitado, com funções que requerem aprovação de supervisores.

**Permissões:**
- Visualização de sua agenda
- Registro de evoluções (sujeitas à aprovação)
- Acesso limitado a prontuários de pacientes designados
- Envio de mensagens para supervisores

**Funcionalidades Específicas:**
- Registro de evoluções (com marcação pendente de aprovação)
- Acompanhamento do status de aprovação
- Notificações de feedback de supervisores
- Visualização parcial de históricos de pacientes

### 5. Secretário(a) (`secretary`)

Secretários têm acesso a funções administrativas e de atendimento ao cliente.

**Permissões:**
- Gerenciamento de agendamentos
- Cadastro básico de pacientes
- Recepção e check-in de pacientes
- Consulta a horários disponíveis

**Funcionalidades Específicas:**
- Agendamento de consultas
- Confirmação de atendimentos
- Registro de falta de pacientes
- Gestão da fila de espera
- Emissão de declarações de comparecimento
- Controle de pagamentos e faturamento

## Tabela de Permissões por Recurso

| Recurso | Admin | Coordenador | Profissional | Estagiário | Secretário |
|---------|-------|-------------|--------------|------------|------------|
| **Usuários** |
| Criação | ✓ | ✗ | ✗ | ✗ | ✗ |
| Edição | ✓ | Parcial¹ | Próprio | Próprio | Próprio |
| Exclusão | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Unidades** |
| Criação | ✓ | ✗ | ✗ | ✗ | ✗ |
| Edição | ✓ | Atribuídas | ✗ | ✗ | ✗ |
| Visualização | Todas | Atribuídas | Atribuídas | Atribuídas | Atribuídas |
| **Pacientes** |
| Cadastro | ✓ | ✓ | ✗ | ✗ | ✓ |
| Edição | ✓ | ✓ | Parcial² | ✗ | Parcial² |
| Consulta | Todos | Todos | Atribuídos | Atribuídos | Todos |
| **Agenda** |
| Criação | ✓ | ✓ | Própria | ✗ | ✓ |
| Edição | Todas | Todas | Própria | ✗ | Todas |
| Visualização | Todas | Todas | Própria | Própria | Todas |
| **Evoluções** |
| Registro | ✓ | ✓ | ✓ | ✓³ | ✗ |
| Aprovação | ✓ | ✓ | Supervisionados | ✗ | ✗ |
| Visualização | Todas | Todas | Pacientes atendidos | Parcial⁴ | ✗ |
| **Documentos** |
| Upload | ✓ | ✓ | ✓ | ✓⁵ | ✓ |
| Assinatura | ✓ | ✓ | ✓ | ✗ | ✗ |
| Visualização | Todos | Todos | Pacientes atendidos | Parcial⁶ | Administrativos |
| **Relatórios** |
| Gerenciais | ✓ | Parcial | ✗ | ✗ | ✗ |
| Operacionais | ✓ | ✓ | Próprios | ✗ | Parcial |
| Clínicos | ✓ | ✓ | Próprios | ✗ | ✗ |
| **Chat** |
| Criação de grupos | ✓ | ✓ | ✗ | ✗ | ✗ |
| Mensagens diretas | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notificações | ✓ | ✓ | ✓ | ✓ | ✓ |

### Observações:

¹ Coordenadores podem editar dados básicos de profissionais e estagiários sob sua supervisão  
² Edição limitada a dados de contato e informações não-clínicas  
³ Evoluções de estagiários requerem aprovação do supervisor  
⁴ Estagiários só veem evoluções do próprio paciente e apenas durante o período de atendimento  
⁵ Documentos enviados por estagiários são marcados para revisão  
⁶ Acesso somente a documentos relevantes ao atendimento realizado pelo estagiário  

## Fluxo de Aprovação

```
Estagiário registra evolução → Supervisor recebe notificação → Supervisor aprova/rejeita/solicita alterações → Estagiário recebe feedback
```

## Notas Importantes

1. O sistema registra logs de auditoria para todas as ações sensíveis.
2. As permissões podem ser ajustadas pelo administrador conforme necessidade.
3. Usuários inativos não têm acesso ao sistema independentemente do papel.
4. Recomenda-se revisão periódica das permissões atribuídas.

---

© 2025 Equidade Clínica - Todos os direitos reservados