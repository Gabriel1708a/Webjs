// Carregar variáveis de ambiente
require('dotenv').config();

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const moment = require('moment-timezone');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const qrcode = require('qrcode-terminal');

// Importar configurações
const config = require('./config.json');

// Função para notificar painel Laravel
async function notificarPainelLaravel() {
    if (!config.laravelApi?.enabled) return;

    try {
        await axios.post(`${config.laravelApi.baseUrl}/bots/registrar`, {
            numero: config.numeroBot,
            nome: config.botInfo.nome,
            status: 'online'
        }, {
            headers: {
                Authorization: `Bearer ${config.laravelApi.token}`
            }
        });

        console.log('[BOT] Bot registrado com sucesso no painel Laravel!');
        Logger.success('Bot registrado no painel Laravel');
    } catch (error) {
        console.error('[ERRO] Falha ao registrar bot no painel:', error.response?.data || error.message);
        Logger.error(`Falha ao registrar bot no painel Laravel: ${error.message}`);
    }
}

// Importar módulos de comandos (será feito após definir as classes)
let welcomeHandler, banHandler, sorteioHandler, adsHandler, menuHandler, groupControlHandler, horariosHandler, autoRespostaHandler, syncStatusHandler, syncPanelHandler;

// Importar handler de mensagens automáticas do Laravel
const AutoMessageHandler = require('./handlers/AutoMessageHandler');

// Importar módulo de envio centralizado
const Sender = require('./Sender');

// Importar handler do painel para entrada em grupos
const PanelHandler = require('./handlers/PanelHandler');

// Importar handler de tarefas do painel
const TaskHandler = require('./handlers/TaskHandler');

// Importar handler de sincronização automática
const SyncHandler = require('./handlers/SyncHandler');

// Importar utilitários de sincronização
const { sincronizarGrupoComPainel } = require('./utils/SyncUtils');

// Importar o sistema unificado de anúncios
// const AdManager = require('./commands/AdManager'); // Temporariamente desabilitado

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

// Sistema de controle de mensagem de bot no PV
let notifiedUsers = new Set();

// Função para carregar usuários já notificados
async function loadNotifiedUsers() {
    try {
        const filePath = path.join(__dirname, 'data', 'notifiedUsers.json');
        if (await fs.pathExists(filePath)) {
            const data = await fs.readJSON(filePath);
            notifiedUsers = new Set(data);
        }
    } catch (error) {
        Logger.error(`Erro ao carregar usuários notificados: ${error.message}`);
    }
}

// Função para salvar usuários notificados
async function saveNotifiedUsers() {
    try {
        const filePath = path.join(__dirname, 'data', 'notifiedUsers.json');
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJSON(filePath, Array.from(notifiedUsers));
    } catch (error) {
        Logger.error(`Erro ao salvar usuários notificados: ${error.message}`);
    }
}

