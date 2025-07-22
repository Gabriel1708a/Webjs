const fs = require('fs-extra');
const path = require('path');

console.log('🔧 LIMPEZA COMPLETA DE SESSÃO');
console.log('=============================');
console.log('');

const sessionPath = path.join(__dirname, '.wwebjs_auth');
const cooldownFile = path.join(__dirname, '.last_clean');
const COOLDOWN_TIME = 60 * 1000; // 1 minuto em ms

async function cleanSession() {
    try {
        // Verificar cooldown
        if (await fs.pathExists(cooldownFile)) {
            const lastClean = await fs.readFile(cooldownFile, 'utf8');
            const lastCleanTime = parseInt(lastClean);
            const now = Date.now();
            const timeSinceLastClean = now - lastCleanTime;
            
            if (timeSinceLastClean < COOLDOWN_TIME) {
                const remainingTime = Math.ceil((COOLDOWN_TIME - timeSinceLastClean) / 1000);
                console.log('⏰ COOLDOWN ATIVO');
                console.log(`⏳ Aguarde ${remainingTime} segundos antes de limpar novamente`);
                console.log('');
                console.log('💡 MOTIVO: Evitar limpezas muito frequentes');
                console.log('🎯 ENQUANTO ISSO: Tente node test-qr.js');
                return;
            }
        }
        
        // Limpar sessões
        if (await fs.pathExists(sessionPath)) {
            await fs.remove(sessionPath);
            console.log('✅ Sessão antiga removida com sucesso!');
        } else {
            console.log('ℹ️  Nenhuma sessão antiga encontrada.');
        }
        
        // Limpar cache também
        const cachePath = path.join(__dirname, '.wwebjs_cache');
        if (await fs.pathExists(cachePath)) {
            await fs.remove(cachePath);
            console.log('✅ Cache removido com sucesso!');
        }
        
        // Salvar timestamp da limpeza
        await fs.writeFile(cooldownFile, Date.now().toString());
        
        console.log('');
        console.log('🎯 PRÓXIMOS PASSOS:');
        console.log('1. Execute: npm start');
        console.log('2. Escaneie o QR Code');
        console.log('3. Aguarde "Conectado com sucesso!"');
        console.log('');
        console.log('💡 QR Code é mais confiável que código!');
        console.log('⏰ Próxima limpeza em 1 minuto (se necessário)');
        
    } catch (error) {
        console.error('❌ Erro ao limpar sessão:', error.message);
    }
}

cleanSession();