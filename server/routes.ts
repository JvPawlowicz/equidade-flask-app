import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import { checkPermission, requireApproval, isOwnerOrSupervisor, getResourceText, getActionText, resourceTranslations, actionTranslations } from "./permissions";
import { healthCheck } from "./healthcheck";
import WebSocket, { WebSocketServer } from "ws";
import { db } from "@db";
import {
  appointments,
  appointmentStatusEnum,
  auditLogs,
  chatGroupMembers,
  chatGroups,
  chatMessages,
  documents,
  evolutions,
  facilities,
  insurancePlans,
  notifications,
  patients,
  patientFacilities,
  procedureTypeEnum,
  professionals,
  reports,
  rooms,
  users,
  // Esquemas de validação para endpoints
  insertFacilitySchema, 
  insertRoomSchema,
  insertProfessionalSchema,
  insertPatientSchema,
  insertInsurancePlanSchema,
  insertAppointmentSchema,
  insertEvolutionSchema,
  insertDocumentSchema,
  insertChatGroupSchema,
  insertChatMessageSchema,
  selectFacilitySchema,
  selectRoomSchema
} from "@shared/schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, not, notExists, or, sql } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { format } from "date-fns";

// Utilitário para gerenciar erros de validação Zod
function handleZodError(error: unknown, res: Response): boolean {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: "Dados de entrada inválidos",
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    });
    return true;
  }
  return false;
}

// Função para registrar ação no audit log
async function logAuditAction(req: Request, action: string, resource: string, resourceId: string | null = null, details: object = {}) {
  try {
    if (!req.user) return;
    
    await db.insert(auditLogs).values({
      userId: req.user.id,
      action,
      resource,
      resourceId,
      details: {
        ...details,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date().toISOString()
      },
      createdAt: new Date()
    });
  } catch (error) {
    console.error(`Erro ao registrar auditoria (${action} ${resource}):`, error);
  }
}

