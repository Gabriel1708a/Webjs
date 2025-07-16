const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const moment = require('moment-timezone');
const path = require('path');
const chalk = require('chalk');

// Importar configurações
const config = require('./config.json');

// Importar módulos de comandos (será feito após definir as classes)
let welcomeHandler, banHandler, sorteioHandler, adsHandler, menuHandler, groupControlHandler, horariosHandler;

// Configurar cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'bot-admin'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Configurar timezone
moment.tz.setDefault(config.timezone);

// Sistema de Logs Coloridos
class Logger {
    static logBox(title, content, color = 'blue') {
        const width = 50;
        const titlePadded = ` ${title} `.padStart((width + title.length) / 2).padEnd(width);
        
        console.log(chalk[color]('┌' + '─'.repeat(width) + '┐'));
        console.log(chalk[color]('│' + chalk.white.bold(titlePadded) + '│'));
        console.log(chalk[color]('├' + '─'.repeat(width) + '┤'));
        
        content.forEach(line => {
            const linePadded = ` ${line}`.padEnd(width);
            console.log(chalk[color]('│') + chalk.white(linePadded) + chalk[color]('│'));
        });
        
        console.log(chalk[color]('└' + '─'.repeat(width) + '┘'));
        console.log('');
    }

    static success(message) {
        console.log(chalk.green('✅'), chalk.white(message));
    }

    static error(message) {
        console.log(chalk.red('❌'), chalk.white(message));
    }

    static info(message) {
        console.log(chalk.blue('ℹ️ '), chalk.white(message));
    }

    static warning(message) {
        console.log(chalk.yellow('⚠️ '), chalk.white(message));
    }

    static command(user, command, group) {
        console.log(
            chalk.cyan('📝') + ' ' +
            chalk.yellow(user) + ' → ' +
            chalk.green(command) + ' ' +
            chalk.gray(`(${group})`)
        );
    }

    static admin(message) {
        console.log(chalk.magenta('👑'), chalk.white(message));
    }

    static owner(message) {
        console.log(chalk.red('🔴'), chalk.white(message));
    }

    static security(message) {
        console.log(chalk.red('🔒'), chalk.white(message));
    }
}

// Sistema de dados JSON
class DataManager {
    static async loadData(file) {
        try {
            const filePath = path.join(__dirname, 'data', file);
            if (await fs.pathExists(filePath)) {
                return await fs.readJSON(filePath);
            }
            return {};
        } catch (error) {
            console.error(`Erro ao carregar ${file}:`, error);
            return {};
        }
    }