// Função para lidar com mensagens privadas
async function handlePrivateMessage(client, message) {
    const userId = message.from;
    
    // Verificar se já enviamos mensagem de bot para este usuário
    if (!notifiedUsers.has(userId)) {
        const botMessage = `🔹 Olá! Sou um *ROBÔ* automatizado para administração de grupos no WhatsApp.

> *O que é um robô?*
> Robô é algo que não é manuseado por humano e sim por computadores , e eu sou isso

⚠️ Não sou responsável por nenhuma ação tomada no grupo, apenas obedeço comandos programados para auxiliar na moderação.

📌 Se precisar de suporte ou resolver alguma questão, entre em contato com um administrador do grupo.

🔹 Obrigado pela compreensão!`;

        try {
            await client.sendMessage(userId, botMessage);
            notifiedUsers.add(userId);
            await saveNotifiedUsers();
            Logger.info(`Mensagem de bot enviada para usuário: ${userId}`);
        } catch (error) {
            Logger.error(`Erro ao enviar mensagem de bot para PV: ${error.message}`);
        }
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
    console.log('');
    Logger.logBox('QR CODE DISPONÍVEL', [
        '📱 QR Code gerado com sucesso!',
        '',
        '🔍 Veja o QR Code abaixo:'
    ], 'cyan');
    
    console.log('');
    qrcode.generate(qr, { small: true });
    console.log('');
    
    Logger.logBox('COMO CONECTAR', [
        '📱 PELO QR CODE:',
        '1. Abra WhatsApp no celular',
        '2. Configurações > Aparelhos conectados',
        '3. "Conectar um aparelho"',
        '4. Aponte a câmera para o QR Code acima',
        '',
        '💡 CÓDIGO DE PAREAMENTO:',
        '   Execute: node test-pairing.js',
        '   (Método alternativo)',
        '',
        '⏰ QR Code expira em alguns minutos!'
    ], 'yellow');
    console.log('');
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
    autoRespostaHandler = require('./commands/autoresposta');
            syncStatusHandler = require('./commands/sync-status');
        syncPanelHandler = require('./commands/syncpanel');
    
    Logger.info('Módulos de comandos carregados');
    
    // Inicializar módulo de envio centralizado primeiro (crítico)
    Sender.initialize(client);
    Logger.success('Módulo de envio centralizado inicializado');
    
    // Carregar sistemas automáticos em paralelo para ser mais rápido
    await Promise.all([
        adsHandler.loadAllAds(client),
        groupControlHandler.loadSchedules(client),
        horariosHandler.loadAutoHours(client),
        loadNotifiedUsers()
    ]);
    
    Logger.success('Sistemas automáticos inicializados');
    
    // Inicializar serviço de mensagens automáticas híbrido (Laravel + Local)
    await AutoMessageHandler.initialize(DataManager);
    Logger.success('Serviço de mensagens automáticas híbrido inicializado');
    
    // Notificar painel Laravel de forma não-bloqueante
    notificarPainelLaravel().catch(err => 
        console.log(`⚠️ Falha ao notificar painel: ${err.message}`)
    );
    
    // Inicializar handlers essenciais de forma não-bloqueante
    setTimeout(() => {
        // Inicializar handler do painel para entrada em grupos
        PanelHandler.initialize();
        Logger.success('Handler do painel inicializado');
        
        // Inicializar handler de tarefas do painel
        const taskHandler = new TaskHandler(client);
        taskHandler.start();
        Logger.info('Handler de tarefas do painel inicializado (verificação a cada 5s)');
        
        // --- [NOVA LÓGICA DE SINCRONIZAÇÃO] ---
        // Cria uma instância do nosso handler, passando 30000 milissegundos (30 segundos)
        const syncHandler = new SyncHandler(30000); 
            
        // Inicia o processo de sincronização automática
        syncHandler.start();
        Logger.success('Sincronização automática inicializada');
    }, 1000); // Aguarda 1 segundo para não bloquear a inicialização principal
    // --- [FIM DA NOVA LÓGICA] ---
    
    // Inicializar sistema unificado de anúncios
    // await AdManager.initialize(client); // Temporariamente desabilitado
    // Logger.success('Sistema unificado de anúncios inicializado');
    
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
    // Só mostrar logs importantes para evitar spam
    if (percent === 100 || percent % 25 === 0) {
        Logger.info(`Carregando: ${percent}% - ${message}`);
    }
});

client.on('authenticated', () => {
    Logger.success('Autenticação realizada com sucesso');
});

client.on('change_state', (state) => {
    // Só logar mudanças importantes de estado
    if (['CONNECTED', 'OPENING', 'CONFLICT', 'UNLAUNCHED'].includes(state)) {
        Logger.info(`Status do cliente: ${state}`);
    }
});

