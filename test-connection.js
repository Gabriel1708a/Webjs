const { Client, LocalAuth } = require('whatsapp-web.js');
const config = require('./config.json');

console.log('🔌 TESTE DE CONEXÃO - BOT WHATSAPP');
console.log('==================================');
console.log('');

// Cliente com mesmo ID do bot principal
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-admin'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('❌ QR Code recebido - sessão não está salva');
    console.log('💡 Execute: node test-pairing.js para gerar novo código');
    process.exit(1);
});

client.on('ready', () => {
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
    console.log('');
    console.log('📱 Informações do bot:');
    console.log(`   Número: ${client.info.wid.user}`);
    console.log(`   Nome: ${client.info.pushname}`);
    console.log('');
    console.log('🎉 Bot pronto para uso!');
    console.log('💡 Agora você pode executar: npm start');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação:', msg);
    console.log('💡 Execute: node test-pairing.js para gerar novo código');
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
    console.log('💡 Execute: node test-pairing.js para gerar novo código');
    process.exit(1);
});

console.log('🔄 Tentando conectar com sessão salva...');
client.initialize();

// Timeout de 30 segundos
setTimeout(() => {
    console.log('⏰ Timeout - conexão demorou muito');
    console.log('💡 Execute: node test-pairing.js para gerar novo código');
    process.exit(1);
}, 30000);