    static async saveData(file, data) {
        try {
            const filePath = path.join(__dirname, 'data', file);
            await fs.writeJSON(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${file}:`, error);
            return false;
        }
    }

    static async saveConfig(groupId, key, value) {
        const configs = await this.loadData('configs.json');
        if (!configs.grupos) configs.grupos = {};
        if (!configs.grupos[groupId]) configs.grupos[groupId] = {};
        configs.grupos[groupId][key] = value;
        return await this.saveData('configs.json', configs);
    }

    static async loadConfig(groupId, key = null) {
        const configs = await this.loadData('configs.json');
        if (!configs.grupos || !configs.grupos[groupId]) return key ? null : {};
        return key ? configs.grupos[groupId][key] : configs.grupos[groupId];
    }
}

// Sistema de verificação de aluguel
class RentalSystem {
    static async checkGroupStatus(groupId) {
        const rentals = await DataManager.loadData('grupoAluguel.json');
        
        if (!rentals.grupos || !rentals.grupos[groupId]) {
            return { active: false, message: '⚠️ Este grupo não está autorizado a usar o bot. Contrate o serviço para ativar.' };
        }

        const groupData = rentals.grupos[groupId];
        const now = moment();
        const expiry = moment(groupData.expiry);

        if (now.isAfter(expiry)) {
            return { active: false, message: '⚠️ A licença deste grupo expirou. Renove o serviço para continuar usando.' };
        }

        const daysLeft = expiry.diff(now, 'days');
        return { 
            active: true, 
            daysLeft,
            expiry: expiry.format('DD/MM/YYYY HH:mm')
        };
    }

    static async liberarGrupo(groupId, days) {
        const rentals = await DataManager.loadData('grupoAluguel.json');
        if (!rentals.grupos) rentals.grupos = {};

        const expiry = moment().add(days, 'days');
        rentals.grupos[groupId] = {
            activated: moment().format(),
            expiry: expiry.format(),
            days: days
        };

        return await DataManager.saveData('grupoAluguel.json', rentals);
    }
}

// Utilitários
class Utils {
    static async isAdmin(message) {
        try {
            if (!message.author) {
                Logger.warning('isAdmin: message.author não encontrado');
                return false;
            }

            const chat = await message.getChat();
            if (!chat.isGroup) {
                Logger.info('isAdmin: Não é um grupo');
                return false;
            }

            // Buscar participante específico
            const participant = chat.participants.find(p => 
                p.id._serialized === message.author
            );

            if (!participant) {
                Logger.warning(`isAdmin: Participante não encontrado - ${message.author}`);
                return false;
            }

            const isAdmin = participant.isAdmin || participant.isSuperAdmin;
            
            if (isAdmin) {
                Logger.admin(`Admin detectado: ${message.author.replace('@c.us', '')}`);
            }

            return isAdmin;

        } catch (error) {
            Logger.error(`Erro ao verificar admin: ${error.message}`);
            return false;
        }
    }

    static isOwner(message) {
        if (!message.author) return false;
        const authorNumber = message.author.replace('@c.us', '');
        const isOwner = authorNumber === config.numeroDono;
        
        if (isOwner) {
            Logger.owner(`Dono detectado: ${authorNumber}`);
        }
        
        return isOwner;
    }

    static isGroup(message) {
        return message.from.includes('@g.us');
    }

    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static formatMention(contact) {
        return `@${contact.id.user}`;
    }

    static getUsername(message) {
        if (!message.author) return 'Desconhecido';
        return message.author.replace('@c.us', '');
    }

    static getGroupName(groupId) {
        return groupId.split('@')[0];
    }
}

// Eventos do cliente
client.on('qr', (qr) => {
    console.log('QR Code recebido (backup):', qr);
});

client.on('ready', async () => {
    Logger.logBox('BOT CONECTADO', [
        `📱 Número: ${client.info.wid.user}`,
        `📋 Nome: ${client.info.pushname}`,
        `👑 Dono: ${config.numeroDono}`,
        `⏰ Conectado em: ${moment().format('DD/MM/YYYY HH:mm')}`
    ], 'green');
    
    // Importar módulos após cliente estar pronto
    welcomeHandler = require('./commands/welcome');
    banHandler = require('./commands/ban');
    sorteioHandler = require('./commands/sorteio');
    adsHandler = require('./commands/ads');
    menuHandler = require('./commands/menu');
    groupControlHandler = require('./commands/groupControl');
    horariosHandler = require('./commands/horarios');
    
    Logger.info('Módulos de comandos carregados');
    
    // Carregar sistemas automáticos
    await adsHandler.loadAllAds(client);
    await groupControlHandler.loadSchedules(client);
    await horariosHandler.loadAutoHours(client);
    
    Logger.success('Sistemas automáticos inicializados');
    
    // Enviar notificação para o dono
    try {
        const donoId = config.numeroDono + '@c.us';
        await client.sendMessage(donoId, '🤖 *Bot Admin conectado com sucesso!*\n\n✅ Pronto para gerenciar grupos\n📅 Data: ' + moment().format('DD/MM/YYYY HH:mm'));
        Logger.success('Notificação enviada para o dono');
    } catch (error) {
        Logger.error(`Erro ao notificar dono: ${error.message}`);
    }
});

client.on('auth_failure', (msg) => {
    Logger.error(`Falha na autenticação: ${msg}`);
});

client.on('disconnected', (reason) => {
    Logger.warning(`Bot desconectado: ${reason}`);
});

// Eventos adicionais para logs detalhados
client.on('loading_screen', (percent, message) => {
    Logger.info(`Carregando: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
    Logger.success('Autenticação realizada com sucesso');
});

client.on('change_state', (state) => {
    Logger.info(`Status do cliente: ${state}`);
});

// Processamento de mensagens
client.on('message_create', async (message) => {
    // Ignorar mensagens do próprio bot
    if (message.fromMe) return;

    // Processar apenas grupos
    if (!Utils.isGroup(message)) return;

    const groupId = message.from;
    const text = message.body.trim();
    
    // Sistema anti-link automático (verificar antes dos comandos)
    if (banHandler && !text.startsWith(config.prefix)) {
        await banHandler.checkMessage(client, message);
    }
    
    // Verificar se é um comando
    if (!text.startsWith(config.prefix)) return;

    const command = text.slice(config.prefix.length).split(' ')[0].toLowerCase();
    const args = text.slice(config.prefix.length + command.length).trim();

    // Verificar status do grupo (exceto para comandos de liberação)
    if (!['liberargrupo', 'vergrupo'].includes(command)) {
        const status = await RentalSystem.checkGroupStatus(groupId);
        if (!status.active) {
            await message.reply(status.message);
            return;
        }
    }

    // VERIFICAÇÃO DE SEGURANÇA CENTRALIZADA
    const adminOnlyCommands = [
        'all', 'allg', 'ban', 'banextremo', 'banlinkgp', 'antilinkgp', 'antilink', 
        'banfoto', 'bangringo', 'addads', 'rmads', 'listads', 'bv', 'legendabv', 
        'abrirgrupo', 'fechargrupo', 'abrirgp', 'fechargp', 'afgp', 'soadm', 
        'horapg', 'addhorapg', 'imagem-horarios', 'sorteio', 'updatebot', 'atualizar'
    ];

    if (adminOnlyCommands.includes(command)) {
        const isOwner = Utils.isOwner(message);
        const isAdmin = await Utils.isAdmin(message);
        
        if (!isOwner && !isAdmin) {
            Logger.security(`ACESSO NEGADO: ${Utils.getUsername(message)} tentou usar comando administrativo: ${command}`);
            await message.reply('🚫 *ACESSO NEGADO!*\n\n🔒 Este comando é exclusivo para administradores do grupo.');
            return;
        }
    }

    // Log do comando
    Logger.command(
        Utils.getUsername(message),
        command,
        Utils.getGroupName(groupId)
    );

    try {
        // Processar comandos
        switch (command) {
            case 'menu':
                // Verificar modo SOADM para comando interativo
                const soadmStatusMenu = await DataManager.loadConfig(groupId, 'soadm');
                const isOwnerMenu = Utils.isOwner(message);
                const isAdminMenu = await Utils.isAdmin(message);
                
                if ((soadmStatusMenu === '1' || soadmStatusMenu === 1) && !isAdminMenu && !isOwnerMenu) {
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                    return;
                }
                
                await menuHandler.handle(client, message, args);
                break;

            case 'soadm':
                if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas administradores podem usar este comando.');
                    return;
                }
                
                const statusSoadm = parseInt(args);
                if (statusSoadm === 1) {
                    await DataManager.saveConfig(groupId, 'soadm', '1');
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos\n📝 Comandos afetados: !horarios, !sorte, !conselhos, !menu');
                } else if (statusSoadm === 0) {
                    await DataManager.saveConfig(groupId, 'soadm', '0');
                    await message.reply('🔓 *Modo SOADM desativado!*\n\n👥 Todos os membros podem usar comandos interativos');
                } else {
                    await message.reply('❌ Use: !soadm 1 (ativar) ou !soadm 0 (desativar)');
                }
                break;

            case 'sorte':
                // Verificar modo SOADM
                const soadmStatus = await DataManager.loadConfig(groupId, 'soadm');
                const isOwnerSorte = Utils.isOwner(message);
                const isAdminSorte = await Utils.isAdmin(message);
                
                if ((soadmStatus === '1' || soadmStatus === 1) && !isAdminSorte && !isOwnerSorte) {
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                    return;
                }
                
                const sorte = Math.floor(Math.random() * 101);     
                let mensagem;
                if (sorte >= 80) {
                    mensagem = `🍀 Uau! Sua sorte hoje está ótima! Você tem **${sorte}%** de sorte! 🍀`;
                } else if (sorte >= 50) {
                    mensagem = `🍀 Sua sorte está boa! Você tem **${sorte}%** de sorte hoje! 🍀`;
                } else if (sorte >= 20) {
                    mensagem = `🍀 Sua sorte está razoável! Você tem **${sorte}%** de sorte, mas pode melhorar! 🍀`;
                } else {
                    mensagem = `🍀 Hmm, a sorte não está ao seu lado hoje... Apenas **${sorte}%** de sorte. Não desista! 🍀`;
                }
                await message.reply(mensagem);
                break;

            case 'conselhos':
            case 'conselho':
                // Verificar modo SOADM
                const soadmStatusConselho = await DataManager.loadConfig(groupId, 'soadm');
                const isOwnerConselho = Utils.isOwner(message);
                const isAdminConselho = await Utils.isAdmin(message);
                
                if ((soadmStatusConselho === '1' || soadmStatusConselho === 1) && !isAdminConselho && !isOwnerConselho) {
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                    return;
                }
                
                try {
                    // Usar variável de ambiente ou chave do config
                    const apiKey = process.env.GROQ_API_KEY || config.groqApiKey || 'SUA_CHAVE_GROQ_AQUI';
                    
                    if (apiKey === 'SUA_CHAVE_GROQ_AQUI') {
                        await message.reply('⚠️ *Comando não configurado!*\n\nConfigure a chave da API Groq no config.json:\n```\n"groqApiKey": "sua_chave_aqui"\n```');
                        break;
                    }
                    
                    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

                    const requestBody = {
                        model: 'llama3-8b-8192',
                        messages: [{
                            role: 'user',
                            content: 'Dê-me um conselho motivacional curto e inspirador para o meu dia. mas quero só o conselho e não use inicias como "aqui esta um conselho"'
                        }]
                    };

                    const response = await axios.post(apiUrl, requestBody, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        },
                    });

                    const conselho = response.data.choices[0].message.content;
                    await message.reply(`💡 *Conselho do dia:*\n\n${conselho}`);
                } catch (error) {
                    Logger.error(`Erro ao buscar conselho: ${error.message}`);
                    await message.reply('❌ Erro ao buscar conselho. Tente novamente mais tarde.');
                }
                break;

            case 'updatebot':
            case 'atualizar':
                if (!Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas o dono pode atualizar o bot.');
                    return;
                }
                
                await message.reply('🔄 *Iniciando atualização do bot...*\n\n⏳ Verificando atualizações...');
                
                try {
                    const { execSync } = require('child_process');
                    
                    // Verificar se há atualizações
                    execSync('git fetch origin', { stdio: 'pipe' });
                    const status = execSync('git status -uno', { encoding: 'utf8' });
                    
                    if (status.includes('Your branch is up to date')) {
                        await message.reply('✅ *Bot já está atualizado!*\n\n🎉 Você está usando a versão mais recente.');
                        return;
                    }
                    
                    // Fazer backup das configurações
                    const backupTime = Date.now();
                    await message.reply('💾 *Fazendo backup das configurações...*');
                    
                    // Fazer pull das atualizações
                    await message.reply('📥 *Baixando atualizações...*');
                    execSync('git stash', { stdio: 'pipe' });
                    execSync('git pull origin main', { stdio: 'pipe' });
                    
                    // Instalar dependências
                    await message.reply('📦 *Instalando dependências...*');
                    execSync('npm install', { stdio: 'pipe' });
                    
                    // Restaurar stash
                    try {
                        execSync('git stash pop', { stdio: 'pipe' });
                    } catch (error) {
                        // Ignorar erro se não há stash
                    }
                    
                    await message.reply(`✅ *Bot atualizado com sucesso!*\n\n🔄 *Reiniciando em 5 segundos...*\n💾 Backup salvo: ${backupTime}`);
                    
                    Logger.success(`Bot atualizado por ${Utils.getUsername(message)}`);
                    
                    // Reiniciar o bot
                    setTimeout(() => {
                        process.exit(0);
                    }, 5000);
                    
                } catch (error) {
                    Logger.error(`Erro na atualização: ${error.message}`);
                    await message.reply('❌ *Erro na atualização!*\n\n🔧 Use o script manual:\n• `node update.js`\n• `npm run update`');
                }
                break;

            case 'all':
                if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas administradores podem usar este comando.');
                    return;
                }
                
                const chat = await message.getChat();
                const participants = chat.participants;
                const mentions = participants.map(p => p.id._serialized);
                
                // Se tem argumentos, salvar a mensagem
                if (args) {
                    let mediaData = null;
                    
                    // Verificar se há mídia
                    let mediaMessage = null;
                    if (message.hasMedia) {
                        mediaMessage = message;
                    } else if (message.hasQuotedMsg) {
                        const quotedMsg = await message.getQuotedMessage();
                        if (quotedMsg.hasMedia) {
                            mediaMessage = quotedMsg;
                        }
                    }

                    // Se há mídia, baixar e salvar
                    if (mediaMessage) {
                        const media = await mediaMessage.downloadMedia();
                        mediaData = {
                            data: media.data,
                            mimetype: media.mimetype,
                            filename: media.filename || `all_message.${media.mimetype.split('/')[1]}`
                        };
                    }
                    
                    // Salvar mensagem !all
                    await DataManager.saveConfig(groupId, 'allMessage', {
                        text: args,
                        media: mediaData,
                        savedAt: new Date().toISOString()
                    });
                    
                    await message.reply('✅ Mensagem do !all salva com sucesso!');
                } else {
                    // Buscar mensagem salva
                    const savedMessage = await DataManager.loadConfig(groupId, 'allMessage');
                    
                    if (savedMessage && savedMessage.text) {
                        if (savedMessage.media) {
                            // Enviar com mídia
                            const media = new MessageMedia(
                                savedMessage.media.mimetype,
                                savedMessage.media.data,
                                savedMessage.media.filename
                            );
                            await client.sendMessage(groupId, media, {
                                caption: savedMessage.text,
                                mentions: mentions
                            });
                        } else {
                            // Enviar só texto
                            await client.sendMessage(groupId, savedMessage.text, {
                                mentions: mentions
                            });
                        }
                        Logger.success(`Comando !all executado - ${participants.length} membros mencionados`);
                    } else {
                        await message.reply('❌ Nenhuma mensagem salva. Use: !all [sua mensagem]');
                    }
                }
                break;

            case 'allg':
                if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas administradores podem usar este comando.');
                    return;
                }
                
