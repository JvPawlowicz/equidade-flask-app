import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, primaryKey, uniqueIndex, date, json, varchar, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User Roles Enum
export const roleEnum = pgEnum('role', ['admin', 'coordinator', 'professional', 'intern', 'secretary']);

// Professional Types Enum
export const professionalTypeEnum = pgEnum('professional_type', ['psychologist', 'physiotherapist', 'speech_therapist', 'occupational_therapist', 'other']);

// Employment Types Enum
export const employmentTypeEnum = pgEnum('employment_type', ['employee', 'contractor', 'freelancer']);

// Appointment Status Enum
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'pending', 'attended']);

// Procedure Types Enum
export const procedureTypeEnum = pgEnum('procedure_type', [
  'psychology_aba', 
  'psychology_cbt', 
  'physiotherapy_psychomotor', 
  'physiotherapy_conventional', 
  'speech_therapy', 
  'occupational_therapy', 
  'planning',
  'free_time',
  'other'
]);

// Evolution Status Enum
export const evolutionStatusEnum = pgEnum('evolution_status', ['pending', 'completed', 'approved', 'rejected']);

// Insurance Plans Table
export const insurancePlans = pgTable('insurance_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  coverageDetails: text('coverage_details'),
  contactInfo: text('contact_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Facilities Table
export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zipCode: text('zip_code').notNull(),
  phone: text('phone'),
  email: text('email'),
  cnpj: text('cnpj'),
  licenseNumber: text('license_number'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Rooms Table
export const rooms = pgTable('rooms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  facilityId: integer('facility_id').references(() => facilities.id).notNull(),
  capacity: integer('capacity'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').notNull().unique(),
  fullName: text('full_name').notNull(),
  role: roleEnum('role').notNull(),
  facilityId: integer('facility_id').references(() => facilities.id),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLogin: timestamp('last_login'),
  profileImageUrl: text('profile_image_url'),
  isActive: boolean('is_active').default(true).notNull(),
  lgpdAccepted: boolean('lgpd_accepted').default(false).notNull(),
  lgpdAcceptedAt: timestamp('lgpd_accepted_at'),
  lgpdAcceptedIp: text('lgpd_accepted_ip'),
});

// Professionals Table
export const professionals = pgTable('professionals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  professionalType: professionalTypeEnum('professional_type').notNull(),
  licenseNumber: text('license_number'),
  licenseType: text('license_type'),
  specialization: text('specialization'),
  employmentType: employmentTypeEnum('employment_type').notNull(),
  hourlyRate: integer('hourly_rate'),
  supervisorId: integer('supervisor_id').references(() => professionals.id),
  facilityId: integer('facility_id').references(() => facilities.id),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lgpdAccepted: boolean('lgpd_accepted').default(false).notNull(),
  lgpdAcceptedAt: timestamp('lgpd_accepted_at'),
  lgpdAcceptedIp: text('lgpd_accepted_ip'),
});

// Patients Table
export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: text('gender'),
  cpf: text('cpf'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  phone: text('phone'),
  email: text('email'),
  emergencyContact: text('emergency_contact'),
  emergencyPhone: text('emergency_phone'),
  guardianName: text('guardian_name'),
  guardianPhone: text('guardian_phone'),
  guardianEmail: text('guardian_email'),
  guardianRelationship: text('guardian_relationship'),
  insurancePlanId: integer('insurance_plan_id').references(() => insurancePlans.id),
  insuranceNumber: text('insurance_number'),
  diagnosis: text('diagnosis'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  profileImageUrl: text('profile_image_url'),
  isActive: boolean('is_active').default(true).notNull(),
});

// Patient Facility Join Table (for patients belonging to multiple facilities)
export const patientFacilities = pgTable('patient_facilities', {
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  facilityId: integer('facility_id').references(() => facilities.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.patientId, t.facilityId] }),
}));

// Appointments Table
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').references(() => patients.id).notNull(),
  professionalId: integer('professional_id').references(() => professionals.id).notNull(),
  roomId: integer('room_id').references(() => rooms.id).notNull(),
  facilityId: integer('facility_id').references(() => facilities.id).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  procedureType: procedureTypeEnum('procedure_type').notNull(),
  status: appointmentStatusEnum('status').default('scheduled').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull(),
});

