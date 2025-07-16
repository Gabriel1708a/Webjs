#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');

// Função para executar comandos e mostrar output
function runCommand(command, description) {
    console.log(chalk.blue(`\n🔄 ${description}...`));
    try {
        const output = execSync(command, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        console.log(chalk.green(`✅ ${description} concluído!`));
        if (output.trim()) {
            console.log(chalk.gray(output));
        }
        return true;
    } catch (error) {
        console.log(chalk.red(`❌ Erro em: ${description}`));
        console.log(chalk.red(error.message));
        return false;
    }
}

// Função para mostrar logo
function showLogo() {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                    🤖 BOT ADMIN UPDATER                      ║
║                   Sistema de Atualização                     ║
╚══════════════════════════════════════════════════════════════╝
`));
}

// Função para verificar se há atualizações
function checkForUpdates() {
    console.log(chalk.blue('\n🔍 Verificando atualizações...'));
    
    try {
        // Fazer fetch das últimas alterações
        execSync('git fetch origin', { stdio: 'pipe' });
        
        // Verificar se há commits novos
        const status = execSync('git status -uno', { encoding: 'utf8' });
        
        if (status.includes('Your branch is behind')) {
            console.log(chalk.yellow('📦 Novas atualizações disponíveis!'));
            return true;
        } else if (status.includes('Your branch is up to date')) {
            console.log(chalk.green('✅ Você já está na versão mais recente!'));
            return false;
        } else {
            console.log(chalk.blue('ℹ️ Status do repositório verificado.'));
            return true; // Prosseguir com a atualização mesmo assim
        }
    } catch (error) {
        console.log(chalk.red(`❌ Erro ao verificar atualizações: ${error.message}`));
        return false;
    }
}

// Função principal de atualização
async function updateBot() {
    showLogo();
    
    console.log(chalk.yellow('🚀 Iniciando processo de atualização...'));
    
    // Verificar atualizações
    const hasUpdates = checkForUpdates();
    if (!hasUpdates) {
        console.log(chalk.green('\n🎉 Nenhuma atualização necessária!'));
        return;
    }
    
    // Fazer stash das alterações locais se houver
    console.log(chalk.blue('\n💾 Salvando alterações locais...'));
    try {
        execSync('git stash', { stdio: 'pipe' });
        console.log(chalk.green('✅ Alterações locais salvas!'));
    } catch (error) {
        console.log(chalk.yellow('⚠️ Nenhuma alteração local para salvar.'));
    }
    
    // Fazer pull das atualizações
    if (!runCommand('git pull origin main', 'Baixando atualizações')) {
        console.log(chalk.red('\n❌ Falha na atualização.'));
        process.exit(1);
    }
    
    // Instalar dependências se necessário
    if (fs.existsSync('package.json')) {
        runCommand('npm install', 'Instalando dependências');
    }
    
    // Tentar restaurar stash
    try {
        execSync('git stash pop', { stdio: 'pipe' });
        console.log(chalk.green('✅ Alterações locais restauradas!'));
    } catch (error) {
        console.log(chalk.yellow('⚠️ Nenhuma alteração local para restaurar.'));
    }
    
    // Mostrar resultado final
    console.log(chalk.green(`
╔══════════════════════════════════════════════════════════════╗
║                    ✅ ATUALIZAÇÃO CONCLUÍDA!                 ║
║                                                              ║
║  🎉 Bot atualizado com sucesso!                              ║
║  🔄 Configurações preservadas                                ║
║                                                              ║
║  🚀 Execute: npm start                                       ║
║     Para iniciar o bot atualizado                           ║
╚══════════════════════════════════════════════════════════════╝
`));
}

// Executar se chamado diretamente
if (require.main === module) {
    updateBot().catch(error => {
        console.log(chalk.red(`❌ Erro fatal: ${error.message}`));
        process.exit(1);
    });
}

module.exports = { updateBot };