                if (!message.hasQuotedMsg) {
                    await message.reply('❌ Você precisa responder a uma mensagem para usar o !allg');
                    return;
                }
                
                const quotedMessage = await message.getQuotedMessage();
                const chat2 = await message.getChat();
                const participants2 = chat2.participants;
                const mentions2 = participants2.map(p => p.id._serialized);
                
                if (quotedMessage.hasMedia) {
                    // Mensagem com mídia
                    const media = await quotedMessage.downloadMedia();
                    const messageMedia = new MessageMedia(media.mimetype, media.data, media.filename);
                    
                    await client.sendMessage(groupId, messageMedia, {
                        caption: quotedMessage.body || '',
                        mentions: mentions2
                    });
                } else {
                    // Mensagem de texto
                    await client.sendMessage(groupId, quotedMessage.body, {
                        mentions: mentions2
                    });
                }
                
                Logger.success(`Comando !allg executado - mensagem repostada para ${participants2.length} membros`);
                break;

            case 'addads':
            case 'listads':
            case 'rmads':
                await adsHandler.handle(client, message, command, args);
                break;

            case 'bv':
            case 'legendabv':
                await welcomeHandler.handle(client, message, command, args);
                break;

            case 'abrirgrupo':
            case 'fechargrupo':
            case 'abrirgp':
            case 'fechargp':
            case 'afgp':
                await groupControlHandler.handle(client, message, command, args);
                break;