// Evolutions Table
export const evolutions = pgTable('evolutions', {
  id: serial('id').primaryKey(),
  appointmentId: integer('appointment_id').references(() => appointments.id).notNull(),
  professionalId: integer('professional_id').references(() => professionals.id).notNull(),
  content: text('content').notNull(),
  status: evolutionStatusEnum('status').default('pending').notNull(),
  supervisorId: integer('supervisor_id').references(() => professionals.id),
  supervisorNotes: text('supervisor_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Document Category Enum
export const documentCategoryEnum = pgEnum('document_category', [
  'medical_report', 
  'exam_result', 
  'treatment_plan', 
  'referral', 
  'legal_document', 
  'consent_form',
  'evolution_note',
  'administrative',
  'other'
]);

// Document Status Enum
export const documentStatusEnum = pgEnum('document_status', [
  'draft', 
  'pending_signature', 
  'signed', 
  'archived',
  'active'
]);

// Documents Table
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  description: text('description'),
  category: documentCategoryEnum('category').default('other').notNull(),
  status: documentStatusEnum('status').default('active').notNull(),
  patientId: integer('patient_id').references(() => patients.id),
  facilityId: integer('facility_id').references(() => facilities.id),
  evolutionId: integer('evolution_id').references(() => evolutions.id),
  appointmentId: integer('appointment_id').references(() => appointments.id),
  uploadedBy: integer('uploaded_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  // parentDocumentId e needsSignature foram removidos do banco
});

// Chat Messages Table
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  recipientId: integer('recipient_id').references(() => users.id),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  groupId: integer('group_id').references(() => chatGroups.id),
});

// Chat Groups Table
export const chatGroups = pgTable('chat_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdById: integer('created_by_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Chat Group Members Join Table
export const chatGroupMembers = pgTable('chat_group_members', {
  groupId: integer('group_id').references(() => chatGroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.groupId, t.userId] }),
}));

// Notifications Table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  type: text('type').notNull(), // appointment, evolution, message, etc.
  referenceId: integer('reference_id'), // ID of the related entity
  referenceType: text('reference_type'), // Type of the related entity
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Reports Table
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parameters: json('parameters'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: integer('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// Relations

export const roomsRelations = relations(rooms, ({ one }) => ({
  facility: one(facilities, {
    fields: [rooms.facilityId],
    references: [facilities.id],
  }),
}));

export const facilityRelations = relations(facilities, ({ many }) => ({
  rooms: many(rooms),
  users: many(users),
  professionals: many(professionals),
  patientFacilities: many(patientFacilities),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
  professional: one(professionals, {
    fields: [users.id],
    references: [professionals.userId],
  }),
  sentMessages: many(chatMessages, { relationName: 'sender' }),
  receivedMessages: many(chatMessages, { relationName: 'recipient' }),
  notifications: many(notifications),
  chatGroupsCreated: many(chatGroups),
  chatGroupsMembership: many(chatGroupMembers),
}));

export const professionalRelations = relations(professionals, ({ one, many }) => ({
  user: one(users, {
    fields: [professionals.userId],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [professionals.facilityId],
    references: [facilities.id],
  }),
  supervisor: one(professionals, {
    fields: [professionals.supervisorId],
    references: [professionals.id],
  }),
  interns: many(professionals, { relationName: 'supervisor' }),
  appointments: many(appointments),
  evolutions: many(evolutions, { relationName: 'author' }),
  supervisedEvolutions: many(evolutions, { relationName: 'supervisor' }),
}));

export const patientRelations = relations(patients, ({ one, many }) => ({
  insurancePlan: one(insurancePlans, {
    fields: [patients.insurancePlanId],
    references: [insurancePlans.id],
  }),
  facilities: many(patientFacilities),
  appointments: many(appointments),
  documents: many(documents),
}));

export const patientFacilityRelations = relations(patientFacilities, ({ one }) => ({
  patient: one(patients, {
    fields: [patientFacilities.patientId],
    references: [patients.id],
  }),
  facility: one(facilities, {
    fields: [patientFacilities.facilityId],
    references: [facilities.id],
  }),
}));

export const appointmentRelations = relations(appointments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
  room: one(rooms, {
    fields: [appointments.roomId],
    references: [rooms.id],
  }),
  facility: one(facilities, {
    fields: [appointments.facilityId],
    references: [facilities.id],
  }),
  creator: one(users, {
    fields: [appointments.createdBy],
    references: [users.id],
  }),
  evolutions: many(evolutions),
}));

