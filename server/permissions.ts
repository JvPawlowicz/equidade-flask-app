import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { auditLogs, appointments, evolutions, patients } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Definição das permissões por função
export const permissions = {
  admin: {
    users: ["create", "read", "update", "delete"],
    facilities: ["create", "read", "update", "delete"],
    rooms: ["create", "read", "update", "delete"],
    professionals: ["create", "read", "update", "delete"],
    patients: ["create", "read", "update", "delete"],
    appointments: ["create", "read", "update", "delete", "manage", "confirm", "cancel"],
    evolutions: ["create", "read", "update", "delete", "approve", "reject"],
    documents: ["create", "read", "update", "delete", "sign", "share"],
    reports: ["create", "read", "update", "delete", "generate", "export"],
    insurancePlans: ["create", "read", "update", "delete"],
    dashboard: ["fullAccess"]
  },
  coordinator: {
    users: ["read"],
    facilities: ["read"],
    rooms: ["create", "read", "update"],
    professionals: ["read"],
    patients: ["create", "read", "update"],
    appointments: ["create", "read", "update", "manage", "confirm", "cancel"],
    evolutions: ["create", "read", "update", "approve", "reject"],
    documents: ["create", "read", "update", "sign", "share"],
    reports: ["create", "read", "generate", "export"],
    insurancePlans: ["create", "read", "update"],
    dashboard: ["facilityView"]
  },
  professional: {
    users: ["read"],
    facilities: ["read"],
    rooms: ["read"],
    professionals: ["read"],
    patients: ["read", "update:own"],
    appointments: ["read", "update:own", "confirm:own", "cancel:own"],
    evolutions: ["create:own", "read:own", "update:own"],
    documents: ["create:own", "read:own", "update:own", "sign:own"],
    reports: ["create:own", "read:own", "generate:own"],
    insurancePlans: ["read"],
    dashboard: ["professionalView"]
  },
  intern: {
    users: ["read"],
    facilities: ["read"],
    rooms: ["read"],
    professionals: ["read"],
    patients: ["read"],
    appointments: ["read:own", "update:own:supervised"],
    evolutions: ["create:own:supervised", "read:own", "update:own:supervised"],
    documents: ["create:own:supervised", "read:own", "update:own:supervised"],
    reports: ["read:own"],
    insurancePlans: ["read"],
    dashboard: ["internView"]
  },
  secretary: {
    users: ["read"],
    facilities: ["read"],
    rooms: ["read"],
    professionals: ["read"],
    patients: ["read", "create", "update"],
    appointments: ["create", "read", "update", "confirm", "cancel"],
    evolutions: ["read"],
    documents: ["read", "create"],
    reports: ["read"],
    insurancePlans: ["read", "create"],
    dashboard: ["secretaryView"]
  }
};

// Middleware para verificar permissões
export function checkPermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const userRole = req.user.role;
    
    // Verifica se o papel do usuário tem acesso ao recurso
    if (!permissions[userRole]) {
      return res.status(403).json({ error: `Papel de usuário desconhecido: ${userRole}` });
    }
    
    // Verifica se o recurso existe nas permissões
    if (!permissions[userRole][resource]) {
      return res.status(403).json({ error: `Acesso negado ao recurso: ${resource}` });
    }
    
    const allowedActions = permissions[userRole][resource];
    
    // Verifica se a ação específica é permitida
    // Suporta ações como 'read:own' para acesso limitado
    const actionBase = action.split(':')[0]; // Ex: 'update' de 'update:own'
    
    // Verificação de permissão geral ou específica
    if (
      allowedActions.includes(action) || // Permissão exata (ex: 'update:own')
      allowedActions.includes(actionBase) || // Permissão geral (ex: 'update')
      allowedActions.includes(`${actionBase}:own`) // Permissão para próprios recursos
    ) {
      // Logs de auditoria para ações sensíveis
      if (['create', 'update', 'delete', 'approve', 'reject', 'sign'].includes(actionBase)) {
        await logAuditAction(req, resource, action);
      }
      
      return next();
    }
    
    return res.status(403).json({ error: `Acesso negado. Ação não permitida: ${action} em ${resource}` });
  };
}