// Middleware para validar entrada com schemas Zod
function validateInput(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      handleZodError(error, res);
    }
  };
}

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF, DOC, DOCX
    const allowedTypes = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não suportado. Apenas PDF, DOC e DOCX são permitidos."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // API prefix
  const apiPrefix = "/api";
  
  // Rota de healthcheck para monitoramento (não requer autenticação)
  app.get(`${apiPrefix}/health`, healthCheck);

  // Rota para listar todos os usuários - com dados sensíveis removidos
  app.get(`${apiPrefix}/users`, checkPermission('users', 'read'), async (req: Request, res: Response) => {
    try {
      const allUsers = await db.query.users.findMany();
      // Remover senhas antes de retornar para o cliente
      const safeUsers = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // Configuração do servidor HTTP e WebSocket
  const httpServer = createServer(app);
  
  // Configurar WebSocket em um caminho separado para não conflitar com HMR do Vite
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map para armazenar conexões ativas por ID de usuário
  const activeConnections = new Map<number, WebSocket>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Nova conexão WebSocket estabelecida');
    
    // Autenticar o usuário
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Autenticação inicial
        if (data.type === 'auth') {
          const userId = parseInt(data.userId);
          const authToken = data.token;
          
          // Verificar autenticação (simplificado, estamos apenas usando userId)
          if (userId && !isNaN(userId)) {
            // Armazenar a conexão mapeada pelo ID do usuário
            activeConnections.set(userId, ws);
            
            // Enviar confirmação
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: userId,
              timestamp: new Date().toISOString()
            }));
            
            console.log(`Usuário ${userId} autenticado via WebSocket`);
          } else {
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Falha na autenticação',
              timestamp: new Date().toISOString()
            }));
          }
        }
        
        // Mensagem de chat
        if (data.type === 'chat_message' && activeConnections.has(parseInt(data.senderId))) {
          // Processar mensagem
          const { recipientId, groupId, content, senderId } = data;
          
          // Salvar mensagem no banco
          (async () => {
            try {
              const [savedMessage] = await db.insert(chatMessages).values({
                senderId: parseInt(senderId),
                recipientId: recipientId ? parseInt(recipientId) : null,
                groupId: groupId ? parseInt(groupId) : null,
                content: content,
                isRead: false
              }).returning();
              
              // Mensagem direta para um usuário
              if (recipientId && activeConnections.has(parseInt(recipientId))) {
                const recipientWs = activeConnections.get(parseInt(recipientId));
                if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                  recipientWs.send(JSON.stringify({
                    type: 'new_message',
                    message: savedMessage,
                    timestamp: new Date().toISOString()
                  }));
                }
              }
              
              // Mensagem para um grupo
              if (groupId) {
                // Buscar membros do grupo
                const groupMembers = await db.query.chatGroupMembers.findMany({
                  where: eq(chatGroupMembers.groupId, parseInt(groupId))
                });
                
                // Enviar para todos os membros online, exceto o remetente
                for (const member of groupMembers) {
                  if (member.userId !== parseInt(senderId) && activeConnections.has(member.userId)) {
                    const memberWs = activeConnections.get(member.userId);
                    if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                      memberWs.send(JSON.stringify({
                        type: 'new_group_message',
                        message: savedMessage,
                        groupId: parseInt(groupId),
                        timestamp: new Date().toISOString()
                      }));
                    }
                  }
                }
              }
              
              // Confirmar envio para o remetente
              ws.send(JSON.stringify({
                type: 'message_sent',
                messageId: savedMessage.id,
                timestamp: new Date().toISOString()
              }));
              
            } catch (error) {
              console.error('Erro ao salvar mensagem:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Erro ao processar mensagem',
                timestamp: new Date().toISOString()
              }));
            }
          })();
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    // Gerenciar desconexão
    ws.on('close', () => {
      // Remover conexão ao desconectar
      for (const [userId, connection] of activeConnections.entries()) {
        if (connection === ws) {
          activeConnections.delete(userId);
          console.log(`Usuário ${userId} desconectado do WebSocket`);
          break;
        }
      }
    });
  });

  // API routes

  // Facilities endpoints
  app.get(`${apiPrefix}/facilities`, requireAuth, checkPermission('facilities', 'read'), async (req, res) => {
    try {
      // Permitir filtros por nome ou localização
      const { name, city, state, active } = req.query;
      
      let query = db.query.facilities;
      let conditions = [];
      
      if (name) {
        conditions.push(ilike(facilities.name, `%${name}%`));
      }
      
      if (city) {
        conditions.push(ilike(facilities.city, `%${city}%`));
      }
      
      if (state) {
        conditions.push(eq(facilities.state, state.toString()));
      }
      
      if (active !== undefined) {
        conditions.push(eq(facilities.isActive, active === 'true'));
      }
      
      const allFacilities = conditions.length > 0
        ? await query.findMany({ where: and(...conditions) })
        : await query.findMany();
      
      // Log da auditoria
      logAuditAction(req, 'read', 'facilities', null, { 
        filters: { name, city, state, active },
        count: allFacilities.length 
      });
      
      res.json(allFacilities);
    } catch (error) {
      console.error("Erro ao buscar unidades:", error);
      res.status(500).json({ error: "Erro ao buscar unidades" });
    }
  });

  app.get(`${apiPrefix}/facilities/:id`, requireAuth, checkPermission('facilities', 'read'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validar ID
      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: "ID da unidade inválido" });
      }
      
      const facilityId = parseInt(id);
      
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, facilityId),
        with: {
          rooms: true,
        },
      });

      if (!facility) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }

      // Log da auditoria
      logAuditAction(req, 'read', 'facilities', id, { 
        facilityName: facility.name 
      });
      
      res.json(facility);
    } catch (error) {
      console.error("Erro ao buscar unidade:", error);
      res.status(500).json({ error: "Erro ao buscar unidade" });
    }
  });

  app.post(`${apiPrefix}/facilities`, 
    requireAuth, 
    checkPermission('facilities', 'create'),
    validateInput(insertFacilitySchema),
    async (req: Request, res: Response) => {
      try {
        // Os dados já foram validados pelo middleware validateInput
        const [newFacility] = await db.insert(facilities).values(req.body).returning();
        
        // Log da auditoria
        logAuditAction(req, 'create', 'facilities', newFacility.id.toString(), {
          facilityName: newFacility.name,
          location: `${newFacility.city}, ${newFacility.state}`
        });
        
        res.status(201).json(newFacility);
      } catch (error) {
        console.error("Erro ao criar unidade:", error);
        res.status(500).json({ error: "Erro ao criar unidade" });
      }
    }
  );

  app.put(`${apiPrefix}/facilities/:id`, 
    requireAuth,
    checkPermission('facilities', 'update'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(parseInt(id))) {
          return res.status(400).json({ error: "ID da unidade inválido" });
        }
        
        const facilityId = parseInt(id);
        
        // Verificar se a unidade existe antes de atualizar
        const existingFacility = await db.query.facilities.findFirst({
          where: eq(facilities.id, facilityId)
        });
        
        if (!existingFacility) {
          return res.status(404).json({ error: "Unidade não encontrada" });
        }
        
        // Validar dados de entrada
        try {
          req.body = insertFacilitySchema.parse(req.body);
        } catch (error) {
          if (handleZodError(error, res)) return;
          throw error;
        }
        
        // Aplicar a atualização
        const [updatedFacility] = await db
          .update(facilities)
          .set(req.body)
          .where(eq(facilities.id, facilityId))
          .returning();
          
        // Log da auditoria
        logAuditAction(req, 'update', 'facilities', id, {
          before: {
            name: existingFacility.name,
            city: existingFacility.city,
            state: existingFacility.state,
            isActive: existingFacility.isActive
          },
          after: {
            name: updatedFacility.name,
            city: updatedFacility.city,
            state: updatedFacility.state,
            isActive: updatedFacility.isActive
          }
        });

        res.json(updatedFacility);
      } catch (error) {
        console.error("Erro ao atualizar unidade:", error);
        res.status(500).json({ error: "Erro ao atualizar unidade" });
      }
    }
  );

  // Rooms endpoints
  app.get(`${apiPrefix}/facilities/:facilityId/rooms`, 
    requireAuth, 
    checkPermission('facilities', 'read'),
    async (req, res) => {
      try {
        const { facilityId } = req.params;
        
        // Validar ID
        if (!facilityId || isNaN(parseInt(facilityId))) {
          return res.status(400).json({ error: "ID da unidade inválido" });
        }
        
        const facilityIdParsed = parseInt(facilityId);
        
        // Verificar se a facility existe
        const facility = await db.query.facilities.findFirst({
          where: eq(facilities.id, facilityIdParsed)
        });
        
        if (!facility) {
          return res.status(404).json({ error: "Unidade não encontrada" });
        }
        
        // Filtrar por status ativo/inativo
        const { active } = req.query;
        
        let where = eq(rooms.facilityId, facilityIdParsed);
        if (active !== undefined) {
          where = and(
            where,
            eq(rooms.isActive, active === 'true')
          );
        }
        
        const facilityRooms = await db.query.rooms.findMany({
          where,
          orderBy: asc(rooms.name)
        });
        
        // Log da auditoria
        logAuditAction(req, 'read', 'rooms', null, { 
          facilityId: facilityIdParsed,
          facilityName: facility.name,
          count: facilityRooms.length,
          filter: active
        });
        
        res.json(facilityRooms);
      } catch (error) {
        console.error("Erro ao buscar salas:", error);
        res.status(500).json({ error: "Erro ao buscar salas" });
      }
    }
  );

  app.post(`${apiPrefix}/rooms`, 
    requireAuth, 
    checkPermission('facilities', 'create'),
    validateInput(insertRoomSchema),
    async (req: Request, res: Response) => {
      try {
        // Verificar se a facility existe
        const facilityId = req.body.facilityId;
        
        const facility = await db.query.facilities.findFirst({
          where: eq(facilities.id, facilityId)
        });
        
        if (!facility) {
          return res.status(404).json({ error: "Unidade não encontrada" });
        }
        
        // Criar a sala
        const [newRoom] = await db.insert(rooms).values(req.body).returning();
        
        // Log da auditoria
        logAuditAction(req, 'create', 'rooms', newRoom.id.toString(), {
          facilityId: newRoom.facilityId,
          facilityName: facility.name,
          name: newRoom.name,
          capacity: newRoom.capacity
        });
        
        res.status(201).json(newRoom);
      } catch (error) {
        console.error("Erro ao criar sala:", error);
        res.status(500).json({ error: "Erro ao criar sala" });
      }
    }
  );

  app.put(`${apiPrefix}/rooms/:id`, 
    requireAuth, 
    checkPermission('facilities', 'update'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(parseInt(id))) {
          return res.status(400).json({ error: "ID da sala inválido" });
        }
        
        const roomId = parseInt(id);
        
        // Verificar se a sala existe
        const existingRoom = await db.query.rooms.findFirst({
          where: eq(rooms.id, roomId),
          with: {
            facility: true
          }
        });
        
        if (!existingRoom) {
          return res.status(404).json({ error: "Sala não encontrada" });
        }
        
        // Validar dados de entrada
        try {
          req.body = insertRoomSchema.parse(req.body);
        } catch (error) {
          if (handleZodError(error, res)) return;
          throw error;
        }
        
        // Verificar se a facility existe
        if (req.body.facilityId) {
          const facility = await db.query.facilities.findFirst({
            where: eq(facilities.id, req.body.facilityId)
          });
          
          if (!facility) {
            return res.status(404).json({ error: "Unidade não encontrada" });
          }
        }
        
        // Atualizar sala
        const [updatedRoom] = await db
          .update(rooms)
          .set(req.body)
          .where(eq(rooms.id, roomId))
          .returning();
        
        // Log da auditoria
        logAuditAction(req, 'update', 'rooms', id, {
          before: {
            name: existingRoom.name,
            capacity: existingRoom.capacity,
            facilityId: existingRoom.facilityId,
            isActive: existingRoom.isActive
          },
          after: {
            name: updatedRoom.name,
            capacity: updatedRoom.capacity,
            facilityId: updatedRoom.facilityId,
            isActive: updatedRoom.isActive
          },
          facilityName: existingRoom.facility?.name
        });
        
        res.json(updatedRoom);
      } catch (error) {
        console.error("Erro ao atualizar sala:", error);
        res.status(500).json({ error: "Erro ao atualizar sala" });
      }
    }
  );

  // Professionals endpoints
  app.get(`${apiPrefix}/professionals`, 
    requireAuth, 
    checkPermission('professionals', 'read'),
    async (req, res) => {
      try {
        // Permitir filtros por tipo, especialização e status ativo
        const { type, specialization, active, facilityId } = req.query;
        
        let conditions = [];
        
        if (type) {
          conditions.push(eq(professionals.professionalType, type.toString()));
        }
        
        if (specialization) {
          conditions.push(ilike(professionals.specialization, `%${specialization}%`));
        }
        
        if (active !== undefined) {
          conditions.push(eq(professionals.isActive, active === 'true'));
        }
        
        if (facilityId) {
          const facilityIdParsed = parseInt(facilityId.toString());
          if (!isNaN(facilityIdParsed)) {
            conditions.push(eq(professionals.facilityId, facilityIdParsed));
          }
        }
        
        const allProfessionals = await db.query.professionals.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
          with: {
            user: {
              // Certifique-se de não enviar a senha
              columns: {
                password: false
              }
            },
            facility: true
          },
          orderBy: asc(professionals.id)
        });
        
        // Log da auditoria
        logAuditAction(req, 'read', 'professionals', null, { 
          filters: { type, specialization, active, facilityId },
          count: allProfessionals.length 
        });
        
        res.json(allProfessionals);
      } catch (error) {
        console.error("Erro ao buscar profissionais:", error);
        res.status(500).json({ error: "Erro ao buscar profissionais" });
      }
    }
  );

  app.get(`${apiPrefix}/professionals/:id`, 
    requireAuth, 
    checkPermission('professionals', 'read'),
    async (req, res) => {
      try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(parseInt(id))) {
          return res.status(400).json({ error: "ID do profissional inválido" });
        }
        
        const professionalId = parseInt(id);
        
        const professional = await db.query.professionals.findFirst({
          where: eq(professionals.id, professionalId),
          with: {
            user: {
              // Certifique-se de não enviar a senha
              columns: {
                password: false
              }
            },
            facility: true,
            supervisor: {
              with: {
                user: {
                  columns: {
                    password: false
                  }
                }
              }
            },
            interns: {
              with: {
                user: {
                  columns: {
                    password: false
                  }
                }
              },
            },
          },
        });

        if (!professional) {
          return res.status(404).json({ error: "Profissional não encontrado" });
        }
        
        // Log da auditoria
        logAuditAction(req, 'read', 'professionals', id, {
          name: professional.user?.fullName,
          type: professional.professionalType
        });

        res.json(professional);
      } catch (error) {
        console.error("Erro ao buscar profissional:", error);
        res.status(500).json({ error: "Erro ao buscar profissional" });
      }
    }
  );
  
  // Professional statistics
  app.get(`${apiPrefix}/professionals/:id/stats`, 
    requireAuth, 
    checkPermission('professionals', 'read'),
    async (req, res) => {
      try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(parseInt(id))) {
          return res.status(400).json({ error: "ID do profissional inválido" });
        }
        
        const professionalId = parseInt(id);
        
        // Verificar se o profissional existe
        const professional = await db.query.professionals.findFirst({
          where: eq(professionals.id, professionalId),
          with: {
            user: {
              columns: {
                password: false
              }
            }
          }
        });
        
        if (!professional) {
          return res.status(404).json({ error: "Profissional não encontrado" });
        }
        
        // Obter parâmetros de consulta para filtrar por período
        const { period } = req.query;
        
        // Definir datas com base no período
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        // Definir período padrão como mês atual
        if (!period || period === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'week') {
          // Calcular início da semana (domingo)
          const day = now.getDay();
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        } else if (period === 'year') {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        } else {
          // Período inválido, usar mês atual como padrão
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        // Count appointments for this period
        const appointmentsQuery = await db.query.appointments.findMany({
          where: and(
            eq(appointments.professionalId, professionalId),
            gte(appointments.startTime, startDate),
            lte(appointments.endTime, endDate)
          )
        });
        
        const totalAppointments = appointmentsQuery.length;
        
        // Calculate total hours
        let totalHours = 0;
        appointmentsQuery.forEach(appointment => {
          const startTime = new Date(appointment.startTime);
          const endTime = new Date(appointment.endTime);
          const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalHours += durationHours;
        });
        
        // Count unique patients
        const uniquePatientIds = new Set(appointmentsQuery.map(a => a.patientId));
        const patientCount = uniquePatientIds.size;
        
        // Count appointments by status
        const statusCounts = {};
        appointmentsQuery.forEach(appointment => {
          const status = appointment.status || 'unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Count evolutions for this period
        const evolutionsQuery = await db.query.evolutions.findMany({
          where: and(
            eq(evolutions.professionalId, professionalId),
            gte(evolutions.createdAt, startDate),
            lte(evolutions.createdAt, endDate)
          )
        });
        
        const evolutionCount = evolutionsQuery.length;
        
        // Count evolutions by status
        const evolutionStatusCounts = {};
        evolutionsQuery.forEach(evolution => {
          const status = evolution.status || 'unknown';
          evolutionStatusCounts[status] = (evolutionStatusCounts[status] || 0) + 1;
        });
        
        // Log da auditoria
        logAuditAction(req, 'read', 'professionals', id, {
          action: 'statistics',
          name: professional.user?.fullName,
          period: period || 'month',
          stats: {
            appointments: totalAppointments,
            hours: parseFloat(totalHours.toFixed(1)),
            patients: patientCount,
            evolutions: evolutionCount
          }
        });
        
        res.json({
          period: period || 'month',
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          professional: {
            id: professional.id,
            name: professional.user?.fullName,
            type: professional.professionalType
          },
          appointments: {
            total: totalAppointments,
            byStatus: statusCounts
          },
          totalHours: parseFloat(totalHours.toFixed(1)),
          patientCount,
          evolutions: {
            total: evolutionCount,
            byStatus: evolutionStatusCounts
          }
        });
      } catch (error) {
        console.error("Erro ao buscar estatísticas do profissional:", error);
        res.status(500).json({ error: "Erro ao buscar estatísticas do profissional" });
      }
    }
  );
  
  // Rota para obter dados do profissional atual
  app.get(`${apiPrefix}/professionals/me`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const professional = await db.query.professionals.findFirst({
        where: eq(professionals.userId, userId),
      });
      
      if (!professional) {
        return res.status(404).json({ error: 'Profissional não encontrado' });
      }
      
      res.json(professional);
    } catch (error) {
      console.error('Error fetching professional data:', error);
      res.status(500).json({ error: 'Erro ao buscar dados do profissional' });
    }
  });
  
  // Rota para aceitar o termo LGPD
  app.post(`${apiPrefix}/professionals/lgpd-consent`, requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      // Buscar o profissional pelo ID do usuário
      const professional = await db.query.professionals.findFirst({
        where: eq(professionals.userId, userId),
      });
      
      if (!professional) {
        return res.status(404).json({ error: 'Profissional não encontrado' });
      }
      
      // Obter o IP do cliente
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Atualizar o status de aceitação LGPD
      const updatedProfessional = await db
        .update(professionals)
        .set({
          lgpdAccepted: true,
          lgpdAcceptedAt: new Date(),
          lgpdAcceptedIp: ip,
        })
        .where(eq(professionals.id, professional.id))
        .returning();
      
      // Logs de auditoria para monitoramento
      await logAuditAction(req, 'update', 'lgpd_consent', professional.id.toString(), {
        message: 'Aceitação do termo LGPD',
        ip: ip
      });
      
      res.status(200).json(updatedProfessional[0]);
    } catch (error) {
      console.error('Error updating LGPD consent:', error);
      res.status(500).json({ error: 'Erro ao atualizar aceitação do termo LGPD' });
    }
  });

  app.post(`${apiPrefix}/professionals`, 
    requireAuth, 
    checkPermission('professionals', 'create'),
    async (req: Request, res: Response) => {
      try {
        // Validar dados de usuário
        const userData = {
          username: req.body.username,
          password: req.body.password,
          email: req.body.email,
          fullName: req.body.fullName,
          role: req.body.role,
          facilityId: req.body.facilityId,
          phone: req.body.phone,
          profileImageUrl: req.body.profileImageUrl,
          isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };
        
        // Verificar se a facility existe
        if (userData.facilityId) {
          const facility = await db.query.facilities.findFirst({
            where: eq(facilities.id, userData.facilityId)
          });
          
          if (!facility) {
            return res.status(404).json({ error: "Unidade não encontrada" });
          }
        }
        
        // Verificar se o nome de usuário já existe
        const existingUser = await db.query.users.findFirst({
          where: eq(users.username, userData.username)
        });
        
        if (existingUser) {
          return res.status(400).json({ error: "Nome de usuário já existe" });
        }
        
        // Criptografar a senha antes de armazenar
        try {
          const salt = randomBytes(16).toString("hex");
          const buf = await scrypt(userData.password, salt, 64) as Buffer;
          userData.password = `${buf.toString("hex")}.${salt}`;
        } catch (error) {
          console.error("Erro ao criptografar senha:", error);
          return res.status(500).json({ error: "Erro ao processar a senha" });
        }
        
        // Criar usuário
        const [newUser] = await db.insert(users).values(userData).returning();
        
        // Validar dados profissionais
        const professionalData = {
          userId: newUser.id,
          professionalType: req.body.professionalType,
          licenseNumber: req.body.licenseNumber,
          licenseType: req.body.licenseType,
          specialization: req.body.specialization,
          employmentType: req.body.employmentType,
          hourlyRate: req.body.hourlyRate ? parseFloat(req.body.hourlyRate) : null,
          supervisorId: req.body.supervisorId || null,
          bio: req.body.bio,
          isActive: req.body.isActive !== undefined ? req.body.isActive : true,
          facilityId: userData.facilityId
        };
        
        // Verificar supervisor
        if (professionalData.supervisorId) {
          const supervisor = await db.query.professionals.findFirst({
            where: eq(professionals.id, professionalData.supervisorId)
          });
          
          if (!supervisor) {
            return res.status(404).json({ error: "Supervisor não encontrado" });
          }
        }
        
        // Criar profissional
        const [newProfessional] = await db.insert(professionals)
          .values(professionalData)
          .returning();
          
        // Log da auditoria
        logAuditAction(req, 'create', 'professionals', newProfessional.id.toString(), {
          name: newUser.fullName,
          type: newProfessional.professionalType,
          facility: userData.facilityId
        });
        
        // Remover a senha da resposta
        const { password, ...userWithoutPassword } = newUser;
        
        res.status(201).json({
          ...newProfessional,
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Erro ao criar profissional:", error);
        
        // Verificar erros específicos
        if (error instanceof Error && error.message.includes('unique constraint')) {
          return res.status(400).json({ error: "Dados únicos duplicados, verifique username ou licença" });
        }
        
        res.status(500).json({ error: "Erro ao criar profissional" });
      }
    }
  );

  app.put(`${apiPrefix}/professionals/:id`, 
    requireAuth, 
    checkPermission('professionals', 'update'),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        // Validar ID
        if (!id || isNaN(parseInt(id))) {
          return res.status(400).json({ error: "ID do profissional inválido" });
        }
        
        const professionalId = parseInt(id);
        
        // Buscar o profissional atual para verificar permissões
        const existingProfessional = await db.query.professionals.findFirst({
          where: eq(professionals.id, professionalId),
          with: {
            user: true
          }
        });
        
        if (!existingProfessional) {
          return res.status(404).json({ error: "Profissional não encontrado" });
        }
        
        // Se não for admin, verificar permissões adicionais - só pode editar o próprio perfil
        if (req.user.role !== "admin") {
          // Verificar se o usuário é o próprio profissional ou seu supervisor
          const isOwner = existingProfessional.userId === req.user.id;
          const isSupervisor = existingProfessional.supervisorId === req.user.id;
          
          if (!isOwner && !isSupervisor) {
            return res.status(403).json({ 
              error: "Acesso não autorizado. Você só pode editar seu próprio perfil ou de seus supervisionados."
            });
          }
          
          // Se for o próprio, não pode mudar role ou isActive
          if (isOwner && !isSupervisor) {
            if (req.body.role && req.body.role !== existingProfessional.user.role) {
              return res.status(403).json({ error: "Você não pode alterar seu próprio cargo (role)" });
            }
            
            if (req.body.isActive !== undefined && req.body.isActive !== existingProfessional.isActive) {
              return res.status(403).json({ error: "Você não pode alterar seu próprio status de atividade" });
            }
          }
        }
        
        // Preparar dados do usuário para atualização
        const userData = {
          email: req.body.email,
          fullName: req.body.fullName,
          role: req.body.role,
          facilityId: req.body.facilityId,
          phone: req.body.phone,
          profileImageUrl: req.body.profileImageUrl,
        };
        
        // Verificar se facility existe, caso esteja sendo atualizada
        if (userData.facilityId) {
          const facility = await db.query.facilities.findFirst({
            where: eq(facilities.id, userData.facilityId)
          });
          
          if (!facility) {
            return res.status(404).json({ error: "Unidade não encontrada" });
          }
        }
        
        // Atualizar usuário
        await db.update(users)
          .set(userData)
          .where(eq(users.id, existingProfessional.userId));
        
        // Preparar dados do profissional para atualização
        const professionalData = {
          professionalType: req.body.professionalType,
          licenseNumber: req.body.licenseNumber,
          licenseType: req.body.licenseType,
          specialization: req.body.specialization,
          employmentType: req.body.employmentType,
          hourlyRate: req.body.hourlyRate ? parseFloat(req.body.hourlyRate) : null,
          supervisorId: req.body.supervisorId,
          bio: req.body.bio,
          isActive: req.body.isActive,
          facilityId: userData.facilityId
        };
        
        // Verificar novo supervisor, se informado
        if (professionalData.supervisorId && professionalData.supervisorId !== existingProfessional.supervisorId) {
          const supervisor = await db.query.professionals.findFirst({
            where: eq(professionals.id, professionalData.supervisorId)
          });
          
          if (!supervisor) {
            return res.status(404).json({ error: "Supervisor não encontrado" });
          }
        }
        
        // Atualizar profissional
        const [updatedProfessional] = await db
          .update(professionals)
          .set(professionalData)
          .where(eq(professionals.id, professionalId))
          .returning();
        
        // Buscar usuário atualizado
        const updatedUser = await db.query.users.findFirst({
          where: eq(users.id, existingProfessional.userId),
          columns: {
            password: false // Excluir senha do resultado
          }
        });
        
        // Log da auditoria
        logAuditAction(req, 'update', 'professionals', id, {
          name: updatedUser?.fullName,
          before: {
            type: existingProfessional.professionalType,
            facilityId: existingProfessional.facilityId,
            isActive: existingProfessional.isActive,
            supervisorId: existingProfessional.supervisorId
          },
          after: {
            type: updatedProfessional.professionalType,
            facilityId: updatedProfessional.facilityId,
            isActive: updatedProfessional.isActive,
            supervisorId: updatedProfessional.supervisorId
          }
        });
        
        res.json({
          ...updatedProfessional,
          user: updatedUser,
        });
      } catch (error) {
        console.error("Erro ao atualizar profissional:", error);
        
        // Verificar erros específicos
        if (error instanceof Error && error.message.includes('unique constraint')) {
          return res.status(400).json({ error: "Dados únicos duplicados, verifique licença profissional" });
        }
        
        res.status(500).json({ error: "Erro ao atualizar profissional" });
      }
    }
  );

  // Patients endpoints
  app.get(`${apiPrefix}/patients`, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const facilityIdParam = req.query.facilityId as string | undefined;
      
      // Se foi passado um facilityId, precisamos buscar os pacientes vinculados àquela unidade
      if (facilityIdParam) {
        const facilityId = parseInt(facilityIdParam);
        
        // Buscar pacientes vinculados a esta unidade usando a tabela de relacionamento
        const patientsQuery = db.select({
          patientId: patientFacilities.patientId
        })
        .from(patientFacilities)
        .where(eq(patientFacilities.facilityId, facilityId));
        
        // Converter resultado em array de IDs
        const patientFacilityRelations = await patientsQuery;
        const patientIds = patientFacilityRelations.map(p => p.patientId);
        
        // Se não houver pacientes nesta unidade, retornar lista vazia
        if (patientIds.length === 0) {
          return res.json([]);
        }
        
        // Buscar detalhes dos pacientes
        let query = db.select().from(patients).where(inArray(patients.id, patientIds));
        
        // Aplicar filtro de busca por nome se fornecido
        if (search) {
          query = query.where(ilike(patients.fullName, `%${search}%`));
        }
        
        const filteredPatients = await query.orderBy(patients.fullName);
        return res.json(filteredPatients);
      } 
      // Caso não tenha filtro por unidade, buscar todos os pacientes
      else {
        let query = db.select().from(patients);
  
        if (search) {
          query = query.where(ilike(patients.fullName, `%${search}%`));
        }
  
        const allPatients = await query.orderBy(patients.fullName);
        return res.json(allPatients);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ error: "Erro ao buscar pacientes" });
    }
  });

  app.get(`${apiPrefix}/patients/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await db.query.patients.findFirst({
        where: eq(patients.id, parseInt(id)),
        with: {
          insurancePlan: true,
          facilities: {
            with: {
              facility: true,
            },
          },
        },
      });

      if (!patient) {
        return res.status(404).json({ error: "Paciente não encontrado" });
      }

      // Get patient documents
      const patientDocuments = await db.query.documents.findMany({
        where: eq(documents.patientId, parseInt(id)),
      });

      res.json({
        ...patient,
        documents: patientDocuments,
      });
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ error: "Erro ao buscar paciente" });
    }
  });

  app.post(`${apiPrefix}/patients`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const [newPatient] = await db.insert(patients).values(req.body).returning();

      // Add patient to facilities
      if (req.body.facilityIds && Array.isArray(req.body.facilityIds)) {
        for (const facilityId of req.body.facilityIds) {
          await db.insert(patientFacilities).values({
            patientId: newPatient.id,
            facilityId: parseInt(facilityId),
          });
        }
      }

      res.status(201).json(newPatient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ error: "Erro ao criar paciente" });
    }
  });

  app.put(`${apiPrefix}/patients/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const patientId = parseInt(id);

      // Update patient data
      const [updatedPatient] = await db
        .update(patients)
        .set(req.body)
        .where(eq(patients.id, patientId))
        .returning();

      if (!updatedPatient) {
        return res.status(404).json({ error: "Paciente não encontrado" });
      }

      // Update facilities if provided
      if (req.body.facilityIds && Array.isArray(req.body.facilityIds)) {
        // Delete existing associations
        await db.delete(patientFacilities).where(eq(patientFacilities.patientId, patientId));

        // Add new associations
        for (const facilityId of req.body.facilityIds) {
          await db.insert(patientFacilities).values({
            patientId,
            facilityId: parseInt(facilityId),
          });
        }
      }

      res.json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Erro ao atualizar paciente" });
    }
  });

  // Insurance plans endpoints
  app.get(`${apiPrefix}/insurance-plans`, async (req, res) => {
    try {
      const allPlans = await db.query.insurancePlans.findMany();
      res.json(allPlans);
    } catch (error) {
      console.error("Error fetching insurance plans:", error);
      res.status(500).json({ error: "Erro ao buscar planos de saúde" });
    }
  });

  app.post(`${apiPrefix}/insurance-plans`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const [newPlan] = await db.insert(insurancePlans).values(req.body).returning();
      res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating insurance plan:", error);
      res.status(500).json({ error: "Erro ao criar plano de saúde" });
    }
  });

  // Appointments endpoints
  app.get(`${apiPrefix}/appointments`, async (req, res) => {
    try {
      const userId = req.user?.id;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const facilityId = req.query.facilityId as string | undefined;
      const professionalId = req.query.professionalId as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      const status = req.query.status as string | undefined;

      let query = db.select().from(appointments);

      // Apply filters
      if (startDate) {
        query = query.where(gte(appointments.startTime, new Date(startDate)));
      }

      if (endDate) {
        query = query.where(lte(appointments.endTime, new Date(endDate)));
      }

      if (facilityId) {
        query = query.where(eq(appointments.facilityId, parseInt(facilityId)));
      }

      if (professionalId) {
        query = query.where(eq(appointments.professionalId, parseInt(professionalId)));
      }

      if (patientId) {
        query = query.where(eq(appointments.patientId, parseInt(patientId)));
      }

      if (status && status !== "all") {
        query = query.where(eq(appointments.status, status as any));
      }

      // If not admin or coordinator, only show appointments related to the user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId as number),
        with: {
          professional: true,
        },
      });

      if (user?.role === "professional" || user?.role === "intern") {
        if (user.professional) {
          query = query.where(eq(appointments.professionalId, user.professional.id));
        }
      } else if (user?.role === "secretary") {
        if (user.facilityId) {
          query = query.where(eq(appointments.facilityId, user.facilityId));
        }
      }

      const appointmentsList = await query.orderBy(appointments.startTime);

      // Fetch related data
      const enrichedAppointments = await Promise.all(
        appointmentsList.map(async (appointment) => {
          const patient = await db.query.patients.findFirst({
            where: eq(patients.id, appointment.patientId),
          });

          const professional = await db.query.professionals.findFirst({
            where: eq(professionals.id, appointment.professionalId),
            with: {
              user: true,
            },
          });

          const room = await db.query.rooms.findFirst({
            where: eq(rooms.id, appointment.roomId),
          });

          const facility = await db.query.facilities.findFirst({
            where: eq(facilities.id, appointment.facilityId),
          });

          return {
            ...appointment,
            patient,
            professional,
            room,
            facility,
          };
        })
      );

      res.json(enrichedAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }
  });

  app.get(`${apiPrefix}/appointments/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await db.query.appointments.findFirst({
        where: eq(appointments.id, parseInt(id)),
      });

      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      const patient = await db.query.patients.findFirst({
        where: eq(patients.id, appointment.patientId),
      });

      const professional = await db.query.professionals.findFirst({
        where: eq(professionals.id, appointment.professionalId),
        with: {
          user: true,
        },
      });

      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, appointment.roomId),
      });

      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, appointment.facilityId),
      });

      res.json({
        ...appointment,
        patient,
        professional,
        room,
        facility,
      });
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Erro ao buscar agendamento" });
    }
  });

  app.post(`${apiPrefix}/appointments`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const appointmentData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const [newAppointment] = await db.insert(appointments).values(appointmentData).returning();

      // Create notification for the professional
      await db.insert(notifications).values({
        userId: await getProfessionalUserId(newAppointment.professionalId),
        title: "Novo agendamento",
        content: `Você tem um novo agendamento para ${format(new Date(newAppointment.startTime), "dd/MM/yyyy 'às' HH:mm")}`,
        type: "appointment",
        referenceId: newAppointment.id,
        referenceType: "appointment",
      });

      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  });

  app.put(`${apiPrefix}/appointments/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const appointmentId = parseInt(id);

      // Check if appointment exists
      const existingAppointment = await db.query.appointments.findFirst({
        where: eq(appointments.id, appointmentId),
      });

      if (!existingAppointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      // Status update requires professional, admin, or coordinator
      if (req.body.status) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, req.user.id),
          with: {
            professional: true,
          },
        });

        const isProfessionalOfAppointment = user?.professional?.id === existingAppointment.professionalId;
        const isAdminOrCoordinator = ["admin", "coordinator"].includes(user?.role || "");

        if (!isProfessionalOfAppointment && !isAdminOrCoordinator) {
          return res.status(403).json({ error: "Você não tem permissão para alterar o status deste agendamento" });
        }
      }

      // Full update requires admin or coordinator
      if (Object.keys(req.body).some(key => !["status", "notes"].includes(key))) {
        if (!["admin", "coordinator"].includes(req.user.role)) {
          return res.status(403).json({ error: "Apenas administradores e coordenadores podem atualizar agendamentos" });
        }
      }

      const [updatedAppointment] = await db
        .update(appointments)
        .set(req.body)
        .where(eq(appointments.id, appointmentId))
        .returning();

      // If status was updated to completed, create a notification for evolution
      if (req.body.status === "completed" && existingAppointment.status !== "completed") {
        await db.insert(notifications).values({
          userId: await getProfessionalUserId(updatedAppointment.professionalId),
          title: "Evolução pendente",
          content: "Você tem uma evolução pendente para um atendimento finalizado",
          type: "evolution_required",
          referenceId: updatedAppointment.id,
          referenceType: "appointment",
        });
      }

      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
  });

  app.delete(`${apiPrefix}/appointments/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const appointmentId = parseInt(id);

      // Check if appointment exists
      const existingAppointment = await db.query.appointments.findFirst({
        where: eq(appointments.id, appointmentId),
      });

      if (!existingAppointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      // Delete the appointment
      await db.delete(appointments).where(eq(appointments.id, appointmentId));

      res.status(200).json({ message: "Agendamento excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ error: "Erro ao excluir agendamento" });
    }
  });

  // Evolutions endpoints
  app.get(`${apiPrefix}/evolutions`, async (req, res) => {
    try {
      const userId = req.user?.id;
      const status = req.query.status as string | undefined;
      const patientId = req.query.patientId as string | undefined;

      let query = db.select().from(evolutions);

      if (status && status !== "all") {
        query = query.where(eq(evolutions.status, status as any));
      }

      // If filtering by patient, join with appointments
      if (patientId) {
        // This is a more complex query requiring a join
        // For simplicity, we'll fetch all evolutions and filter in memory
        const allEvolutions = await query;
        
        const filteredEvolutions = [];
        for (const evolution of allEvolutions) {
          const appointment = await db.query.appointments.findFirst({
            where: eq(appointments.id, evolution.appointmentId),
          });
          
          if (appointment && appointment.patientId === parseInt(patientId)) {
            filteredEvolutions.push(evolution);
          }
        }
        
        const enrichedEvolutions = await enrichEvolutions(filteredEvolutions);
        return res.json(enrichedEvolutions);
      }

      // Role-based filtering
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId as number),
        with: {
          professional: true,
        },
      });

      if (user?.role === "professional" || user?.role === "intern") {
        if (user.professional) {
          query = query.where(
            or(
              eq(evolutions.professionalId, user.professional.id),
              eq(evolutions.supervisorId, user.professional.id)
            )
          );
        }
      }

      const evolutionsList = await query.orderBy(desc(evolutions.createdAt));
      const enrichedEvolutions = await enrichEvolutions(evolutionsList);

      res.json(enrichedEvolutions);
    } catch (error) {
      console.error("Error fetching evolutions:", error);
      res.status(500).json({ error: "Erro ao buscar evoluções" });
    }
  });

  app.get(`${apiPrefix}/appointments/:id/evolutions`, async (req, res) => {
    try {
      const { id } = req.params;
      const appointmentEvolutions = await db.query.evolutions.findMany({
        where: eq(evolutions.appointmentId, parseInt(id)),
        orderBy: desc(evolutions.createdAt),
      });

      const enrichedEvolutions = await enrichEvolutions(appointmentEvolutions);
      res.json(enrichedEvolutions);
    } catch (error) {
      console.error("Error fetching appointment evolutions:", error);
      res.status(500).json({ error: "Erro ao buscar evoluções do atendimento" });
    }
  });

  app.post(`${apiPrefix}/evolutions`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !["professional", "intern", "admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        with: {
          professional: true,
        },
      });

      if (!user?.professional) {
        return res.status(403).json({ error: "Apenas profissionais podem criar evoluções" });
      }

      // For interns, evolutions require supervisor approval
      let evolutionStatus = "completed";
      if (user.role === "intern") {
        evolutionStatus = "pending";
      }

      const evolutionData = {
        ...req.body,
        professionalId: user.professional.id,
        status: evolutionStatus,
      };

      const [newEvolution] = await db.insert(evolutions).values(evolutionData).returning();

      // If intern, notify supervisor
      if (user.role === "intern" && user.professional.supervisorId) {
        await db.insert(notifications).values({
          userId: await getProfessionalUserId(user.professional.supervisorId),
          title: "Evolução para aprovar",
          content: "Um estagiário enviou uma evolução para sua aprovação",
          type: "evolution_approval",
          referenceId: newEvolution.id,
          referenceType: "evolution",
        });
      }

      // Update appointment status if it was not completed
      const appointment = await db.query.appointments.findFirst({
        where: eq(appointments.id, newEvolution.appointmentId),
      });

      if (appointment && appointment.status !== "completed") {
        await db.update(appointments)
          .set({ status: "completed" })
          .where(eq(appointments.id, appointment.id));
      }

      res.status(201).json(newEvolution);
    } catch (error) {
      console.error("Error creating evolution:", error);
      res.status(500).json({ error: "Erro ao criar evolução" });
    }
  });

  app.put(`${apiPrefix}/evolutions/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const evolutionId = parseInt(id);

      // Check if evolution exists
      const existingEvolution = await db.query.evolutions.findFirst({
        where: eq(evolutions.id, evolutionId),
      });

      if (!existingEvolution) {
        return res.status(404).json({ error: "Evolução não encontrada" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
        with: {
          professional: true,
        },
      });

      // Authorization checks
      const isAuthor = user?.professional?.id === existingEvolution.professionalId;
      const isSupervisor = user?.professional?.id === existingEvolution.supervisorId;
      const isAdminOrCoordinator = ["admin", "coordinator"].includes(user?.role || "");

      // Status updates can only be done by supervisors or admins
      if (req.body.status && !isSupervisor && !isAdminOrCoordinator) {
        return res.status(403).json({ error: "Apenas supervisores podem alterar o status da evolução" });
      }

      // Content updates can only be done by the author or admins
      if (req.body.content && !isAuthor && !isAdminOrCoordinator) {
        return res.status(403).json({ error: "Apenas o autor pode editar o conteúdo da evolução" });
      }

      // Supervisor notes can only be added by supervisors or admins
      if (req.body.supervisorNotes && !isSupervisor && !isAdminOrCoordinator) {
        return res.status(403).json({ error: "Apenas supervisores podem adicionar notas de supervisão" });
      }

      const [updatedEvolution] = await db
        .update(evolutions)
        .set(req.body)
        .where(eq(evolutions.id, evolutionId))
        .returning();

      // If status was updated by supervisor, notify author
      if (
        req.body.status &&
        req.body.status !== existingEvolution.status &&
        (req.body.status === "approved" || req.body.status === "rejected")
      ) {
        const authorUserId = await getProfessionalUserId(existingEvolution.professionalId);
        
        await db.insert(notifications).values({
          userId: authorUserId,
          title: req.body.status === "approved" ? "Evolução aprovada" : "Evolução rejeitada",
          content: req.body.status === "approved" 
            ? "Sua evolução foi aprovada pelo supervisor" 
            : "Sua evolução foi rejeitada pelo supervisor e precisa de revisão",
          type: "evolution_status",
          referenceId: updatedEvolution.id,
          referenceType: "evolution",
        });
      }

      res.json(updatedEvolution);
    } catch (error) {
      console.error("Error updating evolution:", error);
      res.status(500).json({ error: "Erro ao atualizar evolução" });
    }
  });

  // Documents endpoints
  app.get(`${apiPrefix}/documents`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      // Extrair parâmetros de consulta
      const { 
        patientId, 
        facilityId, 
        evolutionId, 
        appointmentId, 
        category, 
        status,
        onlyLatestVersions,
        includeUploaderInfo,
        search
      } = req.query;

      // Construir a consulta base selecionando campos específicos existentes no banco
      let query = db.select({
        id: documents.id,
        name: documents.name,
        fileUrl: documents.fileUrl,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        category: documents.category,
        status: documents.status,
        patientId: documents.patientId,
        facilityId: documents.facilityId,
        evolutionId: documents.evolutionId,
        appointmentId: documents.appointmentId,
        uploadedBy: documents.uploadedBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        version: documents.version,
        description: documents.description
      }).from(documents);
      
      // Aplicar filtros conforme necessário
      if (patientId) {
        query = query.where(eq(documents.patientId, Number(patientId)));
      }
      
      if (facilityId) {
        query = query.where(eq(documents.facilityId, Number(facilityId)));
      }
      
      if (evolutionId) {
        query = query.where(eq(documents.evolutionId, Number(evolutionId)));
      }
      
      if (appointmentId) {
        query = query.where(eq(documents.appointmentId, Number(appointmentId)));
      }
      
      if (category && category !== 'all') {
        query = query.where(eq(documents.category, String(category)));
      }
      
      if (status && status !== 'all') {
        query = query.where(eq(documents.status, String(status)));
      }
      
      // Opção onlyLatestVersions ignorada pois parentDocumentId não existe mais
      // Se o campo parentDocumentId for implementado no futuro, a lógica pode ser restaurada
      // if (onlyLatestVersions === 'true') {
      //   query = query.where(isNull(documents.parentDocumentId));
      // }
      
      // Se houver uma pesquisa, aplicar à descrição e nome
      if (search) {
        const searchTerm = `%${search}%`;
        query = query.where(
          ilike(documents.name, searchTerm)
        );
      }
      
      // Ordenar por data de criação (mais recentes primeiro)
      query = query.orderBy(desc(documents.createdAt));
      
      // Executar a consulta
      const documentsList = await query;
      
      // Se solicitado, incluir informações do uploader
      if (includeUploaderInfo === 'true') {
        const userIds = [...new Set(documentsList.map(doc => doc.uploadedBy))];
        // Renomeando para uploaders para evitar conflito de escopo
        const uploaders = await db.query.users.findMany({
          where: inArray(users.id, userIds),
          columns: {
            id: true,
            username: true,
            name: true,
            role: true
          }
        });
        
        const usersMap = uploaders.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<number, typeof uploaders[number]>);
        
        // Combinar informações de documentos e usuários
        const documentsWithUploader = documentsList.map(doc => ({
          ...doc,
          uploader: usersMap[doc.uploadedBy] || null
        }));
        
        res.json(documentsWithUploader);
      } else {
        res.json(documentsList);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  });
  
  app.get(`${apiPrefix}/documents/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      
      const documentId = Number(req.params.id);
      // Removida a relação 'versions' pois depende do campo parentDocumentId que não existe
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, documentId),
        with: {
          uploader: {
            columns: {
              id: true,
              username: true,
              name: true,
              role: true
            }
          },
          patient: true,
          facility: true,
          evolution: true,
          appointment: true
        }
      });
      
      if (!document) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Erro ao buscar documento" });
    }
  });
  
  app.put(`${apiPrefix}/documents/:id/sign`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      
      const documentId = Number(req.params.id);
      const document = await db.query.documents.findFirst({
        where: eq(documents.id, documentId)
      });
      
      if (!document) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      
      if (document.status === 'signed') {
        return res.status(400).json({ error: "Documento já foi assinado" });
      }
      
      // Removida verificação de needsSignature pois o campo não existe no banco de dados
      
      const [signedDocument] = await db.update(documents)
        .set({
          status: 'signed',
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId))
        .returning();
      
      res.json(signedDocument);
    } catch (error) {
      console.error("Error signing document:", error);
      res.status(500).json({ error: "Erro ao assinar documento" });
    }
  });
  
  app.post(`${apiPrefix}/documents/upload`, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const { 
        patientId, 
        facilityId, 
        evolutionId, 
        appointmentId, 
        name, 
        description, 
        category, 
        status,
        needsSignature
        // parentDocumentId foi removido pois não existe no banco
      } = req.body;

      // Validate at least one association is provided
      if (!patientId && !facilityId && !evolutionId && !appointmentId) {
        return res.status(400).json({ 
          error: "É necessário associar o documento a um paciente, unidade, evolução ou consulta" 
        });
      }

      // Versão simplificada sem suporte a parentDocumentId
      let version = 1;
      // Não temos mais o conceito de versões baseado em parentDocumentId

      // Removidos os campos não existentes no banco: needsSignature e parentDocumentId
      const documentData = {
        name: name || req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        description: description || null,
        category: category || 'other',
        status: status || 'active',
        patientId: patientId ? parseInt(patientId) : null,
        facilityId: facilityId ? parseInt(facilityId) : null,
        evolutionId: evolutionId ? parseInt(evolutionId) : null,
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        uploadedBy: req.user.id,
        version: version,
        updatedAt: new Date()
      };

      const [newDocument] = await db.insert(documents).values(documentData).returning();
      
      // Se o documento precisa de assinatura (baseado no parâmetro), criar notificação
      // Mesmo que o campo needsSignature não exista no banco, usamos a variável para decidir
      if (needsSignature === 'true' || needsSignature === true) {
        // Determine who should receive the notification
        let recipientId;
        
        if (evolutionId) {
          // For evolution documents, notify the supervisor or professional
          const evolution = await db.query.evolutions.findFirst({
            where: eq(evolutions.id, parseInt(evolutionId))
          });
          
          if (evolution && evolution.supervisorId) {
            recipientId = evolution.supervisorId;
          } else if (evolution) {
            recipientId = evolution.professionalId;
          }
        } else if (patientId) {
          // For patient documents without a specific evolution, notify facility coordinators
          const patient = await db.query.patients.findFirst({
            where: eq(patients.id, parseInt(patientId))
          });
          
          if (patient) {
            // Find coordinators (simplified - in a real scenario you'd look for associated professionals)
            const coordinator = await db.query.users.findFirst({
              where: eq(users.role, 'coordinator')
            });
            
            if (coordinator) {
              recipientId = coordinator.id;
            }
          }
        }
        
        // Create notification if we found someone to notify
        if (recipientId) {
          await db.insert(notifications).values({
            userId: recipientId,
            title: "Documento requer assinatura",
            content: `O documento "${documentData.name}" requer sua assinatura.`,
            type: "document",
            referenceId: newDocument.id,
            referenceType: "document"
          });
        }
      }
      
      res.status(201).json(newDocument);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ error: "Erro ao fazer upload do documento" });
    }
  });

  // Endpoint para listar documentos
  app.get(`${apiPrefix}/documents`, async (req, res) => {
    try {
      const patientId = req.query.patientId as string | undefined;
      const facilityId = req.query.facilityId as string | undefined;
      const evolutionId = req.query.evolutionId as string | undefined;
      const appointmentId = req.query.appointmentId as string | undefined;
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      const needsSignature = req.query.needsSignature as string | undefined;
      const onlyLatestVersions = req.query.onlyLatestVersions === 'true';
      const includeUploaderInfo = req.query.includeUploaderInfo === 'true';

      // Start with a query builder selecionando campos específicos existentes no banco
      let query = db.select({
        id: documents.id,
        name: documents.name,
        fileUrl: documents.fileUrl,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        category: documents.category,
        status: documents.status,
        patientId: documents.patientId,
        facilityId: documents.facilityId,
        evolutionId: documents.evolutionId,
        appointmentId: documents.appointmentId,
        uploadedBy: documents.uploadedBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        version: documents.version,
        description: documents.description
      }).from(documents);

      // Apply filters
      const conditions = [];

      if (patientId) {
        conditions.push(eq(documents.patientId, parseInt(patientId)));
      }

      if (facilityId) {
        conditions.push(eq(documents.facilityId, parseInt(facilityId)));
      }

      if (evolutionId) {
        conditions.push(eq(documents.evolutionId, parseInt(evolutionId)));
      }

      if (appointmentId) {
        conditions.push(eq(documents.appointmentId, parseInt(appointmentId)));
      }

      if (category) {
        conditions.push(eq(documents.category, category));
      }

      if (status) {
        conditions.push(eq(documents.status, status));
      }

      // Removendo filtros parentDocumentId e needsSignature pois esses campos não existem no banco
      
      // Nota: Não temos mais o conceito de versões no sistema, então a opção onlyLatestVersions
      // não faz mais sentido. Mantemos apenas para compatibilidade com o frontend existente.

      // Apply all conditions if any exist
      if (conditions.length > 0) {
        if (conditions.length === 1) {
          query = query.where(conditions[0]);
        } else {
          query = query.where(and(...conditions));
        }
      }

      let documentsList = await query.orderBy(desc(documents.createdAt));

      // If we need to include uploader information, fetch that separately
      if (includeUploaderInfo && documentsList.length > 0) {
        const uploaderIds = [...new Set(documentsList.map(doc => doc.uploadedBy))];
        
        const uploaders = await db.query.users.findMany({
          where: inArray(users.id, uploaderIds as number[]),
          columns: {
            id: true,
            name: true,
            username: true,
            role: true
          }
        });
        
        const uploadersMap = new Map();
        uploaders.forEach(uploader => {
          uploadersMap.set(uploader.id, uploader);
        });
        
        // Attach uploader info to each document
        documentsList = documentsList.map(doc => ({
          ...doc,
          uploader: uploadersMap.get(doc.uploadedBy) || null
        }));
      }

      res.json(documentsList);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  });

  // Chat endpoints
  app.get(`${apiPrefix}/chat/messages`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const otherUserId = req.query.userId as string | undefined;
      const groupId = req.query.groupId as string | undefined;

      if (!otherUserId && !groupId) {
        return res.status(400).json({ error: "É necessário especificar um usuário ou grupo" });
      }

      let messages;
      if (otherUserId) {
        messages = await db.query.chatMessages.findMany({
          where: or(
            and(
              eq(chatMessages.senderId, req.user.id),
              eq(chatMessages.recipientId, parseInt(otherUserId))
            ),
            and(
              eq(chatMessages.senderId, parseInt(otherUserId)),
              eq(chatMessages.recipientId, req.user.id)
            )
          ),
          orderBy: chatMessages.createdAt,
        });
      } else if (groupId) {
        // Check if user is a member of the group
        const isMember = await db.query.chatGroupMembers.findFirst({
          where: and(
            eq(chatGroupMembers.groupId, parseInt(groupId)),
            eq(chatGroupMembers.userId, req.user.id)
          ),
        });

        if (!isMember) {
          return res.status(403).json({ error: "Você não é membro deste grupo" });
        }

        messages = await db.query.chatMessages.findMany({
          where: eq(chatMessages.groupId, parseInt(groupId)),
          orderBy: chatMessages.createdAt,
        });
      }

      // Mark messages as read
      if (messages?.length) {
        await db.update(chatMessages)
          .set({ isRead: true })
          .where(
            and(
              eq(chatMessages.recipientId, req.user.id),
              eq(chatMessages.isRead, false)
            )
          );
      }

      res.json(messages || []);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  app.get(`${apiPrefix}/chat/groups`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      // Get all groups the user is a member of
      const userGroups = await db.query.chatGroupMembers.findMany({
        where: eq(chatGroupMembers.userId, req.user.id),
        with: {
          group: true,
        },
      });

      res.json(userGroups.map(membership => membership.group));
    } catch (error) {
      console.error("Error fetching chat groups:", error);
      res.status(500).json({ error: "Erro ao buscar grupos de chat" });
    }
  });

  app.post(`${apiPrefix}/chat/groups`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { name, memberIds } = req.body;

      if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "Nome e membros são obrigatórios" });
      }

      // Create group
      const [newGroup] = await db.insert(chatGroups).values({
        name,
        createdById: req.user.id,
      }).returning();

      // Add creator as member
      await db.insert(chatGroupMembers).values({
        groupId: newGroup.id,
        userId: req.user.id,
      });

      // Add members
      for (const memberId of memberIds) {
        if (memberId !== req.user.id) {
          await db.insert(chatGroupMembers).values({
            groupId: newGroup.id,
            userId: parseInt(memberId),
          });

          // Notify members
          await db.insert(notifications).values({
            userId: parseInt(memberId),
            title: "Novo grupo de chat",
            content: `Você foi adicionado ao grupo "${newGroup.name}"`,
            type: "group_added",
            referenceId: newGroup.id,
            referenceType: "chat_group",
          });
        }
      }

      res.status(201).json(newGroup);
    } catch (error) {
      console.error("Error creating chat group:", error);
      res.status(500).json({ error: "Erro ao criar grupo de chat" });
    }
  });

  // Notifications endpoints
  app.get(`${apiPrefix}/notifications`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, req.user.id),
        orderBy: desc(notifications.createdAt),
      });

      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Erro ao buscar notificações" });
    }
  });

  app.put(`${apiPrefix}/notifications/:id/read`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const notificationId = parseInt(id);

      // Check if notification belongs to user
      const notification = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, req.user.id)
        ),
      });

      if (!notification) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }

      const [updatedNotification] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId))
        .returning();

      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Erro ao marcar notificação como lida" });
    }
  });

  app.put(`${apiPrefix}/notifications/read-all`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, req.user.id),
          eq(notifications.isRead, false)
        ));

      res.json({ message: "Todas as notificações marcadas como lidas" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Erro ao marcar todas as notificações como lidas" });
    }
  });

  // Reports endpoints
  // Metadata para logs de auditoria - nomes dos recursos e tipos de ação
  app.get(`${apiPrefix}/audit-logs/metadata`, checkPermission('users', 'read'), async (req, res) => {
    try {
      // Verificar se é admin (dupla camada de segurança)
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem acessar metadados de logs." });
      }
      
      // Retornar mapeamentos de traduções
      res.json({
        resourceTranslations: Object.entries(resourceTranslations).map(([key, value]) => ({
          key,
          text: value
        })),
        actionTranslations: Object.entries(actionTranslations).map(([key, value]) => ({
          key,
          text: value
        }))
      });
    } catch (error) {
      console.error("Erro ao buscar metadados de logs de auditoria:", error);
      res.status(500).json({ error: "Erro ao buscar metadados de logs de auditoria" });
    }
  });

  // Endpoint para adicionar log de auditoria manualmente
  app.post(`${apiPrefix}/audit-logs`, checkPermission('users', 'create'), async (req, res) => {
    try {
      // Verificar se é admin ou coordenador
      if (!['admin', 'coordinator'].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores e coordenadores podem criar logs de auditoria manual." });
      }
      
      const userId = req.body.userId || req.user.id;
      const action = req.body.action;
      const resource = req.body.resource;
      const resourceId = req.body.resourceId;
      const details = req.body.details || {};
      
      // Validar campos obrigatórios
      if (!action || !resource) {
        return res.status(400).json({ error: "Campos obrigatórios: action, resource" });
      }
      
      // Criar registro de auditoria
      const [newLog] = await db.insert(auditLogs).values({
        userId,
        action,
        resource,
        resourceId: resourceId ? parseInt(resourceId) : null,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: JSON.stringify(details)
      }).returning();
      
      res.status(201).json({
        id: newLog.id,
        message: "Log de auditoria criado com sucesso",
        timestamp: newLog.timestamp
      });
    } catch (error) {
      console.error("Erro ao criar log de auditoria manual:", error);
      res.status(500).json({ error: "Erro ao criar log de auditoria" });
    }
  });

  // Audit Logs - Acessível apenas por admin
  app.get(`${apiPrefix}/audit-logs`, checkPermission('users', 'read'), async (req, res) => {
    try {
      // Verificar se é admin (dupla camada de segurança)
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem ver logs de auditoria." });
      }
      
      // Parâmetros opcionais de filtro
      const { userId, resource, action, startDate, endDate, page = '1', pageSize = '20' } = req.query;
      
      const pageNumber = parseInt(page as string);
      const limit = parseInt(pageSize as string);
      const offset = (pageNumber - 1) * limit;
      
      // Consulta base
      let query = db.select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resource: auditLogs.resource,
        resourceId: auditLogs.resourceId,
        ipAddress: auditLogs.ipAddress,
        timestamp: auditLogs.timestamp,
        userAgent: auditLogs.userAgent,
        details: auditLogs.details,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role
        }
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.timestamp));
      
      // Consulta para contagem total com os mesmos filtros
      let countQuery = db.select({
        count: sql`count(*)`
      })
      .from(auditLogs);
      
      // Adicionar filtros condicionais
      if (userId) {
        const userIdInt = parseInt(userId as string);
        query = query.where(eq(auditLogs.userId, userIdInt));
        countQuery = countQuery.where(eq(auditLogs.userId, userIdInt));
      }
      
      if (resource) {
        query = query.where(eq(auditLogs.resource, resource as string));
        countQuery = countQuery.where(eq(auditLogs.resource, resource as string));
      }
      
      if (action) {
        query = query.where(eq(auditLogs.action, action as string));
        countQuery = countQuery.where(eq(auditLogs.action, action as string));
      }
      
      if (startDate) {
        const start = new Date(startDate as string);
        query = query.where(gte(auditLogs.timestamp, start));
        countQuery = countQuery.where(gte(auditLogs.timestamp, start));
      }
      
      if (endDate) {
        const end = new Date(endDate as string);
        query = query.where(lte(auditLogs.timestamp, end));
        countQuery = countQuery.where(lte(auditLogs.timestamp, end));
      }
      
      // Adicionar paginação
      query = query.limit(limit).offset(offset);
      
      // Executar consultas
      const logs = await query;
      const [totalResult] = await countQuery;
      const totalLogs = Number(totalResult?.count || '0');
      
      // Adicionar traduções para facilitar exibição no frontend
      const logsWithTranslations = logs.map(log => ({
        ...log,
        resourceText: getResourceText(log.resource),
        actionText: getActionText(log.action),
      }));
      
      res.json({
        logs: logsWithTranslations,
        pagination: {
          page: pageNumber,
          pageSize: limit,
          totalCount: totalLogs,
          totalPages: Math.ceil(totalLogs / limit)
        }
      });
    } catch (error) {
      console.error("Erro ao buscar logs de auditoria:", error);
      res.status(500).json({ error: "Erro ao buscar logs de auditoria" });
    }
  });

  app.get(`${apiPrefix}/reports/professionals-hours`, checkPermission('reports', 'read'), async (req, res) => {
    try {

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const facilityId = req.query.facilityId as string;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Datas de início e fim são obrigatórias" });
      }

      let query = db.select({
        professionalId: appointments.professionalId,
        totalHours: sql`SUM(EXTRACT(EPOCH FROM (${appointments.endTime} - ${appointments.startTime})) / 3600)`,
        planningHours: sql`SUM(CASE WHEN ${appointments.procedureType} = 'planning' THEN EXTRACT(EPOCH FROM (${appointments.endTime} - ${appointments.startTime})) / 3600 ELSE 0 END)`,
        freeTimeHours: sql`SUM(CASE WHEN ${appointments.procedureType} = 'free_time' THEN EXTRACT(EPOCH FROM (${appointments.endTime} - ${appointments.startTime})) / 3600 ELSE 0 END)`,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, new Date(startDate)),
          lte(appointments.endTime, new Date(endDate))
        )
      )
      .groupBy(appointments.professionalId);

      if (facilityId) {
        query = query.where(eq(appointments.facilityId, parseInt(facilityId)));
      }

      const result = await query;

      // Enrich with professional details
      const enrichedResult = await Promise.all(
        result.map(async (item) => {
          const professional = await db.query.professionals.findFirst({
            where: eq(professionals.id, item.professionalId),
            with: {
              user: true,
            },
          });

          return {
            ...item,
            professional,
          };
        })
      );

      res.json(enrichedResult);
    } catch (error) {
      console.error("Error generating professionals hours report:", error);
      res.status(500).json({ error: "Erro ao gerar relatório de horas dos profissionais" });
    }
  });

  app.get(`${apiPrefix}/reports/appointments-by-procedure`, checkPermission('reports', 'read'), async (req, res) => {
    try {

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const facilityId = req.query.facilityId as string;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Datas de início e fim são obrigatórias" });
      }

      let query = db.select({
        procedureType: appointments.procedureType,
        count: sql`COUNT(*)`,
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, new Date(startDate)),
          lte(appointments.endTime, new Date(endDate))
        )
      )
      .groupBy(appointments.procedureType);

      if (facilityId) {
        query = query.where(eq(appointments.facilityId, parseInt(facilityId)));
      }

      const result = await query;
      res.json(result);
    } catch (error) {
      console.error("Error generating appointments by procedure report:", error);
      res.status(500).json({ error: "Erro ao gerar relatório de atendimentos por procedimento" });
    }
  });

  app.get(`${apiPrefix}/reports/patients-by-facility`, checkPermission('reports', 'read'), async (req, res) => {
    try {

      const query = db.select({
        facilityId: patientFacilities.facilityId,
        count: sql`COUNT(*)`,
      })
      .from(patientFacilities)
      .groupBy(patientFacilities.facilityId);

      const result = await query;

      // Enrich with facility details
      const enrichedResult = await Promise.all(
        result.map(async (item) => {
          const facility = await db.query.facilities.findFirst({
            where: eq(facilities.id, item.facilityId),
          });

          return {
            ...item,
            facility,
          };
        })
      );

      res.json(enrichedResult);
    } catch (error) {
      console.error("Error generating patients by facility report:", error);
      res.status(500).json({ error: "Erro ao gerar relatório de pacientes por unidade" });
    }
  });
  
  // Relatório de atendimentos por período
  app.get(`${apiPrefix}/reports/appointments-by-period`, checkPermission('reports', 'read'), async (req, res) => {
    try {
      
      const { startDate, endDate, facilityId, period = 'month' } = req.query;
      
      // Validar parâmetros
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Datas de início e fim são obrigatórias" });
      }
      
      let periodFormat: string;
      let periodName: string;
      
      switch(String(period).toLowerCase()) {
        case 'day':
          periodFormat = 'YYYY-MM-DD';
          periodName = 'dia';
          break;
        case 'week':
          periodFormat = 'YYYY-"W"WW';
          periodName = 'semana';
          break;
        case 'month':
          periodFormat = 'YYYY-MM';
          periodName = 'mês';
          break;
        case 'quarter':
          periodFormat = 'YYYY-"Q"Q';
          periodName = 'trimestre';
          break;
        case 'year':
          periodFormat = 'YYYY';
          periodName = 'ano';
          break;
        default:
          periodFormat = 'YYYY-MM';
          periodName = 'mês';
      }
      
      // Consulta base usando SQL bruto devido à complexidade
      let query = sql`
        SELECT 
          TO_CHAR(start_time, ${periodFormat}) as period,
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'completed' OR status = 'attended' THEN 1 END) as completed_appointments,
          COUNT(CASE WHEN status = 'cancelled' OR status = 'no_show' THEN 1 END) as cancelled_appointments,
          ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 1) as avg_duration_hours
        FROM 
          appointments
        WHERE 
          start_time >= ${String(startDate)}
          AND end_time <= ${String(endDate)}
      `;
      
      // Adicionar filtro de unidade se fornecido
      if (facilityId) {
        query = sql`
          ${query}
          AND facility_id = ${Number(facilityId)}
        `;
      }
      
      // Agrupar e ordenar
      query = sql`
        ${query}
        GROUP BY period
        ORDER BY period
      `;
      
      const result = await db.execute(query);
      
      // Formatar para o frontend
      const formattedResult = result.map((row: any) => ({
        period: row.period,
        periodName: String(periodName),
        totalAppointments: parseInt(row.total_appointments),
        completedAppointments: parseInt(row.completed_appointments),
        cancelledAppointments: parseInt(row.cancelled_appointments),
        avgDurationHours: parseFloat(row.avg_duration_hours || '0'),
        completionRate: Math.round((parseInt(row.completed_appointments) / parseInt(row.total_appointments)) * 100)
      }));
      
      res.json(formattedResult);
    } catch (error) {
      console.error("Error fetching appointments by period report:", error);
      res.status(500).json({ error: "Erro ao gerar relatório de atendimentos por período" });
    }
  });
  
  // Relatório de evolução de pacientes ao longo do tempo
  app.get(`${apiPrefix}/reports/patient-evolution-over-time`, checkPermission('reports', 'read'), async (req, res) => {
    try {
      
      const { patientId, startDate, endDate, professionalId } = req.query;
      
      // Validar parâmetros
      if (!patientId) {
        return res.status(400).json({ error: "ID do paciente é obrigatório" });
      }
      
      // Consulta base - obtendo evoluções ordenadas por data
      let query = sql`
        SELECT 
          e.id,
          e.appointment_id,
          e.patient_id,
          e.professional_id,
          e.date,
          e.content,
          e.created_at,
          e.updated_at,
          e.status,
          COALESCE(e.progress_level, 0) as progress_level,
          p.full_name as professional_name,
          pt.full_name as patient_name,
          a.procedure_type
        FROM 
          evolutions e
        JOIN
          professionals pr ON e.professional_id = pr.id
        JOIN
          users p ON pr.user_id = p.id
        JOIN
          patients pt ON e.patient_id = pt.id
        LEFT JOIN
          appointments a ON e.appointment_id = a.id
        WHERE 
          e.patient_id = ${Number(patientId)}
      `;
      
      // Adicionar filtros opcionais
      if (startDate) {
        query = sql`${query} AND e.date >= ${String(startDate)}`;
      }
      
      if (endDate) {
        query = sql`${query} AND e.date <= ${String(endDate)}`;
      }
      
      if (professionalId) {
        query = sql`${query} AND e.professional_id = ${Number(professionalId)}`;
      }
      
      // Ordenar por data
      query = sql`
        ${query}
        ORDER BY e.date ASC
      `;
      
      const evolutions = await db.execute(query);
      
      // Agrupar evoluções por mês para análise de tendências
      const monthlyStats = {};
      
      evolutions.forEach((evolution: any) => {
        const monthYear = new Date(evolution.date).toISOString().substring(0, 7); // formato: YYYY-MM
        
        if (!monthlyStats[monthYear]) {
          monthlyStats[monthYear] = {
            month: monthYear,
            count: 0,
            averageProgress: 0,
            totalProgress: 0,
            byProcedureType: {}
          };
        }
        
        const stats = monthlyStats[monthYear];
        stats.count++;
        
        // Acumular progresso se disponível
        if (evolution.progress_level !== null && evolution.progress_level !== undefined) {
          stats.totalProgress += parseInt(evolution.progress_level);
        }
        
        // Agrupar por tipo de procedimento
        if (evolution.procedure_type) {
          if (!stats.byProcedureType[evolution.procedure_type]) {
            stats.byProcedureType[evolution.procedure_type] = {
              count: 0,
              name: getProcedureTypeText(evolution.procedure_type)
            };
          }
          stats.byProcedureType[evolution.procedure_type].count++;
        }
      });
      
      // Calcular médias e formatar resultado final
      const monthlyData = Object.values(monthlyStats).map((month: any) => {
        if (month.count > 0) {
          month.averageProgress = Math.round(month.totalProgress / month.count);
        }
        
        // Converter byProcedureType para array
        month.procedureTypes = Object.values(month.byProcedureType);
        delete month.byProcedureType;
        delete month.totalProgress;
        
        return month;
      });
      
      // Obter informações do paciente
      const patientInfo = evolutions.length > 0 ? {
        id: Number(patientId),
        name: evolutions[0].patient_name
      } : null;
      
      res.json({
        patient: patientInfo,
        evolutions: evolutions.map((e: any) => ({
          id: e.id,
          date: e.date,
          content: e.content,
          professionalName: e.professional_name,
          procedureType: e.procedure_type,
          progressLevel: e.progress_level !== null ? parseInt(e.progress_level) : null,
          status: e.status
        })),
        monthlyStats: monthlyData
      });
    } catch (error) {
      console.error("Error fetching patient evolution report:", error);
      res.status(500).json({ error: "Erro ao gerar relatório de evolução do paciente" });
    }
  });

  // Helper functions
  function getProcedureTypeText(procedureType: string): string {
    const procedureMap: Record<string, string> = {
      individual_consultation: "Consulta Individual",
      group_consultation: "Consulta em Grupo",
      evaluation: "Avaliação",
      reassessment: "Reavaliação",
      home_visit: "Visita Domiciliar",
      school_visit: "Visita Escolar",
      supervision: "Supervisão",
      team_meeting: "Reunião de Equipe",
      other: "Outro"
    };
    
    return procedureMap[procedureType] || procedureType;
  }
  
  async function getProfessionalUserId(professionalId: number): Promise<number> {
    const professional = await db.query.professionals.findFirst({
      where: eq(professionals.id, professionalId),
    });
    return professional?.userId || 0;
  }

  async function enrichEvolutions(evolutionsList: any[]) {
    return Promise.all(
      evolutionsList.map(async (evolution) => {
        const appointment = await db.query.appointments.findFirst({
          where: eq(appointments.id, evolution.appointmentId),
        });

        const professional = await db.query.professionals.findFirst({
          where: eq(professionals.id, evolution.professionalId),
          with: {
            user: true,
          },
        });

        const supervisor = evolution.supervisorId
          ? await db.query.professionals.findFirst({
              where: eq(professionals.id, evolution.supervisorId),
              with: {
                user: true,
              },
            })
          : null;

        let patient = null;
        if (appointment) {
          patient = await db.query.patients.findFirst({
            where: eq(patients.id, appointment.patientId),
          });
        }

        return {
          ...evolution,
          appointment,
          professional,
          supervisor,
          patient,
        };
      })
    );
  }

  // Static files for uploaded documents
  app.use("/uploads", express.static(uploadDir));

  return httpServer;
}
