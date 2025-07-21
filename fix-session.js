const fs = require('fs-extra');
const path = require('path');

console.log('🔧 LIMPEZA COMPLETA DE SESSÃO');
console.log('=============================');
console.log('');

const sessionPath = path.join(__dirname, '.wwebjs_auth', 'session-bot-admin');

async function cleanSession() {
    try {
        if (await fs.pathExists(sessionPath)) {
            await fs.remove(sessionPath);
            console.log('✅ Sessão antiga removida com sucesso!');
        } else {
            console.log('ℹ️  Nenhuma sessão antiga encontrada.');
        }
        
        console.log('');
        console.log('🎯 PRÓXIMOS PASSOS:');
        console.log('1. Execute: node test-qr.js');
        console.log('2. Escaneie o QR Code');
        console.log('3. Aguarde "Conectado com sucesso!"');
        console.log('4. Execute: npm start');
        console.log('');
        console.log('💡 Agora ambos usarão a mesma sessão nova!');
        
    } catch (error) {
        console.error('❌ Erro ao limpar sessão:', error.message);
    }
}

cleanSession();