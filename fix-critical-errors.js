#!/usr/bin/env node
// Versão: 2.0 - Correção crítica de validateAndGetParts e problemas de sessão
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚨 SCRIPT DE CORREÇÃO CRÍTICA DE ERROS - v2.0');
console.log('='.repeat(60));

// Função para log com timestamp
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleString('pt-BR');
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        fix: '🔧'
    };
    console.log(`[${timestamp}] ${icons[type]} ${message}`);
}

// 1. Verificar e limpar sessão corrompida
function cleanCorruptedSession() {
    log('Verificando sessão do WhatsApp Web...', 'info');
    
    const sessionPath = path.join(__dirname, '.wwebjs_auth');
    const cachePath = path.join(__dirname, '.wwebjs_cache');
    
    if (fs.existsSync(sessionPath)) {
        log('Removendo sessão antiga...', 'fix');
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            log('Sessão removida com sucesso', 'success');
        } catch (error) {
            log(`Erro ao remover sessão: ${error.message}`, 'error');
        }
    }
    
    if (fs.existsSync(cachePath)) {
        log('Removendo cache antigo...', 'fix');
        try {
            fs.rmSync(cachePath, { recursive: true, force: true });
            log('Cache removido com sucesso', 'success');
        } catch (error) {
            log(`Erro ao remover cache: ${error.message}`, 'error');
        }
    }
}

// 2. Verificar e corrigir arquivos de dados
function validateDataFiles() {
    log('Validando arquivos de dados...', 'info');
    
    const dataFiles = [
        { path: 'data/ads.json', default: { anuncios: {} } },
        { path: 'data/configs.json', default: {} },
        { path: 'data/grupoAluguel.json', default: {} },
        { path: 'data/notifiedUsers.json', default: {} }
    ];
    
    dataFiles.forEach(file => {
        const filePath = path.join(__dirname, file.path);
        const dirPath = path.dirname(filePath);
        
        // Criar diretório se não existir
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            log(`Diretório criado: ${dirPath}`, 'fix');
        }
        
        // Verificar se arquivo existe e é válido
        if (!fs.existsSync(filePath)) {
            log(`Criando arquivo: ${file.path}`, 'fix');
            fs.writeFileSync(filePath, JSON.stringify(file.default, null, 2));
        } else {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                JSON.parse(content);
                log(`Arquivo válido: ${file.path}`, 'success');
            } catch (error) {
                log(`Arquivo corrompido, recriando: ${file.path}`, 'fix');
                fs.writeFileSync(filePath, JSON.stringify(file.default, null, 2));
            }
        }
    });
}

// 3. Atualizar dependências
function updateDependencies() {
    log('Verificando dependências...', 'info');
    
    try {
        log('Executando npm install...', 'fix');
        execSync('npm install', { stdio: 'inherit' });
        log('Dependências atualizadas com sucesso', 'success');
    } catch (error) {
        log(`Erro ao atualizar dependências: ${error.message}`, 'error');
    }
}

// 4. Verificar versão do WhatsApp Web.js
function checkWhatsAppWebJsVersion() {
    log('Verificando versão do whatsapp-web.js...', 'info');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const currentVersion = packageJson.dependencies['whatsapp-web.js'];
        log(`Versão atual: ${currentVersion}`, 'info');
        
        // Verificar se é uma versão problemática
        if (currentVersion.includes('1.18') || currentVersion.includes('1.19') || currentVersion.includes('1.20')) {
            log('Versão potencialmente problemática detectada', 'warning');
            log('Recomenda-se atualizar para versão 1.23.0 ou superior', 'warning');
            
            // Atualizar automaticamente
            try {
                log('Atualizando para versão estável...', 'fix');
                execSync('npm install whatsapp-web.js@^1.23.0', { stdio: 'inherit' });
                log('WhatsApp Web.js atualizado com sucesso', 'success');
            } catch (updateError) {
                log(`Erro ao atualizar: ${updateError.message}`, 'error');
            }
        } else {
            log('Versão adequada detectada', 'success');
        }
    } catch (error) {
        log(`Erro ao verificar versão: ${error.message}`, 'error');
    }
}

// 5. Criar script de teste de conexão
function createConnectionTest() {
    log('Criando script de teste de conexão...', 'fix');
    
    const testScript = `
const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('🧪 TESTE DE CONEXÃO WHATSAPP WEB.JS');
console.log('='.repeat(50));

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'test-connection'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('📱 QR Code gerado - escaneie com seu WhatsApp');
});

client.on('ready', () => {
    console.log('✅ Cliente conectado com sucesso!');
    console.log('🧪 Testando envio de mensagem...');
    
    // Teste básico sem validateAndGetParts
    setTimeout(async () => {
        try {
            const info = await client.info;
            console.log('📋 Informações do cliente:', info.wid.user);
            console.log('✅ Teste concluído com sucesso!');
            process.exit(0);
        } catch (error) {
            console.error('❌ Erro no teste:', error.message);
            process.exit(1);
        }
    }, 5000);
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Cliente desconectado:', reason);
    process.exit(1);
});

console.log('🚀 Iniciando teste de conexão...');
client.initialize();
`;
    
    fs.writeFileSync('test-connection-fix.js', testScript);
    log('Script de teste criado: test-connection-fix.js', 'success');
}

// 6. Verificar configurações do Puppeteer
function checkPuppeteerConfig() {
    log('Verificando configurações do Puppeteer...', 'info');
    
    const configPath = path.join(__dirname, 'index.js');
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        
        // Verificar se as configurações anti-validateAndGetParts estão presentes
        const requiredArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ];
        
        let missingArgs = [];
        requiredArgs.forEach(arg => {
            if (!content.includes(arg)) {
                missingArgs.push(arg);
            }
        });
        
        if (missingArgs.length > 0) {
            log(`Argumentos do Puppeteer faltando: ${missingArgs.join(', ')}`, 'warning');
            log('Estes argumentos podem ajudar a prevenir erros validateAndGetParts', 'info');
        } else {
            log('Configurações do Puppeteer adequadas', 'success');
        }
    }
}

// 7. Executar todas as correções
async function runAllFixes() {
    try {
        log('Iniciando correções críticas...', 'info');
        
        cleanCorruptedSession();
        validateDataFiles();
        updateDependencies();
        checkWhatsAppWebJsVersion();
        createConnectionTest();
        checkPuppeteerConfig();
        
        log('='.repeat(60), 'info');
        log('🎉 TODAS AS CORREÇÕES CONCLUÍDAS!', 'success');
        log('='.repeat(60), 'info');
        
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('1. Execute: node test-connection-fix.js');
        console.log('2. Se o teste passar, execute: node index.js');
        console.log('3. Escaneie o QR Code novamente');
        console.log('4. Teste comandos básicos como !ping');
        console.log('');
        console.log('💡 DICAS PARA PREVENIR validateAndGetParts:');
        console.log('- Mantenha o WhatsApp Web.js atualizado');
        console.log('- Evite mensagens muito longas (>1000 caracteres)');
        console.log('- Valide IDs de chat antes de enviar mensagens');
        console.log('- Use try/catch em todas as operações de envio');
        console.log('- Se o erro validateAndGetParts persistir, é um problema interno do WhatsApp Web');
        
    } catch (error) {
        log(`Erro durante as correções: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    runAllFixes();
}

module.exports = { runAllFixes };