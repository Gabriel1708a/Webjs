const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config.json');

console.log('📱 TESTE QR CODE - BOT WHATSAPP');
console.log('===============================');
console.log('');
console.log('💡 Usando QR Code tradicional (sem limite de tentativas)');
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
    console.log('📱 QR CODE GERADO COM SUCESSO!');
    console.log('================================');
    console.log('');
    
    // Gerar QR code no terminal
    qrcode.generate(qr, { small: true });
    
    console.log('');
    console.log('📱 COMO USAR:');
    console.log('1. Abra WhatsApp no celular');
    console.log('2. Configurações > Aparelhos conectados');
    console.log('3. "Conectar um aparelho"');
    console.log('4. Aponte a câmera para o QR Code acima');
    console.log('');
    console.log('⏰ QR Code válido por alguns minutos!');
    console.log('✅ Após conectar, use Ctrl+C para sair');
    console.log('');
});

client.on('ready', () => {
    console.log('');
    console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO!');
    console.log('');
    console.log('📱 Informações do bot:');
    console.log(`   Número: ${client.info.wid.user}`);
    console.log(`   Nome: ${client.info.pushname}`);
    console.log('');
    console.log('🎉 Bot pronto para uso!');
    console.log('🔄 Sessão salva para o bot principal!');
    console.log('');
    console.log('🚀 PRÓXIMO PASSO:');
    console.log('   Execute: npm start');
    console.log('');
    console.log('💡 O bot principal agora usará esta sessão!');
    console.log('');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.log('❌ Falha na autenticação:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
    process.exit(1);
});

console.log('🔄 Inicializando cliente para gerar QR Code...');
client.initialize();

// Timeout de 2 minutos para QR Code
setTimeout(() => {
    console.log('');
    console.log('⏰ Timeout - QR Code expirou');
    console.log('💡 Execute novamente: node test-qr.js');
    process.exit(1);
}, 120000);