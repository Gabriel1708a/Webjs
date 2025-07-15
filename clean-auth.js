#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

console.log('🧹 LIMPEZA DE AUTENTICAÇÃO CORROMPIDA');
console.log('=====================================');
console.log('');

try {
    const authPath = './.wwebjs_auth';
    const cachePath = './.wwebjs_cache';
    
    let removido = false;
    
    if (fs.existsSync(authPath)) {
        fs.removeSync(authPath);
        console.log('✅ Pasta .wwebjs_auth removida');
        removido = true;
    }
    
    if (fs.existsSync(cachePath)) {
        fs.removeSync(cachePath);
        console.log('✅ Pasta .wwebjs_cache removida');
        removido = true;
    }
    
    if (!removido) {
        console.log('ℹ️  Nenhuma autenticação encontrada para limpar');
    } else {
        console.log('');
        console.log('🎉 Limpeza concluída com sucesso!');
        console.log('');
        console.log('📝 PRÓXIMOS PASSOS:');
        console.log('1. npm run test-pairing  (para testar)');
        console.log('2. npm start             (para usar o bot)');
    }
    
    console.log('');
    
} catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
    process.exit(1);
}