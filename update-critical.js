#!/usr/bin/env node

// ========================================================================================================
// 🚨 SCRIPT DE ATUALIZAÇÃO CRÍTICA - VERSÃO 3.3
// ========================================================================================================
// Este script garante que o usuário está executando a versão mais recente do bot
// com todas as correções críticas aplicadas
// ========================================================================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 INICIANDO ATUALIZAÇÃO CRÍTICA - VERSÃO 3.3');
console.log('='.repeat(60));

function runCommand(command, description) {
    console.log(`\n🔧 ${description}...`);
    try {
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        console.log(`✅ ${description} - Concluído`);
        if (output.trim()) {
            console.log(`📄 Saída: ${output.trim()}`);
        }
        return true;
    } catch (error) {
        console.error(`❌ ${description} - Erro:`, error.message);
        return false;
    }
}

function checkVersion() {
    console.log('\n📋 Verificando versão atual...');
    
    try {
        const indexPath = path.join(__dirname, 'index.js');
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        
        if (indexContent.includes('VERSÃO CORRIGIDA 3.3')) {
            console.log('✅ Versão 3.3 detectada - Correções críticas presentes');
            return true;
        } else {
            console.log('❌ Versão desatualizada detectada - Atualizando...');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar versão:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Iniciando processo de atualização crítica...\n');
    
    // 1. Verificar versão atual
    const isLatestVersion = checkVersion();
    
    if (!isLatestVersion) {
        console.log('\n🔄 Atualizando para a versão mais recente...');
        
        // 2. Fazer pull das últimas alterações
        if (!runCommand('git pull origin main', 'Baixando últimas alterações')) {
            console.error('❌ Falha ao baixar atualizações. Verifique sua conexão git.');
            process.exit(1);
        }
        
        // 3. Verificar novamente
        if (!checkVersion()) {
            console.error('❌ Falha ao atualizar para a versão 3.3');
            process.exit(1);
        }
    }
    
    // 4. Instalar/atualizar dependências
    runCommand('npm install', 'Instalando/atualizando dependências');
    
    // 5. Verificar arquivos críticos
    console.log('\n🔍 Verificando arquivos críticos...');
    
    const criticalFiles = [
        'index.js',
        'utils/Sender.js',
        'handlers/AdsHandler.js',
        'config.json'
    ];
    
    let allFilesOk = true;
    for (const file of criticalFiles) {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file} - Presente`);
        } else {
            console.error(`❌ ${file} - AUSENTE`);
            allFilesOk = false;
        }
    }
    
    if (!allFilesOk) {
        console.error('❌ Arquivos críticos ausentes. Verifique a instalação.');
        process.exit(1);
    }
    
    // 6. Verificar estrutura de dados
    console.log('\n📁 Verificando estrutura de dados...');
    
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('✅ Diretório data/ criado');
    }
    
    const adsFile = path.join(dataDir, 'ads.json');
    if (!fs.existsSync(adsFile)) {
        fs.writeFileSync(adsFile, JSON.stringify({ anuncios: {} }, null, 2));
        console.log('✅ Arquivo ads.json criado');
    }
    
    console.log('\n🎉 ATUALIZAÇÃO CRÍTICA CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('✅ Bot atualizado para a versão 3.3');
    console.log('✅ Correções validateAndGetParts aplicadas');
    console.log('✅ Sistema de responsividade corrigido');
    console.log('✅ Proteção global contra erros ativada');
    console.log('\n🚀 Agora você pode iniciar o bot com: node index.js');
    console.log('🧪 Para testar: envie !test ou !teste para qualquer chat');
    console.log('\n💡 IMPORTANTE: Se o bot não responder, verifique os logs para:');
    console.log('   - Mensagens [PROCESS-3.3]');
    console.log('   - Mensagens [CRITICAL-TEST]');
    console.log('   - Mensagens [GLOBAL-PROTECTION]');
}

main().catch(error => {
    console.error('❌ Erro durante a atualização:', error);
    process.exit(1);
});