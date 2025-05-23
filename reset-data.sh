#!/bin/bash

# Script para limpar os dados do sistema e preparar para o deploy

# Exibir mensagem de confirmação
echo "⚠️ ATENÇÃO: Este script irá remover todos os dados de pacientes e profissionais (exceto os administrativos)."
echo "Esta ação não pode ser desfeita e é recomendada apenas para preparar o sistema para o deploy."
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
  echo "🔄 Executando limpeza de dados..."
  npx tsx scripts/reset-data.ts
  
  if [ $? -eq 0 ]; then
    echo "✅ Dados resetados com sucesso!"
    echo "🚀 O sistema está pronto para o deploy."
  else
    echo "❌ Ocorreu um erro ao resetar os dados."
    exit 1
  fi
else
  echo "Operação cancelada pelo usuário."
  exit 0
fi