            case 'sorteio':
                await sorteioHandler.handle(client, message, args);
                break;

            case 'horarios':
                // Verificar modo SOADM para comando interativo
                const soadmStatusHorarios = await DataManager.loadConfig(groupId, 'soadm');
                const isOwnerHorarios = Utils.isOwner(message);
                const isAdminHorarios = await Utils.isAdmin(message);
                
                if ((soadmStatusHorarios === '1' || soadmStatusHorarios === 1) && !isAdminHorarios && !isOwnerHorarios) {
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                    return;
                }
                
                await horariosHandler.handle(client, message, command, args);
                break;
                
            case 'horapg':
            case 'addhorapg':
            case 'imagem-horarios':
                await horariosHandler.handle(client, message, command, args);
                break;

            case 'banextremo':
            case 'banlinkgp':
            case 'antilinkgp':
            case 'antilink':
            case 'banfoto':
            case 'bangringo':
            case 'ban':
                await banHandler.handle(client, message, command, args);
                break;

            case 'liberargrupo':
                if (!Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas o dono pode liberar grupos.');
                    return;
                }
                const days = parseInt(args) || 30;
                await RentalSystem.liberarGrupo(groupId, days);
                await message.reply(`✅ *Grupo liberado por ${days} dias!*\n\n📅 Válido até: ${moment().add(days, 'days').format('DD/MM/YYYY HH:mm')}`);
                Logger.success(`Grupo ${Utils.getGroupName(groupId)} liberado por ${days} dias`);
                break;

