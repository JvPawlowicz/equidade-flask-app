import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import WebSocket, { WebSocketServer } from "ws";
import { db } from "@db";
import {
  appointments,
  appointmentStatusEnum,
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
} from "@shared/schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, not, notExists, or, sql } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { format } from "date-fns";

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

  // Rota para listar todos os usuários
  app.get(`${apiPrefix}/users`, async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    try {
      const allUsers = await db.query.users.findMany();
      res.json(allUsers);
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
  app.get(`${apiPrefix}/facilities`, async (req, res) => {
    try {
      const allFacilities = await db.query.facilities.findMany();
      res.json(allFacilities);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      res.status(500).json({ error: "Erro ao buscar unidades" });
    }
  });

  app.get(`${apiPrefix}/facilities/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const facility = await db.query.facilities.findFirst({
        where: eq(facilities.id, parseInt(id)),
        with: {
          rooms: true,
        },
      });

      if (!facility) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }

      res.json(facility);
    } catch (error) {
      console.error("Error fetching facility:", error);
      res.status(500).json({ error: "Erro ao buscar unidade" });
    }
  });

  app.post(`${apiPrefix}/facilities`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const [newFacility] = await db.insert(facilities).values(req.body).returning();
      res.status(201).json(newFacility);
    } catch (error) {
      console.error("Error creating facility:", error);
      res.status(500).json({ error: "Erro ao criar unidade" });
    }
  });

  app.put(`${apiPrefix}/facilities/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const [updatedFacility] = await db
        .update(facilities)
        .set(req.body)
        .where(eq(facilities.id, parseInt(id)))
        .returning();

      if (!updatedFacility) {
        return res.status(404).json({ error: "Unidade não encontrada" });
      }

      res.json(updatedFacility);
    } catch (error) {
      console.error("Error updating facility:", error);
      res.status(500).json({ error: "Erro ao atualizar unidade" });
    }
  });

  // Rooms endpoints
  app.get(`${apiPrefix}/facilities/:facilityId/rooms`, async (req, res) => {
    try {
      const { facilityId } = req.params;
      const facilityRooms = await db.query.rooms.findMany({
        where: eq(rooms.facilityId, parseInt(facilityId)),
      });
      res.json(facilityRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ error: "Erro ao buscar salas" });
    }
  });

  app.post(`${apiPrefix}/rooms`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const [newRoom] = await db.insert(rooms).values(req.body).returning();
      res.status(201).json(newRoom);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Erro ao criar sala" });
    }
  });

  // Professionals endpoints
  app.get(`${apiPrefix}/professionals`, async (req, res) => {
    try {
      const allProfessionals = await db.query.professionals.findMany({
        with: {
          user: true,
        },
      });
      res.json(allProfessionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ error: "Erro ao buscar profissionais" });
    }
  });

  app.get(`${apiPrefix}/professionals/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const professional = await db.query.professionals.findFirst({
        where: eq(professionals.id, parseInt(id)),
        with: {
          user: true,
          interns: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      res.json(professional);
    } catch (error) {
      console.error("Error fetching professional:", error);
      res.status(500).json({ error: "Erro ao buscar profissional" });
    }
  });
  
  // Professional statistics
  app.get(`${apiPrefix}/professionals/:id/stats`, async (req, res) => {
    try {
      const { id } = req.params;
      const professionalId = parseInt(id);
      
      // Get current month start and end dates
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Count appointments for this month
      const appointmentsQuery = await db.query.appointments.findMany({
        where: and(
          eq(appointments.professionalId, professionalId),
          gte(appointments.startTime, firstDayOfMonth),
          lte(appointments.endTime, lastDayOfMonth)
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
      
      // Count evolutions
      const evolutionsQuery = await db.query.evolutions.findMany({
        where: eq(evolutions.professionalId, professionalId)
      });
      
      const evolutionCount = evolutionsQuery.length;
      
      res.json({
        totalAppointments,
        totalHours: parseFloat(totalHours.toFixed(1)),
        patientCount,
        evolutionCount
      });
    } catch (error) {
      console.error("Error fetching professional stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas do profissional" });
    }
  });

  app.post(`${apiPrefix}/professionals`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      // First create user
      const userData = {
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        fullName: req.body.fullName,
        role: req.body.role,
        facilityId: req.body.facilityId,
        phone: req.body.phone,
        profileImageUrl: req.body.profileImageUrl,
      };

      const [newUser] = await db.insert(users).values(userData).returning();

      // Then create professional
      const professionalData = {
        userId: newUser.id,
        professionalType: req.body.professionalType,
        licenseNumber: req.body.licenseNumber,
        licenseType: req.body.licenseType,
        specialization: req.body.specialization,
        employmentType: req.body.employmentType,
        hourlyRate: req.body.hourlyRate,
        supervisorId: req.body.supervisorId,
        bio: req.body.bio,
      };

      const [newProfessional] = await db.insert(professionals).values(professionalData).returning();

      res.status(201).json({
        ...newProfessional,
        user: newUser,
      });
    } catch (error) {
      console.error("Error creating professional:", error);
      res.status(500).json({ error: "Erro ao criar profissional" });
    }
  });

  app.put(`${apiPrefix}/professionals/:id`, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

      const { id } = req.params;
      const professional = await db.query.professionals.findFirst({
        where: eq(professionals.id, parseInt(id)),
      });

      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado" });
      }

      // Update user data
      const userData = {
        email: req.body.email,
        fullName: req.body.fullName,
        role: req.body.role,
        facilityId: req.body.facilityId,
        phone: req.body.phone,
        profileImageUrl: req.body.profileImageUrl,
      };

      await db.update(users).set(userData).where(eq(users.id, professional.userId));

      // Update professional data
      const professionalData = {
        professionalType: req.body.professionalType,
        licenseNumber: req.body.licenseNumber,
        licenseType: req.body.licenseType,
        specialization: req.body.specialization,
        employmentType: req.body.employmentType,
        hourlyRate: req.body.hourlyRate,
        supervisorId: req.body.supervisorId,
        bio: req.body.bio,
      };

      const [updatedProfessional] = await db
        .update(professionals)
        .set(professionalData)
        .where(eq(professionals.id, parseInt(id)))
        .returning();

      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, professional.userId),
      });

      res.json({
        ...updatedProfessional,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating professional:", error);
      res.status(500).json({ error: "Erro ao atualizar profissional" });
    }
  });

  // Patients endpoints
  app.get(`${apiPrefix}/patients`, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      let query = db.select().from(patients);

      if (search) {
        query = query.where(ilike(patients.fullName, `%${search}%`));
      }

      const allPatients = await query.orderBy(patients.fullName);
      res.json(allPatients);
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

      // Construir a consulta base
      let query = db.select().from(documents);
      
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
      
      // Se solicitado, apenas mostrar as versões mais recentes
      if (onlyLatestVersions === 'true') {
        query = query.where(isNull(documents.parentDocumentId));
      }
      
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
        const users = await db.query.users.findMany({
          where: inArray(users.id, userIds),
          columns: {
            id: true,
            username: true,
            name: true,
            role: true
          }
        });
        
        const usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<number, typeof users[number]>);
        
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
          appointment: true,
          versions: {
            orderBy: desc(documents.version)
          }
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
      
      if (!document.needsSignature) {
        return res.status(400).json({ error: "Este documento não requer assinatura" });
      }
      
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
        needsSignature,
        parentDocumentId
      } = req.body;

      // Validate at least one association is provided
      if (!patientId && !facilityId && !evolutionId && !appointmentId) {
        return res.status(400).json({ 
          error: "É necessário associar o documento a um paciente, unidade, evolução ou consulta" 
        });
      }

      // If this is a new version of an existing document, check if the parent exists
      let version = 1;
      if (parentDocumentId) {
        const parentDoc = await db.query.documents.findFirst({
          where: eq(documents.id, parseInt(parentDocumentId))
        });
        
        if (!parentDoc) {
          return res.status(404).json({ error: "Documento original não encontrado" });
        }
        
        // Increment version number
        version = (parentDoc.version || 0) + 1;
      }

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
        needsSignature: needsSignature === 'true' || needsSignature === true,
        parentDocumentId: parentDocumentId ? parseInt(parentDocumentId) : null,
        version: version,
        updatedAt: new Date()
      };

      const [newDocument] = await db.insert(documents).values(documentData).returning();
      
      // If this document needs a signature, create a notification for the appropriate users
      if (documentData.needsSignature) {
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

      // Start with a query builder
      let query = db.select().from(documents);

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

      if (needsSignature === 'true') {
        conditions.push(eq(documents.needsSignature, true));
      } else if (needsSignature === 'false') {
        conditions.push(eq(documents.needsSignature, false));
      }

      // Only get the latest versions of documents (no parent document or is the latest version)
      if (onlyLatestVersions) {
        // This is a simplification - in a real app we'd need a more complex query
        // to find the latest version of each document lineage
        conditions.push(
          or(
            isNull(documents.parentDocumentId),
            notExists(
              db.select()
                .from(documents)
                .where(eq(documents.parentDocumentId, documents.id))
            )
          )
        );
      }

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
          where: inArray(users.id, uploaderIds),
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
  app.get(`${apiPrefix}/reports/professionals-hours`, async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

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

  app.get(`${apiPrefix}/reports/appointments-by-procedure`, async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

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

  app.get(`${apiPrefix}/reports/patients-by-facility`, async (req, res) => {
    try {
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }

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
  app.get(`${apiPrefix}/reports/appointments-by-period`, async (req, res) => {
    try {
      // Assegurar autenticação e permissão
      if (!req.isAuthenticated() || !["admin", "coordinator"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }
      
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
  app.get(`${apiPrefix}/reports/patient-evolution-over-time`, async (req, res) => {
    try {
      // Assegurar autenticação e permissão
      if (!req.isAuthenticated() || !["admin", "coordinator", "professional"].includes(req.user.role)) {
        return res.status(403).json({ error: "Acesso não autorizado" });
      }
      
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
