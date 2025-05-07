import { db } from "../db";
import { 
  patients, 
  patientFacilities, 
  professionals, 
  appointments, 
  evolutions, 
  documents, 
  chatMessages, 
  chatGroups, 
  chatGroupMembers, 
  notifications,
  auditLogs
} from "../shared/schema";
import { sql } from "drizzle-orm";

/**
 * Este script limpa os dados de pacientes, profissionais e tabelas relacionadas
 * para preparar o sistema para entrar em produção, mantendo apenas os usuários
 * administrativos e dados de configuração.
 */
async function resetData() {
  console.log("Iniciando limpeza de dados...");
  
  try {
    // Desabilitar verificações de foreign key temporariamente para permitir a exclusão
    await db.execute(sql`SET CONSTRAINTS ALL DEFERRED`);
    
    console.log("Removendo notificações...");
    await db.delete(notifications);
    
    console.log("Removendo mensagens e grupos de chat...");
    await db.delete(chatGroupMembers);
    await db.delete(chatMessages);
    await db.delete(chatGroups);
    
    console.log("Removendo documentos...");
    await db.delete(documents);
    
    console.log("Removendo evoluções...");
    await db.delete(evolutions);
    
    console.log("Removendo agendamentos...");
    await db.delete(appointments);
    
    console.log("Removendo vínculos de pacientes com unidades...");
    await db.delete(patientFacilities);
    
    console.log("Removendo pacientes...");
    await db.delete(patients);
    
    console.log("Removendo profissionais (exceto administrativos)...");
    // Recuperar IDs de profissionais que também são administradores ou coordenadores para preservar
    const adminProfessionals = await db.query.professionals.findMany({
      with: {
        user: true
      },
      where: (professionals, { eq, or }) => or(
        eq(professionals.user.role, "admin"),
        eq(professionals.user.role, "coordinator")
      )
    });
    
    const adminProfessionalIds = adminProfessionals.map(p => p.id);
    console.log(`Encontrados ${adminProfessionalIds.length} profissionais administrativos que serão preservados`);
    
    if (adminProfessionalIds.length > 0) {
      // Excluir apenas profissionais que não são administradores
      await db.delete(professionals)
        .where(sql`id NOT IN (${adminProfessionalIds.join(',')})`);
    } else {
      // Se não encontrou nenhum administrador, não exclui profissionais para evitar erro
      console.log("AVISO: Nenhum profissional administrativo encontrado. Nenhum profissional será removido para evitar a exclusão de todos os usuários.");
    }
    
    console.log("Removendo logs de auditoria...");
    await db.delete(auditLogs);
    
    // Reabilitar verificações de foreign key
    await db.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
    
    console.log("Limpeza de dados concluída com sucesso!");
    console.log("O sistema está pronto para entrar em produção. Apenas usuários administrativos foram mantidos.");
    
    return { success: true };
  } catch (error) {
    console.error("Erro durante a limpeza de dados:", error);
    return { success: false, error };
  }
}

// Executar o reset apenas se o script for chamado diretamente
if (require.main === module) {
  resetData()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Erro fatal:", error);
      process.exit(1);
    });
}

export default resetData;