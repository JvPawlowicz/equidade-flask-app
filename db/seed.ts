import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    // Create initial facilities
    const [mainFacility] = await db.insert(schema.facilities).values({
      name: "Equidade Clínica - Unidade Central",
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      phone: "(11) 3333-4444",
      email: "contato@equidadeclinica.com.br",
      cnpj: "12.345.678/0001-99",
      licenseNumber: "SP-123456",
    }).returning();

    const [secondFacility] = await db.insert(schema.facilities).values({
      name: "Equidade Clínica - Unidade Sul",
      address: "Rua Augusta, 500",
      city: "São Paulo",
      state: "SP",
      zipCode: "01305-000",
      phone: "(11) 3333-5555",
      email: "sul@equidadeclinica.com.br",
      cnpj: "12.345.678/0002-70",
      licenseNumber: "SP-654321",
    }).returning();

    // Create rooms for each facility
    const rooms = await Promise.all([
      db.insert(schema.rooms).values([
        { name: "Sala 1", facilityId: mainFacility.id, capacity: 2, description: "Sala para atendimento psicológico" },
        { name: "Sala 2", facilityId: mainFacility.id, capacity: 3, description: "Sala para fisioterapia" },
        { name: "Sala 3", facilityId: mainFacility.id, capacity: 2, description: "Sala para fonoaudiologia" },
        { name: "Sala 4", facilityId: mainFacility.id, capacity: 4, description: "Sala para terapia ocupacional" }
      ]).returning(),
      db.insert(schema.rooms).values([
        { name: "Sala 1", facilityId: secondFacility.id, capacity: 2, description: "Sala para atendimento psicológico" },
        { name: "Sala 2", facilityId: secondFacility.id, capacity: 3, description: "Sala para fisioterapia" }
      ]).returning()
    ]);

    // Create insurance plans
    const [amil] = await db.insert(schema.insurancePlans).values({
      name: "Plano Premium",
      provider: "Amil",
      coverageDetails: "Cobertura para todos os procedimentos",
      contactInfo: "(11) 2222-3333",
    }).returning();

    const [unimed] = await db.insert(schema.insurancePlans).values({
      name: "Plano Básico",
      provider: "Unimed",
      coverageDetails: "Cobertura para procedimentos básicos",
      contactInfo: "(11) 2222-4444",
    }).returning();

    // Create admin user
    const adminPassword = await hashPassword("admin123");
    const [adminUser] = await db.insert(schema.users).values({
      username: "admin",
      password: adminPassword,
      email: "admin@equidadeclinica.com.br",
      fullName: "Dr. João Silva",
      role: "admin",
      facilityId: mainFacility.id,
      phone: "(11) 97777-8888",
      profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    }).returning();

    // Create coordinator user
    const coordinatorPassword = await hashPassword("coord123");
    const [coordinatorUser] = await db.insert(schema.users).values({
      username: "coordenador",
      password: coordinatorPassword,
      email: "coordenador@equidadeclinica.com.br",
      fullName: "Dra. Ana Santos",
      role: "coordinator",
      facilityId: secondFacility.id,
      phone: "(11) 97777-9999",
      profileImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    }).returning();

    // Create professional users and their professional profiles
    const professionalUsers = await Promise.all([
      // Psychologist
      db.insert(schema.users).values({
        username: "amanda",
        password: await hashPassword("amanda123"),
        email: "amanda@equidadeclinica.com.br",
        fullName: "Dra. Amanda Silva",
        role: "professional",
        facilityId: mainFacility.id,
        phone: "(11) 96666-7777",
        profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      }).returning(),
      
      // Physiotherapist
      db.insert(schema.users).values({
        username: "carlos",
        password: await hashPassword("carlos123"),
        email: "carlos@equidadeclinica.com.br",
        fullName: "Dr. Carlos Oliveira",
        role: "professional",
        facilityId: mainFacility.id,
        phone: "(11) 96666-8888",
        profileImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      }).returning(),
      
      // Speech therapist
      db.insert(schema.users).values({
        username: "juliana",
        password: await hashPassword("juliana123"),
        email: "juliana@equidadeclinica.com.br",
        fullName: "Dra. Juliana Costa",
        role: "professional",
        facilityId: secondFacility.id,
        phone: "(11) 96666-9999",
        profileImageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      }).returning(),
    ]);

    // Create professional profiles
    const professionals = await Promise.all([
      db.insert(schema.professionals).values({
        userId: professionalUsers[0][0].id,
        professionalType: "psychologist",
        licenseNumber: "CRP 06/123456",
        licenseType: "CRP",
        specialization: "Psicologia Comportamental",
        employmentType: "employee",
        hourlyRate: 150,
      }).returning(),
      
      db.insert(schema.professionals).values({
        userId: professionalUsers[1][0].id,
        professionalType: "physiotherapist",
        licenseNumber: "CREFITO 3/12345",
        licenseType: "CREFITO",
        specialization: "Fisioterapia Pediátrica",
        employmentType: "contractor",
        hourlyRate: 130,
      }).returning(),
      
      db.insert(schema.professionals).values({
        userId: professionalUsers[2][0].id,
        professionalType: "speech_therapist",
        licenseNumber: "CRFa 2/12345",
        licenseType: "CRFa",
        specialization: "Fonoaudiologia Infantil",
        employmentType: "employee",
        hourlyRate: 140,
      }).returning(),
    ]);

    // Create intern user and professional profile
    const [internUser] = await db.insert(schema.users).values({
      username: "estagiario",
      password: await hashPassword("estagiario123"),
      email: "estagiario@equidadeclinica.com.br",
      fullName: "Paulo Mendes",
      role: "intern",
      facilityId: mainFacility.id,
      phone: "(11) 95555-6666",
      profileImageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    }).returning();

    const [internProfessional] = await db.insert(schema.professionals).values({
      userId: internUser.id,
      professionalType: "psychologist",
      licenseType: "Estagiário CRP",
      specialization: "Psicologia Clínica",
      employmentType: "employee",
      hourlyRate: 50,
      supervisorId: professionals[0][0].id,
    }).returning();

    // Create secretary user
    const [secretaryUser] = await db.insert(schema.users).values({
      username: "secretaria",
      password: await hashPassword("secretaria123"),
      email: "secretaria@equidadeclinica.com.br",
      fullName: "Maria Souza",
      role: "secretary",
      facilityId: mainFacility.id,
      phone: "(11) 94444-5555",
      profileImageUrl: "https://images.unsplash.com/photo-1614644147798-f8c0fc9da7f6?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    }).returning();

    // Create patients
    const patients = await db.insert(schema.patients).values([
      {
        fullName: "Lucas Pereira",
        dateOfBirth: new Date("2011-05-15"),
        gender: "Masculino",
        cpf: "123.456.789-00",
        address: "Rua das Flores, 123",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567",
        phone: "(11) 98765-4321",
        email: "responsavel.lucas@email.com",
        emergencyContact: "Marta Pereira",
        emergencyPhone: "(11) 99876-5432",
        guardianName: "Marta Pereira",
        guardianPhone: "(11) 99876-5432",
        guardianEmail: "marta.pereira@email.com",
        guardianRelationship: "Mãe",
        insurancePlanId: amil.id,
        insuranceNumber: "AMIL123456789",
        diagnosis: "Transtorno do Espectro Autista",
        notes: "Paciente apresenta maior responsividade em terapias pela manhã",
        profileImageUrl: null,
      },
      {
        fullName: "Maria Santos",
        dateOfBirth: new Date("2015-03-20"),
        gender: "Feminino",
        cpf: "987.654.321-00",
        address: "Avenida Paulista, 500, apto 52",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310-000",
        phone: "(11) 91234-5678",
        email: "responsavel.maria@email.com",
        emergencyContact: "João Santos",
        emergencyPhone: "(11) 99123-4567",
        guardianName: "João Santos",
        guardianPhone: "(11) 99123-4567",
        guardianEmail: "joao.santos@email.com",
        guardianRelationship: "Pai",
        insurancePlanId: unimed.id,
        insuranceNumber: "UNIMED987654321",
        diagnosis: "Atraso no Desenvolvimento Motor",
        notes: "Paciente iniciando terapia de psicomotricidade",
        profileImageUrl: null,
      },
      {
        fullName: "Rafael Lima",
        dateOfBirth: new Date("2008-11-10"),
        gender: "Masculino",
        cpf: "456.789.123-00",
        address: "Rua Augusta, 300",
        city: "São Paulo",
        state: "SP",
        zipCode: "01305-000",
        phone: "(11) 97654-3210",
        email: "responsavel.rafael@email.com",
        emergencyContact: "Carla Lima",
        emergencyPhone: "(11) 99765-4321",
        guardianName: "Carla Lima",
        guardianPhone: "(11) 99765-4321",
        guardianEmail: "carla.lima@email.com",
        guardianRelationship: "Mãe",
        insurancePlanId: amil.id,
        insuranceNumber: "AMIL987654123",
        diagnosis: "Dificuldades de Fala e Linguagem",
        notes: "Terapia fonoaudiológica 2x por semana",
        profileImageUrl: null,
      }
    ]).returning();

    // Associate patients with facilities
    await Promise.all([
      db.insert(schema.patientFacilities).values([
        { patientId: patients[0].id, facilityId: mainFacility.id },
        { patientId: patients[1].id, facilityId: mainFacility.id },
        { patientId: patients[1].id, facilityId: secondFacility.id },
        { patientId: patients[2].id, facilityId: secondFacility.id },
      ])
    ]);

    // Create appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointments = await db.insert(schema.appointments).values([
      // Today's appointments
      {
        patientId: patients[0].id,
        professionalId: professionals[0][0].id,
        roomId: rooms[0][0].id,
        facilityId: mainFacility.id,
        startTime: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8:00
        endTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00
        procedureType: "psychology_aba",
        status: "confirmed",
        notes: "",
        createdBy: adminUser.id,
      },
      {
        patientId: patients[1].id,
        professionalId: professionals[1][0].id,
        roomId: rooms[0][1].id,
        facilityId: mainFacility.id,
        startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00
        endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00
        procedureType: "physiotherapy_psychomotor",
        status: "pending",
        notes: "",
        createdBy: adminUser.id,
      },
      {
        patientId: patients[2].id,
        professionalId: professionals[2][0].id,
        roomId: rooms[1][0].id,
        facilityId: secondFacility.id,
        startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10:00
        endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11:00
        procedureType: "speech_therapy",
        status: "completed",
        notes: "",
        createdBy: coordinatorUser.id,
      },
      
      // Tomorrow's appointments
      {
        patientId: patients[2].id,
        professionalId: professionals[0][0].id,
        roomId: rooms[0][0].id,
        facilityId: mainFacility.id,
        startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // Tomorrow 8:00
        endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Tomorrow 9:00
        procedureType: "psychology_cbt",
        status: "scheduled",
        notes: "",
        createdBy: adminUser.id,
      },
      {
        patientId: patients[0].id,
        professionalId: professionals[1][0].id,
        roomId: rooms[0][1].id,
        facilityId: mainFacility.id,
        startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Tomorrow 10:00
        endTime: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), // Tomorrow 11:00
        procedureType: "physiotherapy_conventional",
        status: "scheduled",
        notes: "",
        createdBy: adminUser.id,
      },
    ]).returning();

    // Create evolutions for completed appointments
    await db.insert(schema.evolutions).values([
      {
        appointmentId: appointments[2].id,
        professionalId: professionals[2][0].id,
        content: "Paciente demonstrou progresso significativo na articulação de fonemas complexos. Continuamos com exercícios de vocalização e introduzimos novas técnicas de respiração.",
        status: "completed",
      }
    ]);

    // Create pending evolutions
    await db.insert(schema.evolutions).values([
      {
        appointmentId: appointments[0].id,
        professionalId: professionals[0][0].id,
        content: "Sessão focada em habilidades sociais e interação com pares. Paciente mostrou maior interesse em atividades compartilhadas.",
        status: "pending",
      }
    ]);

    // Create intern evolution requiring approval
    await db.insert(schema.evolutions).values([
      {
        appointmentId: appointments[1].id,
        professionalId: internProfessional.id,
        content: "Primeira sessão para avaliar capacidades motoras. Paciente apresenta dificuldades de coordenação que serão abordadas nas próximas sessões.",
        status: "pending",
        supervisorId: professionals[0][0].id,
      }
    ]);

    // Create chat groups
    const [clinicalTeamGroup] = await db.insert(schema.chatGroups).values({
      name: "Equipe Clínica",
      createdById: adminUser.id,
    }).returning();

    // Add members to chat groups
    await db.insert(schema.chatGroupMembers).values([
      { groupId: clinicalTeamGroup.id, userId: adminUser.id },
      { groupId: clinicalTeamGroup.id, userId: coordinatorUser.id },
      { groupId: clinicalTeamGroup.id, userId: professionalUsers[0][0].id },
      { groupId: clinicalTeamGroup.id, userId: professionalUsers[1][0].id },
      { groupId: clinicalTeamGroup.id, userId: professionalUsers[2][0].id },
      { groupId: clinicalTeamGroup.id, userId: internUser.id },
    ]);

    // Create chat messages
    await db.insert(schema.chatMessages).values([
      {
        senderId: adminUser.id,
        groupId: clinicalTeamGroup.id,
        content: "Bem-vindos ao nosso novo sistema de gerenciamento clínico! Qualquer dúvida podem me contatar.",
        isRead: false,
      },
      {
        senderId: coordinatorUser.id,
        groupId: clinicalTeamGroup.id,
        content: "Obrigada, João! O sistema está muito bom. Já estou usando para gerenciar a unidade Sul.",
        isRead: false,
      },
      {
        senderId: professionalUsers[0][0].id,
        recipientId: professionalUsers[1][0].id,
        content: "Olá Carlos, temos um paciente em comum. Podemos discutir o caso dele amanhã?",
        isRead: false,
      },
      {
        senderId: professionalUsers[1][0].id,
        recipientId: professionalUsers[0][0].id,
        content: "Claro, Amanda! Podemos conversar depois do meu atendimento das 10h.",
        isRead: false,
      },
    ]);

    // Create notifications
    await db.insert(schema.notifications).values([
      {
        userId: professionalUsers[0][0].id,
        title: "Novo agendamento confirmado",
        content: "Você tem um novo agendamento para o paciente Lucas Pereira hoje às 08:00h",
        type: "appointment",
        referenceId: appointments[0].id,
        referenceType: "appointment",
      },
      {
        userId: professionalUsers[0][0].id,
        title: "Evolução pendente",
        content: "Você tem uma evolução pendente para o atendimento do paciente Lucas Pereira",
        type: "evolution_required",
        referenceId: appointments[0].id,
        referenceType: "appointment",
      },
      {
        userId: internUser.id,
        title: "Evolução pendente",
        content: "Você tem uma evolução pendente para o atendimento do paciente Maria Santos",
        type: "evolution_required",
        referenceId: appointments[1].id,
        referenceType: "appointment",
      },
      {
        userId: professionals[0][0].supervisorId || professionalUsers[0][0].id,
        title: "Evolução para aprovar",
        content: "Um estagiário enviou uma evolução para sua aprovação",
        type: "evolution_approval",
        referenceId: appointments[1].id,
        referenceType: "evolution",
      },
      {
        userId: professionalUsers[0][0].id,
        title: "Nova mensagem",
        content: "Você recebeu uma nova mensagem de Dr. Carlos Oliveira",
        type: "message",
        referenceId: 4,
        referenceType: "chat_message",
      },
    ]);
    
    console.log("Seed data created successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
