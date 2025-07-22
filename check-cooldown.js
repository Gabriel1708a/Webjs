const fs = require('fs-extra');
const path = require('path');

console.log('⏰ VERIFICAÇÃO DE COOLDOWN');
console.log('=========================');
console.log('');

const cooldownFile = path.join(__dirname, '.last_clean');
const COOLDOWN_TIME = 60 * 1000; // 1 minuto em ms

async function checkCooldown() {
    try {
        if (await fs.pathExists(cooldownFile)) {
            const lastClean = await fs.readFile(cooldownFile, 'utf8');
            const lastCleanTime = parseInt(lastClean);
            const now = Date.now();
            const timeSinceLastClean = now - lastCleanTime;
            
            if (timeSinceLastClean < COOLDOWN_TIME) {
                const remainingTime = Math.ceil((COOLDOWN_TIME - timeSinceLastClean) / 1000);
                console.log('🚫 COOLDOWN ATIVO');
                console.log(`⏳ Tempo restante: ${remainingTime} segundos`);
                console.log('');
                console.log('🎯 ENQUANTO ISSO:');
                console.log('• Tente: npm start');
                console.log('• Ou: node test-qr.js');
                console.log('• Aguarde o cooldown terminar');
            } else {
                console.log('✅ COOLDOWN EXPIRADO');
                console.log('🔧 Você pode executar fix-session.js');
                console.log('');
                const lastCleanDate = new Date(lastCleanTime).toLocaleString('pt-BR');
                console.log(`📅 Última limpeza: ${lastCleanDate}`);
            }
        } else {
            console.log('ℹ️  NENHUMA LIMPEZA ANTERIOR');
            console.log('🔧 Você pode executar fix-session.js');
            console.log('');
            console.log('💡 Primeira vez? Execute diretamente!');
        }
        
        console.log('');
        console.log('📋 COMANDOS DISPONÍVEIS:');
        console.log('• node fix-session.js    - Limpar sessão');
        console.log('• node test-qr.js        - QR Code dedicado');
        console.log('• node test-pairing.js   - Código de pareamento');
        console.log('• npm start              - Bot principal');
        
    } catch (error) {
        console.error('❌ Erro ao verificar cooldown:', error.message);
    }
}

checkCooldown();