// Middleware para aprovar alterações sensíveis
export function requireApproval(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Verificar se a ação já requer aprovação
    const requiresApproval = ['delete', 'publish', 'finalize'].includes(action);
    
    if (requiresApproval && ['intern', 'professional'].includes(req.user.role)) {
      // Marcar para aprovação em vez de executar diretamente
      req.body._requiresApproval = true;
      req.body._approvalRequestedBy = req.user.id;
      req.body._approvalStatus = 'pending';
      req.body._approvalResource = resource;
      req.body._approvalAction = action;
      
      // Log da solicitação de aprovação
      await logAuditAction(req, resource, `approval_requested:${action}`);
    }
    
    next();
  };
}

// Tradução para recursos e ações (para exibição na UI)
export const resourceTranslations: Record<string, string> = {
  users: 'Usuários',
  facilities: 'Unidades',
  rooms: 'Salas',
  professionals: 'Profissionais',
  patients: 'Pacientes',
  appointments: 'Agendamentos',
  evolutions: 'Evoluções',
  documents: 'Documentos',
  reports: 'Relatórios',
  insurancePlans: 'Planos de Saúde',
  dashboard: 'Painel',
  auditLogs: 'Logs de Auditoria'
};

export const actionTranslations: Record<string, string> = {
  create: 'Criação',
  read: 'Leitura',
  update: 'Atualização',
  delete: 'Exclusão',
  approve: 'Aprovação',
  reject: 'Rejeição',
  sign: 'Assinatura',
  share: 'Compartilhamento',
  generate: 'Geração',
  export: 'Exportação',
  manage: 'Gerenciamento',
  confirm: 'Confirmação',
  cancel: 'Cancelamento',
  'approval_requested': 'Solicitação de Aprovação'
};

// Função para obter texto do recurso
export function getResourceText(resource: string): string {
  return resourceTranslations[resource] || resource;
}

// Função para obter texto da ação
export function getActionText(action: string): string {
  const baseAction = action.split(':')[0];
  const actionText = actionTranslations[baseAction] || baseAction;
  
  if (action.includes(':own')) {
    return `${actionText} (Próprio)`;
  }
  
  if (action.includes(':supervised')) {
    return `${actionText} (Supervisionado)`;
  }
  
  return actionText;
}

// Log de ações para auditoria
async function logAuditAction(req: Request, resource: string, action: string) {
  try {
    const userId = req.user.id;
    const resourceId = req.params.id || req.body.id || null;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Filtrar dados sensíveis do corpo para evitar log de senhas
    const filteredBody = {...req.body};
    if (filteredBody.password) filteredBody.password = '********';
    if (filteredBody.currentPassword) filteredBody.currentPassword = '********';
    if (filteredBody.newPassword) filteredBody.newPassword = '********';
    
    // Dados da ação para o log
    const actionData = {
      userId: userId,
      action: action,
      resource: resource,
      resourceId: resourceId ? parseInt(resourceId) : null,
      ipAddress: ipAddress,
      userAgent: userAgent,
      details: JSON.stringify({
        params: req.params,
        query: req.query,
        body: filteredBody
      })
    };
    
    // Criar log de auditoria
    await db.insert(auditLogs).values(actionData);
  } catch (error) {
    console.error("Erro ao registrar ação para auditoria:", error);
  }
}

// Verificar se o usuário é dono do recurso ou supervisor
export async function isOwnerOrSupervisor(req: Request, resourceTable: string, resourceId: string | number) {
  const userId = req.user.id;
  const resourceIdInt = typeof resourceId === 'string' ? parseInt(resourceId) : resourceId;
  
  try {
    // Verificar se é admin ou coordenador (tem acesso total)
    if (['admin', 'coordinator'].includes(req.user.role)) {
      return true;
    }
    
    // Para diferentes tipos de recursos
    switch (resourceTable) {
      case 'appointments':
        // Verificar se é o profissional associado ao agendamento
        const appointment = await db.query.appointments.findFirst({
          where: and(
            eq(appointments.id, resourceIdInt),
            eq(appointments.professionalId, userId)
          )
        });
        return !!appointment;
      
      case 'evolutions':
        // Verificar se é o autor da evolução
        const evolution = await db.query.evolutions.findFirst({
          where: and(
            eq(evolutions.id, resourceIdInt),
            eq(evolutions.professionalId, userId)
          )
        });
        return !!evolution;
      
      case 'patients':
        // Verificar se é um profissional que atende este paciente
        const patientAppointment = await db.query.appointments.findFirst({
          where: and(
            eq(appointments.patientId, resourceIdInt),
            eq(appointments.professionalId, userId)
          )
        });
        return !!patientAppointment;
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`Erro ao verificar propriedade do recurso ${resourceTable}:`, error);
    return false;
  }
}