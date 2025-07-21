const fs = require('fs-extra');
const path = require('path');

console.log('🔍 VERIFICAÇÃO DE SESSÃO');
console.log('========================');
console.log('');

const sessionPath = path.join(__dirname, '.wwebjs_auth', 'session-bot-admin');

async function checkSession() {
    try {
        if (await fs.pathExists(sessionPath)) {
            const stats = await fs.stat(sessionPath);
            const lastModified = stats.mtime.toLocaleString('pt-BR');
            
            console.log('✅ Sessão encontrada!');
            console.log(`📅 Última modificação: ${lastModified}`);
            console.log('');
            console.log('🎯 STATUS: Pronto para npm start');
            
            // Verificar se há arquivos de sessão
            const files = await fs.readdir(sessionPath);
            if (files.length > 0) {
                console.log(`📁 Arquivos de sessão: ${files.length} encontrados`);
            }
            
        } else {
            console.log('❌ Nenhuma sessão encontrada!');
            console.log('');
            console.log('🔧 SOLUÇÕES:');
            console.log('1. Execute: node fix-session.js');
            console.log('2. Execute: node test-qr.js');
            console.log('3. Escaneie o QR Code');
            console.log('4. Execute: npm start');
        }
        
        console.log('');
        console.log('💡 Dica: Se npm start ainda pedir código,');
        console.log('   execute fix-session.js primeiro!');
        
    } catch (error) {
        console.error('❌ Erro ao verificar sessão:', error.message);
    }
}

checkSession();