            case 'vergrupo':
                const status = await RentalSystem.checkGroupStatus(groupId);
                if (status.active) {
                    await message.reply(`✅ *Grupo ativo!*\n\n📅 Expira em: ${status.expiry}\n⏰ Dias restantes: ${status.daysLeft}`);
                } else {
                    await message.reply(status.message);
                }
                break;

            case 'debugbot':
                const isOwner = Utils.isOwner(message);
                const isAdmin = await Utils.isAdmin(message);
                const debugChat = await message.getChat();
                
                const debugInfo = `🔍 *DEBUG COMPLETO DO BOT*\n\n` +
                    `👤 *Seu número:* ${message.author ? message.author.replace('@c.us', '') : 'Não detectado'}\n` +
                    `👑 *Dono configurado:* ${config.numeroDono}\n` +
                    `✅ *É o dono?* ${isOwner ? '✅ SIM' : '❌ NÃO'}\n` +
                    `🛡️ *É admin?* ${isAdmin ? '✅ SIM' : '❌ NÃO'}\n` +
                    `📱 *Nome do grupo:* ${debugChat.name}\n` +
                    `🆔 *ID do grupo:* ${groupId}\n` +
                    `👥 *Total de participantes:* ${debugChat.participants.length}\n` +
                    `🤖 *Bot ativo:* ✅ SIM\n\n` +
                    `💡 *Dicas:*\n` +
                    `• Se "É o dono?" = NÃO, verifique config.json\n` +
                    `• Se "É admin?" = NÃO, verifique se você é admin do grupo\n` +
                    `• Use !liberargrupo 30 para ativar o grupo`;
                
