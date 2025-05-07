#!/bin/bash

# Script para backup do banco de dados PostgreSQL
# Para usar com cron no Railway ou outro servidor

# Configurações
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/backup_log.txt"
RETENTION_DAYS=7

# Verificar se a variável de ambiente DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
  echo "ERRO: Variável DATABASE_URL não está definida" | tee -a "$LOG_FILE"
  exit 1
fi

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

echo "$(date): Iniciando backup do banco de dados..." | tee -a "$LOG_FILE"

# Extrair informações de conexão do DATABASE_URL
# Exemplo: postgres://username:password@hostname:port/database
DB_URL=$DATABASE_URL
DB_USER=$(echo $DB_URL | awk -F':' '{print $2}' | awk -F'//' '{print $2}')
DB_PASS=$(echo $DB_URL | awk -F':' '{print $3}' | awk -F'@' '{print $1}')
DB_HOST=$(echo $DB_URL | awk -F'@' '{print $2}' | awk -F':' '{print $1}')
DB_PORT=$(echo $DB_URL | awk -F':' '{print $4}' | awk -F'/' '{print $1}')
DB_NAME=$(echo $DB_URL | awk -F'/' '{print $4}' | awk -F'?' '{print $1}')

# Verificar se todas as variáveis de conexão foram extraídas corretamente
if [ -z "$DB_USER" ] || [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ]; then
  echo "$(date): ERRO: Não foi possível extrair todas as informações de conexão do DATABASE_URL" | tee -a "$LOG_FILE"
  exit 1
fi

# Executar o backup
export PGPASSWORD="$DB_PASS"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

# Verificar se o backup foi criado com sucesso
if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "$(date): Backup concluído com sucesso. Tamanho: $BACKUP_SIZE" | tee -a "$LOG_FILE"
  
  # Compactar o arquivo de backup
  gzip -f "$BACKUP_FILE"
  echo "$(date): Backup compactado: ${BACKUP_FILE}.gz" | tee -a "$LOG_FILE"
  
  # Upload para armazenamento externo (opcional)
  # Se tiver configurado S3, Azure Blob Storage, etc.
  # Adicione comandos para fazer upload aqui
  
  # Remover backups antigos (mais de 7 dias)
  echo "$(date): Removendo backups com mais de $RETENTION_DAYS dias..." | tee -a "$LOG_FILE"
  find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
  find "$BACKUP_DIR" -name "backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete
  
  echo "$(date): Processo de backup concluído" | tee -a "$LOG_FILE"
else
  echo "$(date): ERRO: Falha ao criar backup" | tee -a "$LOG_FILE"
  exit 1
fi