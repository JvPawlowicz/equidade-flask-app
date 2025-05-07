import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { count } from 'drizzle-orm';

/**
 * Rota de verificação de saúde da aplicação
 * Verifica a conexão com o banco de dados e retorna informações básicas do sistema
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    // Verificar conexão com o banco de dados
    const dbResult = await db.select({ count: count() }).from(users);
    const userCount = dbResult[0].count;
    
    // Coletar métricas básicas
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const formattedMemory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    };
    
    // Coletar informações do ambiente
    const environment = process.env.NODE_ENV || 'development';
    const nodeVersion = process.version;
    
    // Retornar status de saúde e métricas
    return res.status(200).json({
      status: 'healthy',
      database: {
        connected: true,
        userCount
      },
      system: {
        uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: formattedMemory,
        environment,
        nodeVersion
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no healthcheck:', error);
    
    return res.status(500).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: 'Falha na conexão com o banco de dados'
      },
      timestamp: new Date().toISOString()
    });
  }
}