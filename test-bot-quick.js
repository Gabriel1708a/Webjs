#!/usr/bin/env node
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
