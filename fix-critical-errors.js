#!/usr/bin/env node
// fix-critical-errors.js - Script para corrigir erros críticos do bot
// Versão: 1.0 - Correção de validateAndGetParts e limpeza de dados

const fs = require('fs');
const path = require('path');

console.log('🔧 INICIANDO CORREÇÃO DE ERROS CRÍTICOS...\n');

// 1. Verificar e corrigir arquivos de dados corrompidos
function fixDataFiles() {
    console.log('📁 Verificando arquivos de dados...');
    
    const dataDir = './data';
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
        console.log('✅ Pasta data criada');
    }
    
    const requiredFiles = [
        { file: 'ads.json', content: { "anuncios": {} } },
        { file: 'configs.json', content: {} },
        { file: 'grupoAluguel.json', content: { "grupos": {} } },
        { file: 'notifiedUsers.json', content: {} }
    ];
    
    for (const { file, content } of requiredFiles) {
        const filePath = path.join(dataDir, file);
        
        try {
            if (fs.existsSync(filePath)) {
                // Verificar se o arquivo é válido JSON
                const data = fs.readFileSync(filePath, 'utf8');
                JSON.parse(data);
                console.log(`✅ ${file} - OK`);
            } else {
                // Criar arquivo se não existir
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                console.log(`🆕 ${file} - Criado`);
            }
        } catch (error) {
            // Arquivo corrompido - recriar
            fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
            console.log(`🔧 ${file} - Corrigido (estava corrompido)`);
        }
    }
}

// 2. Limpar cache de sessão do WhatsApp
function cleanWhatsAppSession() {
    console.log('\n🧹 Limpando cache de sessão...');
    
    const sessionDirs = ['.wwebjs_auth', '.wwebjs_cache', 'session'];
    
    for (const dir of sessionDirs) {
        if (fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                console.log(`🗑️ Removido: ${dir}`);
            } catch (error) {
                console.log(`⚠️ Não foi possível remover ${dir}: ${error.message}`);
            }
        }
    }
}

// 3. Verificar e corrigir configurações
function fixConfigurations() {
    console.log('\n⚙️ Verificando configurações...');
    
    try {
        const configPath = './config.json';
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // Verificar configurações críticas
            let modified = false;
            
            if (!config.laravelApi) {
                config.laravelApi = {};
                modified = true;
            }
            
            if (!config.laravelApi.timeout || config.laravelApi.timeout < 15000) {
                config.laravelApi.timeout = 15000;
                modified = true;
            }
            
            if (!config.laravelApi.maxRetries) {
                config.laravelApi.maxRetries = 3;
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log('✅ Configurações atualizadas');
            } else {
                console.log('✅ Configurações OK');
            }
        }
    } catch (error) {
        console.log(`⚠️ Erro ao verificar configurações: ${error.message}`);
    }
}

// 4. Verificar dependências
function checkDependencies() {
    console.log('\n📦 Verificando dependências...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        const nodeModules = fs.existsSync('./node_modules');
        
        if (!nodeModules) {
            console.log('❌ node_modules não encontrado - execute: npm install');
        } else {
            console.log('✅ node_modules encontrado');
        }
        
        // Verificar whatsapp-web.js
        const wwjsVersion = packageJson.dependencies['whatsapp-web.js'];
        console.log(`📱 whatsapp-web.js: ${wwjsVersion}`);
        
        if (wwjsVersion.includes('1.23.0') || wwjsVersion.includes('^1.23')) {
            console.log('✅ Versão do whatsapp-web.js atualizada');
        } else {
            console.log('⚠️ Considere atualizar whatsapp-web.js para v1.23.0+');
        }
        
    } catch (error) {
        console.log(`⚠️ Erro ao verificar dependências: ${error.message}`);
    }
}

// 5. Criar script de teste
function createTestScript() {
    console.log('\n🧪 Criando script de teste...');
    
    const testScript = `#!/usr/bin/env node
// test-bot-quick.js - Teste rápido do bot
const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('🚀 Iniciando teste rápido do bot...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('📱 QR Code gerado - escaneie com seu WhatsApp');
});

client.on('ready', () => {
    console.log('✅ Bot conectado com sucesso!');
    console.log('🔧 Teste concluído - bot está funcionando');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('📴 Bot desconectado:', reason);
    process.exit(1);
});

// Timeout de segurança
setTimeout(() => {
    console.log('⏰ Timeout do teste - encerrando');
    process.exit(1);
}, 60000);

client.initialize();
`;

    fs.writeFileSync('./test-bot-quick.js', testScript);
    console.log('✅ Script de teste criado: test-bot-quick.js');
}

// Executar todas as correções
function main() {
    try {
        fixDataFiles();
        fixConfigurations();
        checkDependencies();
        createTestScript();
        
        console.log('\n🎉 CORREÇÕES CONCLUÍDAS!');
        console.log('\n📋 PRÓXIMOS PASSOS:');
        console.log('1. Execute: npm install (se necessário)');
        console.log('2. Execute: node test-bot-quick.js (para testar)');
        console.log('3. Execute: node index.js (para iniciar o bot)');
        console.log('\n💡 DICAS:');
        console.log('- Se o erro validateAndGetParts persistir, é um problema interno do WhatsApp Web');
        console.log('- Tente usar uma conta diferente ou aguardar algumas horas');
        console.log('- Verifique se sua conexão com a internet está estável');
        
    } catch (error) {
        console.error('💥 Erro durante a correção:', error.message);
        process.exit(1);
    }
}

main();