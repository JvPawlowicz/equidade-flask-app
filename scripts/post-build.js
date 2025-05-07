#!/usr/bin/env node

/**
 * Script de pós-build para garantir que a estrutura de arquivos esteja correta para produção.
 * Este script verifica e corrige problemas comuns no processo de build.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(distDir, 'public');

console.log('🛠️ Executando script de pós-build...');

// Verifica se o diretório dist existe
if (!fs.existsSync(distDir)) {
  console.error('❌ Diretório dist não encontrado. O build falhou?');
  process.exit(1);
}

// Lista os arquivos no diretório dist
console.log('📁 Conteúdo do diretório dist:');
const distFiles = fs.readdirSync(distDir);
console.log(distFiles);

// Verifica se há arquivos JavaScript no diretório raiz de dist
const jsFiles = distFiles.filter(file => file.endsWith('.js'));
if (jsFiles.length === 0) {
  console.warn('⚠️ Nenhum arquivo JavaScript encontrado no diretório dist. Verificando subdirectórios...');
  
  // Procura arquivos js em subdiretorios
  let foundJs = false;
  for (const subdir of distFiles) {
    const subdirPath = path.join(distDir, subdir);
    if (fs.lstatSync(subdirPath).isDirectory()) {
      const subdirFiles = fs.readdirSync(subdirPath);
      const subdirJsFiles = subdirFiles.filter(file => file.endsWith('.js'));
      if (subdirJsFiles.length > 0) {
        console.log(`✅ Encontrados arquivos JavaScript em ${subdir}/`);
        foundJs = true;
      }
    }
  }
  
  if (!foundJs) {
    console.error('❌ Nenhum arquivo JavaScript encontrado em dist ou seus subdiretorios.');
  }
}

// Verifica se o diretório public existe dentro de dist
if (!fs.existsSync(publicDir)) {
  console.warn('⚠️ Diretório public/ não encontrado dentro de dist/. Criando...');
  fs.mkdirSync(publicDir, { recursive: true });
}

// Verifica se há arquivos HTML no diretório public
const publicFiles = fs.readdirSync(publicDir);
console.log('📁 Conteúdo do diretório public:');
console.log(publicFiles);

const htmlFiles = publicFiles.filter(file => file.endsWith('.html'));
if (htmlFiles.length === 0) {
  console.warn('⚠️ Nenhum arquivo HTML encontrado em dist/public.');
  
  // Cria um arquivo index.html de fallback se não existir
  const fallbackHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Equidade - Sistema de Gestão</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f2f5;
      margin: 0;
      flex-direction: column;
      text-align: center;
    }
    .container {
      max-width: 500px;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #003366;
      margin-bottom: 20px;
    }
    .loader {
      border: 5px solid #f3f3f3;
      border-radius: 50%;
      border-top: 5px solid #003366;
      width: 40px;
      height: 40px;
      margin: 20px auto;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 15px;
      background-color: #003366;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Equidade - Sistema de Gestão</h1>
    <p>Inicializando aplicação...</p>
    <div class="loader"></div>
    <p>Se a página não carregar automaticamente em alguns segundos:</p>
    <a href="/auth" class="btn">Ir para a página de login</a>
  </div>
  <script>
    // Redirecionamento automático após 2 segundos
    setTimeout(() => {
      window.location.href = "/auth";
    }, 2000);
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(path.join(publicDir, 'index.html'), fallbackHtml);
  console.log('✅ Criado arquivo index.html de fallback em dist/public/');
}

console.log('✅ Script de pós-build concluído com sucesso!');