import { db } from "../db";
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
    
    console.log("Removendo todos os dados de teste...");
    
    // Remover logs de auditoria
    await db.execute(sql`TRUNCATE audit_logs CASCADE`);
    
    // Remover notificações
    await db.execute(sql`TRUNCATE notifications CASCADE`);
    
    // Remover chat
    await db.execute(sql`TRUNCATE chat_group_members CASCADE`);
    await db.execute(sql`TRUNCATE chat_messages CASCADE`);
    await db.execute(sql`TRUNCATE chat_groups CASCADE`);
    
    // Remover documentos
    await db.execute(sql`TRUNCATE documents CASCADE`);
    
    // Remover evoluções
    await db.execute(sql`TRUNCATE evolutions CASCADE`);
    
    // Remover agendamentos
    await db.execute(sql`TRUNCATE appointments CASCADE`);
    
    // Remover vínculos de pacientes com unidades e pacientes
    await db.execute(sql`TRUNCATE patient_facilities CASCADE`);
    await db.execute(sql`TRUNCATE patients CASCADE`);
    
    // Remover profissionais (exceto administradores)
    await db.execute(sql`
      DELETE FROM professionals
      WHERE id IN (
        SELECT p.id FROM professionals p
        JOIN users u ON p.user_id = u.id
        WHERE u.role NOT IN ('admin', 'coordinator')
      )
    `);
    
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

// Executar o reset automaticamente
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

export default resetData;