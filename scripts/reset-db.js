import { execSync } from 'child_process';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const { Pool } = pg;

// Carregar variáveis de ambiente
dotenv.config();

// Obter o diretório atual para o módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function resetDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log('Dropando todas as tabelas...');
    // Query para encontrar todas as tabelas no esquema public
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `);
    
    // Dropar tabelas em ordem
    const tables = tablesResult.rows.map(row => row.tablename);
    console.log('Tabelas encontradas:', tables);
    
    // Desabilitar todas as restrições de chave estrangeira antes de dropar as tabelas
    try {
      await pool.query(`DO $$ 
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'ALTER TABLE IF EXISTS "' || r.tablename || '" DISABLE TRIGGER ALL;';
          END LOOP;
        END $$;`);
      console.log('Restrições de chave estrangeira desabilitadas');
    } catch (err) {
      console.warn('Aviso ao desabilitar triggers:', err.message);
    }
    
    // Dropar todas as tabelas com CASCADE
    for (const tableName of tables) {
      try {
        console.log(`Dropando tabela: ${tableName}`);
        await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      } catch (err) {
        console.warn(`Aviso ao dropar tabela ${tableName}:`, err.message);
      }
    }
    
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