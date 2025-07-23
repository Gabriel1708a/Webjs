const { Client, LocalAuth } = require('whatsapp-web.js');
const config = require('./config.json');

console.log('🧪 TESTE DE PAREAMENTO - BOT WHATSAPP');
console.log('=====================================');
console.log('');
console.log(`📱 Número configurado: ${config.numeroBot}`);
console.log('');

// Cliente simplificado apenas para pareamento (MESMO clientId do index.js)
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

// Contador de tentativas
let tentativas = 0;
const maxTentativas = 3;

// Função para solicitar código
async function solicitarCodigo() {
    tentativas++;
    console.log(`🔄 Tentativa ${tentativas}/${maxTentativas} - Solicitando código...`);
    
    try {
        const pairingCode = await client.requestPairingCode(config.numeroBot);
        
        console.log('');
        console.log('🎉 ╔═══════════════════════════════╗');
        console.log('🎉 ║   CÓDIGO GERADO COM SUCESSO!  ║');
        console.log('🎉 ╠═══════════════════════════════╣');
        console.log(`🎉 ║           ${pairingCode}             ║`);
        console.log('🎉 ╚═══════════════════════════════╝');
        console.log('');
        console.log('📱 COMO USAR:');
        console.log('1. Abra WhatsApp no celular');
        console.log('2. Configurações > Aparelhos conectados');  
        console.log('3. "Conectar um aparelho"');
        console.log('4. "Usar código do telefone"');
        console.log(`5. Digite: ${pairingCode}`);
        console.log('');
        console.log('⏰ Código válido por alguns minutos!');
        console.log('✅ Após conectar, use Ctrl+C para sair');
        console.log('');
        
        return true;
    } catch (error) {
        console.error(`❌ Erro na tentativa ${tentativas}:`, error.message);
        
        if (tentativas < maxTentativas) {
            console.log('🔄 Tentando novamente em 3 segundos...');
            setTimeout(() => solicitarCodigo(), 3000);
        } else {
            console.log('');
            console.log('❌ Máximo de tentativas atingido!');
            console.log('');
            console.log('🔧 SOLUÇÕES:');
            console.log('1. Verifique se o número no config.json está correto');
            console.log('2. Certifique-se que inclui código do país (55 para Brasil)');
            console.log('3. Remova a pasta .wwebjs_auth se existir');
            console.log('4. Tente novamente');
            console.log('');
            process.exit(1);
        }
        return false;
    }
}

// Eventos do cliente
client.on('qr', (qr) => {
    console.log('⚠️ QR code recebido - tentando gerar código...');
    setTimeout(() => solicitarCodigo(), 1000);
});

client.on('ready', () => {
    console.log('✅ Cliente conectado com sucesso!');
    console.log('🎉 Pareamento funcionando!');
    console.log('');
    console.log('Agora você pode:');
    console.log('1. Fechar este teste (Ctrl+C)');
    console.log('2. Executar: npm start');
    console.log('');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Desconectado:', reason);
    process.exit(0);
});

// Inicializar teste
console.log('🚀 Inicializando teste de pareamento...');
client.initialize();

// Timeout de segurança
setTimeout(() => {
    if (tentativas === 0) {
        console.log('⏰ Timeout - nenhuma resposta em 30 segundos');
        console.log('❌ Verifique sua conexão e tente novamente');
        process.exit(1);
    }
}, 30000);