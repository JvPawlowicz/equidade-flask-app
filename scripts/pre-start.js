// scripts/pre-start.js
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🚀 Executando verificações pré-inicialização...');

// Verifica se o banco de dados precisa ser atualizado
async function checkDatabase() {
  try {
    console.log('📊 Verificando banco de dados...');
    
    // Verificar se o banco de dados existe usando drizzle-kit
    const { stdout: dbStatusOutput } = await execPromise('npx drizzle-kit check:pg --config=./drizzle.config.ts');
    
    if (dbStatusOutput.includes('NO_CHANGES') || dbStatusOutput.includes('✅')) {
      console.log('✅ Banco de dados OK - Nenhuma alteração necessária');
      return true;
    } else {
      console.log('⚠️ Esquema do banco de dados precisa ser atualizado');
      console.log('🔄 Aplicando alterações...');
      
      // Aplicar alterações no esquema
      const { stdout: pushOutput } = await execPromise('npm run db:push');
      console.log('✅ Banco de dados atualizado com sucesso');
      
      // Verificar se o DB precisa ser populado (verificando se a tabela users está vazia)
      const shouldSeed = process.env.NODE_ENV === 'production' && (
        pushOutput.includes('tables created') || 
        process.env.FORCE_SEED === 'true'
      );
      
      if (shouldSeed) {
        console.log('🌱 Populando banco de dados...');
        await execPromise('npm run db:seed');
        console.log('✅ Banco de dados populado com sucesso');
      }
      
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar/atualizar banco de dados:', error);
    if (process.env.NODE_ENV === 'production') {
      // Em produção, falhas de banco de dados são críticas
      process.exit(1);
    }
    return false;
  }
}

// Verifica se a pasta de uploads existe
function ensureUploadsDirectory() {
  const uploadsDir = join(rootDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('📁 Criando diretório de uploads...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Diretório de uploads criado com sucesso');
  } else {
    console.log('✅ Diretório de uploads já existe');
  }
}

// Verificar se as variáveis de ambiente necessárias estão definidas
function checkEnvironmentVariables() {
  const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Variáveis de ambiente obrigatórias não encontradas: ${missingVars.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return false;
  }
  
  console.log('✅ Todas as variáveis de ambiente necessárias estão definidas');
  return true;
}

async function main() {
  console.log(`🔍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  // Executar verificações em paralelo
  const results = await Promise.all([
    checkDatabase(),
    checkEnvironmentVariables(),
  ]);
  
  // Verificar diretório de uploads (sempre após o banco de dados)
  ensureUploadsDirectory();
  
  // Se alguma verificação falhar, o script já terá saído em produção
  // Em desenvolvimento, apenas mostrar avisos
  if (results.includes(false)) {
    console.warn('⚠️ Algumas verificações falharam, mas a aplicação continuará em modo de desenvolvimento');
  } else {
    console.log('✅ Todas as verificações pré-inicialização passaram com sucesso');
  }
  
  console.log('🚀 Iniciando aplicação...');
}

// Executar o script principal
main().catch(error => {
  console.error('❌ Erro fatal durante as verificações pré-inicialização:', error);
  process.exit(1);
});