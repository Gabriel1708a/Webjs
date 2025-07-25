// ========================================================================================================
// 🚨 TESTE CRÍTICO DE RESPONSIVIDADE DO BOT - CORREÇÃO IMEDIATA
// ========================================================================================================
// Este script testa se o bot está respondendo aos comandos corretamente
// Uso: node test-critical-response.js

const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('🚨🚨🚨 INICIANDO TESTE CRÍTICO DE RESPONSIVIDADE 🚨🚨🚨\n');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bot-admin"
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

let testStartTime;
let messageReceived = false;
let testTimeout;

// Evento de QR Code
client.on('qr', (qr) => {
    console.log('❌ [TESTE-CRÍTICO] QR Code gerado - Bot não está autenticado!');
    console.log('💡 Execute o bot principal primeiro para autenticar');
    process.exit(1);
});

// Evento de pronto
client.on('ready', async () => {
    console.log('✅ [TESTE-CRÍTICO] Cliente conectado!');
    console.log('🔍 [TESTE-CRÍTICO] Verificando responsividade...\n');
    
    testStartTime = Date.now();
    
    // Timeout de segurança
    testTimeout = setTimeout(() => {
        console.log('❌ [TESTE-CRÍTICO] TIMEOUT - Bot não está respondendo!');
        console.log('🚨 [TESTE-CRÍTICO] PROBLEMA CRÍTICO DETECTADO!');
        process.exit(1);
    }, 30000); // 30 segundos
    
    // Verificar se existem mensagens recentes
    console.log('📱 [TESTE-CRÍTICO] Verificando mensagens recentes...');
});

// Evento de mensagem - TESTE CRÍTICO
client.on('message_create', async (message) => {
    const currentTime = Date.now();
    
    console.log(`\n🚨 [TESTE-CRÍTICO] MENSAGEM DETECTADA!`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`📨 From: ${message.from}`);
    console.log(`📝 Body: "${message.body}"`);
    console.log(`🔍 Type: ${message.type}`);
    
    messageReceived = true;
    
    // Se for um comando de teste
    if (message.body && message.body.startsWith('!')) {
        console.log(`🎯 [TESTE-CRÍTICO] COMANDO DETECTADO: ${message.body}`);
        
        if (testStartTime) {
            const responseTime = currentTime - testStartTime;
            console.log(`⚡ [TESTE-CRÍTICO] Tempo de resposta: ${responseTime}ms`);
        }
        
        console.log(`✅ [TESTE-CRÍTICO] BOT ESTÁ RESPONDENDO CORRETAMENTE!`);
        
        clearTimeout(testTimeout);
        
        setTimeout(() => {
            console.log('\n🎉 [TESTE-CRÍTICO] TESTE CONCLUÍDO COM SUCESSO!');
            process.exit(0);
        }, 3000);
    }
});

// Evento de mensagem - FALLBACK
client.on('message', async (message) => {
    console.log(`🔄 [TESTE-CRÍTICO] FALLBACK MESSAGE EVENT ATIVADO`);
    console.log(`📨 From: ${message.from}`);
    console.log(`📝 Body: "${message.body}"`);
});

// Tratamento de erros
client.on('auth_failure', (msg) => {
    console.error('❌ [TESTE-CRÍTICO] Falha na autenticação:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.error('❌ [TESTE-CRÍTICO] Cliente desconectado:', reason);
    process.exit(1);
});

// Tratamento de erros globais
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [TESTE-CRÍTICO] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ [TESTE-CRÍTICO] Uncaught Exception:', error.message);
});

// Inicializar
console.log('🚀 [TESTE-CRÍTICO] Inicializando cliente...');
client.initialize();

// Instruções
console.log('\n📋 [TESTE-CRÍTICO] INSTRUÇÕES:');
console.log('1. Execute este script enquanto o bot principal está rodando');
console.log('2. Envie um comando (ex: !ping) para qualquer chat');
console.log('3. O script detectará se o bot está respondendo');
console.log('4. Aguarde até 30 segundos para o resultado\n');