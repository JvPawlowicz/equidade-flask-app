const { execSync } = require('child_process');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

async function resetDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('Dropando todas as tabelas...');
    // Query para encontrar todas as tabelas no esquema public
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `);
    
    // Desativar verificações de chave estrangeira temporariamente
    await pool.query('SET session_replication_role = replica;');
    
    // Dropar todas as tabelas
    for (const row of tablesResult.rows) {
      const tableName = row.tablename;
      console.log(`Dropando tabela: ${tableName}`);
      await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }
    
    // Restaurar verificações de chave estrangeira
    await pool.query('SET session_replication_role = DEFAULT;');
    
    // Fechar a conexão com o pool
    await pool.end();
    
    console.log('Todas as tabelas foram dropadas com sucesso!');
    
    // Aplicar as migrations
    console.log('Aplicando migrations...');
    execSync('npm run db:push', { stdio: 'inherit' });
    
    // Aplicar o seed
    console.log('Aplicando seed data...');
    execSync('npm run db:seed', { stdio: 'inherit' });
    
    console.log('Banco de dados resetado com sucesso!');
  } catch (error) {
    console.error('Erro ao resetar banco de dados:', error);
    process.exit(1);
  }
}

resetDatabase();