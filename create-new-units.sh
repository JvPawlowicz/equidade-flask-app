#!/bin/bash

echo "Executando script para criar novas unidades e usuários..."
tsx scripts/create-new-units.ts

if [ $? -eq 0 ]; then
  echo "Script executado com sucesso!"
else
  echo "Erro ao executar o script."
  exit 1
fi