export const evolutionRelations = relations(evolutions, ({ one }) => ({
  appointment: one(appointments, {
    fields: [evolutions.appointmentId],
    references: [appointments.id],
  }),
  professional: one(professionals, {
    fields: [evolutions.professionalId],
    references: [professionals.id],
    relationName: 'author',
  }),
  supervisor: one(professionals, {
    fields: [evolutions.supervisorId],
    references: [professionals.id],
    relationName: 'supervisor',
  }),
}));

export const documentRelations = relations(documents, ({ one, many }) => ({
  patient: one(patients, {
    fields: [documents.patientId],
    references: [patients.id],
  }),
  facility: one(facilities, {
    fields: [documents.facilityId],
    references: [facilities.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  evolution: one(evolutions, {
    fields: [documents.evolutionId],
    references: [evolutions.id],
  }),
  appointment: one(appointments, {
    fields: [documents.appointmentId],
    references: [appointments.id],
  }),
  // Relações parentDocument e versions foram removidas pois dependem de campos que não existem
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  recipient: one(users, {
    fields: [chatMessages.recipientId],
    references: [users.id],
    relationName: 'recipient',
  }),
  group: one(chatGroups, {
    fields: [chatMessages.groupId],
    references: [chatGroups.id],
  }),
}));

export const chatGroupRelations = relations(chatGroups, ({ one, many }) => ({
  creator: one(users, {
    fields: [chatGroups.createdById],
    references: [users.id],
  }),
  members: many(chatGroupMembers),
  messages: many(chatMessages),
}));

export const chatGroupMemberRelations = relations(chatGroupMembers, ({ one }) => ({
  group: one(chatGroups, {
    fields: [chatGroupMembers.groupId],
    references: [chatGroups.id],
  }),
  user: one(users, {
    fields: [chatGroupMembers.userId],
    references: [users.id],
  }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const reportRelations = relations(reports, ({ one }) => ({
  creator: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const loginUserSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const insertProfessionalSchema = createInsertSchema(professionals);
export const selectProfessionalSchema = createSelectSchema(professionals);

export const insertFacilitySchema = createInsertSchema(facilities);
export const selectFacilitySchema = createSelectSchema(facilities);

export const insertRoomSchema = createInsertSchema(rooms);
export const selectRoomSchema = createSelectSchema(rooms);

export const insertPatientSchema = createInsertSchema(patients);
export const selectPatientSchema = createSelectSchema(patients);

export const insertInsurancePlanSchema = createInsertSchema(insurancePlans);
export const selectInsurancePlanSchema = createSelectSchema(insurancePlans);

export const insertAppointmentSchema = createInsertSchema(appointments);
export const selectAppointmentSchema = createSelectSchema(appointments);

export const insertEvolutionSchema = createInsertSchema(evolutions);
export const selectEvolutionSchema = createSelectSchema(evolutions);

export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);

export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const selectChatMessageSchema = createSelectSchema(chatMessages);

export const insertChatGroupSchema = createInsertSchema(chatGroups);
export const selectChatGroupSchema = createSelectSchema(chatGroups);

export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

export const insertReportSchema = createInsertSchema(reports);
export const selectReportSchema = createSelectSchema(reports);

export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type InsurancePlan = typeof insurancePlans.$inferSelect;
export type InsertInsurancePlan = z.infer<typeof insertInsurancePlanSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Evolution = typeof evolutions.$inferSelect;
export type InsertEvolution = z.infer<typeof insertEvolutionSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type ChatGroup = typeof chatGroups.$inferSelect;
export type InsertChatGroup = z.infer<typeof insertChatGroupSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