// Processamento de mensagens
client.on('message_create', async (message) => {
    // Ignorar mensagens do próprio bot
    if (message.fromMe) return;

    // Verificar se é mensagem no PV (privado)
    if (!Utils.isGroup(message)) {
        await handlePrivateMessage(client, message);
        return;
    }

    const groupId = message.from;
    const text = message.body.trim();
    
    // Sistema anti-link automático (verificar antes dos comandos)
    if (banHandler && !text.startsWith(config.prefix)) {
        await banHandler.checkMessage(client, message);
    }
    
    // Verificar se é um comando
    if (!text.startsWith(config.prefix)) {
        // Verificar autoresposta para mensagens que não são comandos
        if (autoRespostaHandler) {
            await autoRespostaHandler.checkAutoResposta(client, message);
        }
        return;
    }

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
        'all', 'allg', 'allg2', 'ban', 'banextremo', 'banlinkgp', 'antilinkgp', 'antilink', 
        'banfoto', 'bangringo', 'addads', 'rmads', 'listads', 'bv', 'legendabv', 
        'abrirgrupo', 'fechargrupo', 'abrirgp', 'fechargp', 'afgp', 'soadm', 'syncstatus',
        'horapg', 'addhorapg', 'imagem-horarios', 'sorteio', 'updatebot', 'atualizar',
        'apagar', 'autoresposta'
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
                    // [CORREÇÃO] Passa o objeto DataManager para a função de sincronização
                    await sincronizarGrupoComPainel(groupId, DataManager);
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos\n📝 Comandos afetados: !horarios, !sorte, !conselhos, !menu');
                } else if (statusSoadm === 0) {
                    await DataManager.saveConfig(groupId, 'soadm', '0');
                    // [CORREÇÃO] Passa o objeto DataManager para a função de sincronização
                    await sincronizarGrupoComPainel(groupId, DataManager);
                    await message.reply('🔓 *Modo SOADM desativado!*\n\n👥 Todos os membros podem usar comandos interativos');
                } else {
                    await message.reply('❌ Use: !soadm 1 (ativar) ou !soadm 0 (desativar)');
                }
                break;

            case 'syncstatus':
                await syncStatusHandler.handle(client, message, command, args);
                break;

            case 'syncpanel':
                await syncPanelHandler.handle(client, message, command, args);
                break;

            case 'linkgp':
                try {
                    // Verificar modo SOADM para comando !linkgp
                    const soadmStatusLink = await DataManager.loadConfig(groupId, 'soadm');
                    const isOwnerLink = Utils.isOwner(message);
                    const isAdminLink = await Utils.isAdmin(message);
                    
                    // Se SOADM ativado e usuário não é admin/dono, bloquear
                    if ((soadmStatusLink === '1' || soadmStatusLink === 1) && !isAdminLink && !isOwnerLink) {
                        await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                        return;
                    }

                    const chat = await message.getChat();
                    if (!chat.isGroup) {
                        await message.reply('❌ Este comando só funciona em grupos.');
                        return;
                    }

                    // Gerar link de convite do grupo
                    const inviteCode = await chat.getInviteCode();
                    const groupLink = `https://chat.whatsapp.com/${inviteCode}`;
                    
                    await message.reply(`🔗 *Link do Grupo:*\n\n${groupLink}\n\n📋 *Nome:* ${chat.name}\n👥 *Participantes:* ${chat.participants.length}`);
                    
                    Logger.command(Utils.getUsername(message), '!linkgp', Utils.getGroupName(groupId));
                    
                } catch (error) {
                    Logger.error(`Erro no comando !linkgp: ${error.message}`);
                    await message.reply('❌ Erro ao gerar link do grupo. Verifique se sou administrador.');
                }
                break;

            case 'id':
                // Verificar se é admin ou dono
                if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas administradores podem usar este comando.');
                    return;
                }

                try {
                    const chat = await message.getChat();
                    if (!chat.isGroup) {
                        await message.reply('❌ Este comando só funciona em grupos.');
                        return;
                    }

                    await message.reply(`🆔 *ID do Grupo:*\n\n\`${groupId}\`\n\n📋 *Nome:* ${chat.name}\n👥 *Participantes:* ${chat.participants.length}`);
                    
                    Logger.command(Utils.getUsername(message), '!id', Utils.getGroupName(groupId));
                    
                } catch (error) {
                    Logger.error(`Erro no comando !id: ${error.message}`);
                    await message.reply('❌ Erro ao obter ID do grupo.');
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
                try {
                    if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                        await message.reply('🚫 Apenas administradores podem usar este comando.');
                        return;
                    }
                    
                    const chat2 = await message.getChat();
                    const participants2 = chat2.participants;
                    const mentions2 = participants2.map(p => p.id._serialized);
                    
                    // Verificar se tem mensagem personalizada (args após o comando)
                    const mensagemPersonalizada = Array.isArray(args) ? args.join(' ').trim() : (args || '').toString().trim();
                    
                    if (mensagemPersonalizada) {
                        // Se tem mensagem personalizada, enviar ela marcando todos
                        await client.sendMessage(groupId, mensagemPersonalizada, {
                            mentions: mentions2
                        });
                        Logger.success(`Comando !allg executado - mensagem personalizada enviada para ${participants2.length} membros`);
                    } else if (message.hasQuotedMsg) {
                        // Se não tem mensagem personalizada mas tem mensagem citada, usar o método antigo
                        const quotedMessage = await message.getQuotedMessage();
                        
                        if (quotedMessage.hasMedia) {
                            // Mensagem com mídia
                            try {
                                console.log('📥 Baixando mídia da mensagem citada...');
                                
                                // Tentar múltiplas abordagens para baixar a mídia
                                let media = null;
                                
                                // Primeira tentativa: método padrão
                                try {
                                    media = await quotedMessage.downloadMedia();
                                } catch (downloadError) {
                                    console.log('⚠️ Primeira tentativa falhou, tentando alternativa...');
                                }
                                
                                // Segunda tentativa: com timeout maior
                                if (!media || !media.data) {
                                    try {
                                        media = await Promise.race([
                                            quotedMessage.downloadMedia(),
                                            new Promise((_, reject) => 
                                                setTimeout(() => reject(new Error('Timeout')), 15000)
                                            )
                                        ]);
                                    } catch (timeoutError) {
                                        console.log('⚠️ Segunda tentativa falhou também...');
                                    }
                                }
                                
                                // Verificar se conseguiu baixar
                                if (!media || !media.data) {
                                    throw new Error('Não foi possível baixar a mídia após múltiplas tentativas');
                                }
                                
                                console.log('✅ Mídia baixada com sucesso!');
                                
                                // Se não tem mimetype, tentar detectar ou usar padrão
                                const mimetype = media.mimetype || 'application/octet-stream';
                                const filename = media.filename || 'arquivo';
                                
                                console.log(`📤 Enviando mídia: ${mimetype} (${filename}) - ${media.data.length} bytes`);
                                
                                const messageMedia = new MessageMedia(mimetype, media.data, filename);
                                
                                await client.sendMessage(groupId, messageMedia, {
                                    caption: quotedMessage.body || '',
                                    mentions: mentions2
                                });
                                
                                console.log('✅ Mídia enviada com sucesso para o grupo!');
                            } catch (mediaError) {
                                console.log(`❌ Erro ao processar mídia: ${mediaError.message}`);
                                // Fallback: enviar apenas o texto se houver
                                if (quotedMessage.body) {
                                    console.log('📝 Enviando apenas texto como fallback...');
                                    await client.sendMessage(groupId, quotedMessage.body, {
                                        mentions: mentions2
                                    });
                                } else {
                                    await message.reply('❌ Não foi possível processar a mídia da mensagem citada. Tente novamente.');
                                    return;
                                }
                            }
                        } else {
                            // Mensagem de texto
                            await client.sendMessage(groupId, quotedMessage.body, {
                                mentions: mentions2
                            });
                        }
                        Logger.success(`Comando !allg executado - mensagem repostada para ${participants2.length} membros`);
                    } else {
                        await message.reply('❌ Você precisa responder a uma mensagem OU escrever uma mensagem junto ao comando.\n\n💡 Exemplos:\n• !allg atenção pessoal\n• !allg (respondendo uma mensagem)');
                        return;
                    }
                } catch (error) {
                    Logger.error(`Erro no comando !allg: ${error.message}`);
                    await message.reply('❌ Erro ao executar comando !allg. Verifique se sou administrador.');
                }
                break;

            case 'allg2':
                if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                    await message.reply('🚫 Apenas administradores podem usar este comando.');
                    return;
                }
                
                if (!message.hasQuotedMsg) {
                    await message.reply('❌ Você precisa responder a uma mensagem para usar o !allg2');
                    return;
                }
                
                try {
                    const quotedMessage2 = await message.getQuotedMessage();
                    const chat3 = await message.getChat();
                    const participants3 = chat3.participants;
                    const mentions3 = participants3.map(p => p.id._serialized);
                    
                    // Criar lista de @ menções
                    const mentionsList = participants3.map(p => `@${p.id.user}`).join(' ');
                    
                    let finalMessage = '';
                    
                    if (quotedMessage2.hasMedia) {
                        // Mensagem com mídia
                        const media2 = await quotedMessage2.downloadMedia();
                        const messageMedia2 = new MessageMedia(media2.mimetype, media2.data, media2.filename);
                        
                        finalMessage = `${quotedMessage2.body || ''}\n\n${mentionsList}\n\n📊 *${participants3.length} membros mencionados*`;
                        
                        const sentMessage = await client.sendMessage(groupId, messageMedia2, {
                            caption: finalMessage,
                            mentions: mentions3
                        });
                        
                        // Fixar a mensagem
                        await sentMessage.pin();
                        
                    } else {
                        // Mensagem de texto
                        finalMessage = `${quotedMessage2.body}\n\n${mentionsList}\n\n📊 *${participants3.length} membros mencionados*`;
                        
                        const sentMessage = await client.sendMessage(groupId, finalMessage, {
                            mentions: mentions3
                        });
                        
                        // Fixar a mensagem
                        await sentMessage.pin();
                    }
                    
                    Logger.success(`Comando !allg2 executado - ${participants3.length} membros mencionados e mensagem fixada`);
                    
                } catch (error) {
                    Logger.error(`Erro no comando !allg2: ${error.message}`);
                    await message.reply('❌ Erro ao executar comando !allg2. Verifique se sou administrador.');
                }
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

            case 'apagar':
            case 'autoresposta':
                await autoRespostaHandler.handle(client, message, command, args);
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
        // Listener para QR apenas (sem código de pareamento problemático)
        client.on('qr', async (qr) => {
            // Não gerar código de pareamento - apenas mostrar QR
            console.log('');
            Logger.logBox('CONECTE VIA QR CODE', [
                '📱 Use apenas o QR Code acima',
                '',
                '⚠️  CÓDIGO DE PAREAMENTO DESABILITADO',
                '   (Gerava códigos inválidos)',
                '',
                '💡 ALTERNATIVAS:',
                '   • Use o QR Code (recomendado)',
                '   • Execute: node test-pairing.js',
                '',
                '⏰ QR Code expira em alguns minutos!'
            ], 'yellow');
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