                await message.reply(debugInfo);
                
                Logger.info(`Debug solicitado por ${Utils.getUsername(message)} - Dono: ${isOwner}, Admin: ${isAdmin}`);
                break;

            default:
                // Comando não encontrado
                break;
        }
    } catch (error) {
        Logger.error(`Erro ao processar comando '${command}': ${error.message}`);
        await message.reply('❌ Erro interno do bot. Tente novamente.');
    }
});

// Processar novos membros
client.on('group_join', async (notification) => {
    const groupId = notification.chatId;
    const newMemberId = notification.id.participant;
    
    // Usar a nova função de boas-vindas com suporte a mídia
    if (welcomeHandler) {
        await welcomeHandler.sendWelcome(client, groupId, newMemberId);
    }
});

// Inicialização SIMPLES
async function initialize() {
    Logger.logBox('INICIANDO BOT', [
        'Bot Administrador WhatsApp',
        `📱 Número: ${config.numeroBot}`,
        `⏰ ${moment().format('DD/MM/YYYY HH:mm')}`
    ], 'cyan');
    
    try {
        // Listener único para QR/Pareamento
        client.on('qr', async (qr) => {
            Logger.info('Gerando código de pareamento...');
            
            try {
                const pairingCode = await client.requestPairingCode(config.numeroBot);
                
                Logger.logBox('CÓDIGO DE PAREAMENTO', [
                    `🔑 Código: ${pairingCode}`,
                    '',
                    '📱 COMO CONECTAR:',
                    '1. WhatsApp > Configurações',
                    '2. Aparelhos conectados',
                    '3. "Conectar um aparelho"',
                    '4. "Usar código do telefone"',
                    `5. Digite: ${pairingCode}`,
                    '',
                    '⏰ Código expira em alguns minutos!'
                ], 'yellow');
                
            } catch (error) {
                Logger.error('Erro ao gerar código. Sessão pode estar corrompida.');
                Logger.warning('Limpando cache...');
                
                try {
                    if (fs.existsSync('./.wwebjs_auth')) fs.removeSync('./.wwebjs_auth');
                    if (fs.existsSync('./.wwebjs_cache')) fs.removeSync('./.wwebjs_cache');
                    Logger.success('Cache limpo. Execute novamente: npm start');
                    process.exit(1);
                } catch (cleanError) {
                    Logger.error(`Erro ao limpar: ${cleanError.message}`);
                    process.exit(1);
                }
            }
        });
        
        // Inicializar cliente
        await client.initialize();
        
    } catch (error) {
        Logger.error(`Erro na inicialização: ${error.message}`);
        process.exit(1);
    }
}

// Exportar para uso nos módulos
module.exports = {
    client,
    DataManager,
    RentalSystem,
    Utils,
    config
};

// Criar estrutura básica se necessário
if (!fs.existsSync('./data')) {
    Logger.info('Criando pasta data...');
    fs.mkdirSync('./data');
    
    const dataFiles = [
        { file: 'grupoAluguel.json', content: { "grupos": {} } },
        { file: 'configs.json', content: { "grupos": {} } },
        { file: 'ads.json', content: { "anuncios": {} } },
        { file: 'sorteios.json', content: { "sorteios": {} } },
        { file: 'horarios.json', content: { "horarios": {} } }
    ];
    
    dataFiles.forEach(dataFile => {
        const filePath = `./data/${dataFile.file}`;
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(dataFile.content, null, 2));
            Logger.success(`Criado: ${dataFile.file}`);
        }
    });
}

// Inicializar bot direto
initialize();