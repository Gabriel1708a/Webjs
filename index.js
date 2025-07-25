// ========================================================================================================
// 🤖 BOT WHATSAPP ADMINISTRADOR - VERSÃO OTIMIZADA 2.0
// ========================================================================================================
// 📅 Última atualização: 2024
// 🔧 Correções implementadas: Cache inteligente, Performance otimizada, Logs detalhados
// 🚀 Melhorias: Sistema híbrido Laravel + Local, Handlers unificados, Inicialização paralela
// ========================================================================================================

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

// ========================================================================================================
// 🔧 SISTEMA DE INICIALIZAÇÃO OTIMIZADO
// ========================================================================================================

// Função para notificar painel Laravel (otimizada)
async function notificarPainelLaravel() {
    if (!config.laravelApi?.enabled) {
        console.log('[PAINEL] API Laravel desabilitada no config');
        return;
    }

    try {
        const startTime = Date.now();
        await axios.post(`${config.laravelApi.baseUrl}/bots/registrar`, {
            numero: config.numeroBot,
            nome: config.botInfo.nome,
            status: 'online',
            version: config.botInfo.versao
        }, {
            headers: {
                Authorization: `Bearer ${config.laravelApi.token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'WhatsApp-Bot/2.0'
            },
            timeout: config.laravelApi.timeout
        });

        const responseTime = Date.now() - startTime;
        console.log(`[PAINEL] ✅ Bot registrado com sucesso (${responseTime}ms)`);
        Logger.success('Bot registrado no painel Laravel');
    } catch (error) {
        const status = error.response?.status || 'N/A';
        console.error(`[PAINEL] ❌ Falha ao registrar bot - Status: ${status}, Erro: ${error.message}`);
        Logger.error(`Falha ao registrar bot no painel Laravel: ${error.message}`);
    }
}

// Importar módulos de comandos (carregamento otimizado)
let welcomeHandler, banHandler, sorteioHandler, adsHandler, menuHandler, groupControlHandler, horariosHandler, autoRespostaHandler, syncStatusHandler, syncPanelHandler;

// Importar handlers principais
const AutoMessageHandler = require('./handlers/AutoMessageHandler');
const Sender = require('./utils/Sender');
const PanelHandler = require('./handlers/PanelHandler');
const TaskHandler = require('./handlers/TaskHandler');
const SyncHandler = require('./handlers/SyncHandler');
const { sincronizarGrupoComPainel } = require('./utils/SyncUtils');

// ========================================================================================================
// 🔧 CONFIGURAÇÃO DO CLIENTE WHATSAPP OTIMIZADA
// ========================================================================================================

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
            '--disable-gpu',
            '--memory-pressure-off',
            '--max_old_space_size=4096'
        ]
    }
});

// Configurar timezone
moment.tz.setDefault(config.timezone);

// ========================================================================================================
// 📊 SISTEMA DE LOGS COLORIDOS OTIMIZADO
// ========================================================================================================

class Logger {
    static logBox(title, content, color = 'blue') {
        const width = 60;
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
        console.log(chalk.green('✅'), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static error(message) {
        console.log(chalk.red('❌'), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static info(message) {
        console.log(chalk.blue('ℹ️ '), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static warning(message) {
        console.log(chalk.yellow('⚠️ '), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static command(user, command, group) {
        console.log(
            chalk.cyan('📝') + ' ' +
            chalk.white(`[${moment().format('HH:mm:ss')}]`) + ' ' +
            chalk.yellow(user) + ' → ' +
            chalk.green(command) + ' ' +
            chalk.gray(`(${group?.substring(0, 15)}...)`)
        );
    }

    static admin(message) {
        console.log(chalk.magenta('👑'), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static owner(message) {
        console.log(chalk.red('🔴'), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static security(message) {
        console.log(chalk.red('🔒'), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message));
    }

    static performance(message, time) {
        const color = time < 100 ? 'green' : time < 500 ? 'yellow' : 'red';
        console.log(chalk[color]('⚡'), chalk.white(`[${moment().format('HH:mm:ss')}]`), chalk.white(message), chalk.gray(`(${time}ms)`));
    }
}

// ========================================================================================================
// 💾 SISTEMA DE CONTROLE DE USUÁRIOS OTIMIZADO
// ========================================================================================================

let notifiedUsers = new Set();

async function loadNotifiedUsers() {
    try {
        const filePath = path.join(__dirname, 'data', 'notifiedUsers.json');
        if (await fs.pathExists(filePath)) {
            const data = await fs.readJSON(filePath);
            notifiedUsers = new Set(data);
            Logger.info(`${notifiedUsers.size} usuários notificados carregados`);
        }
    } catch (error) {
        Logger.error(`Erro ao carregar usuários notificados: ${error.message}`);
    }
}

async function saveNotifiedUsers() {
    try {
        const filePath = path.join(__dirname, 'data', 'notifiedUsers.json');
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJSON(filePath, Array.from(notifiedUsers));
    } catch (error) {
        Logger.error(`Erro ao salvar usuários notificados: ${error.message}`);
    }
}

async function handlePrivateMessage(client, message) {
    const userId = message.from;
    
    if (!notifiedUsers.has(userId)) {
        const botMessage = `🤖 *MENSAGEM AUTOMÁTICA*

Olá! Sou um *ROBÔ* automatizado para administração de grupos WhatsApp.

🔹 *O que é um robô?*
Sou um sistema automatizado controlado por computador, não por humanos.

⚠️ *Importante:*
• Não sou responsável por ações nos grupos
• Apenas executo comandos programados
• Para suporte, contate um administrador

🚀 *Versão:* ${config.botInfo.versao}
📅 *Data:* ${moment().format('DD/MM/YYYY HH:mm')}

Obrigado pela compreensão! 😊`;

        try {
            await client.sendMessage(userId, botMessage);
            notifiedUsers.add(userId);
            await saveNotifiedUsers();
            Logger.info(`Mensagem de bot enviada para: ${userId.substring(0, 15)}...`);
        } catch (error) {
            Logger.error(`Erro ao enviar mensagem de bot para PV: ${error.message}`);
        }
    }
}

// ========================================================================================================
// 📁 SISTEMA DE DADOS JSON OTIMIZADO
// ========================================================================================================

class DataManager {
    static dataCache = new Map();
    static cacheExpiry = new Map();
    static CACHE_DURATION = 10000; // 10 segundos de cache para dados locais

    static async loadData(file) {
        try {
            // Verificar cache primeiro
            const cacheKey = `data_${file}`;
            const now = Date.now();
            
            if (this.dataCache.has(cacheKey) && this.cacheExpiry.has(cacheKey)) {
                const expiry = this.cacheExpiry.get(cacheKey);
                if (now < expiry) {
                    return this.dataCache.get(cacheKey);
                }
            }

            // Carregar do arquivo
            const filePath = path.join(__dirname, 'data', file);
            await fs.ensureDir(path.dirname(filePath));
            
            let data = {};
            if (await fs.pathExists(filePath)) {
                data = await fs.readJSON(filePath);
            }

            // Salvar no cache
            this.dataCache.set(cacheKey, data);
            this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
            
            return data;
        } catch (error) {
            Logger.error(`Erro ao carregar ${file}: ${error.message}`);
            return {};
        }
    }

    static async saveData(file, data) {
        try {
            const filePath = path.join(__dirname, 'data', file);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeJSON(filePath, data, { spaces: 2 });
            
            // Limpar cache após salvar
            const cacheKey = `data_${file}`;
            this.dataCache.delete(cacheKey);
            this.cacheExpiry.delete(cacheKey);
            
            return true;
        } catch (error) {
            Logger.error(`Erro ao salvar ${file}: ${error.message}`);
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

    static clearCache() {
        this.dataCache.clear();
        this.cacheExpiry.clear();
        Logger.info('Cache de dados limpo');
    }
}

// ========================================================================================================
// 🔐 SISTEMA DE VERIFICAÇÃO DE ALUGUEL OTIMIZADO
// ========================================================================================================

class RentalSystem {
    static async checkGroupStatus(groupId) {
        try {
            // TEMPORÁRIO: Permitir todos os grupos para debug
            console.log(`[DEBUG-RENTAL] Verificando grupo: ${groupId}`);
            return { 
                active: true, 
                reason: 'debug_mode',
                message: 'Grupo ativo (modo debug)'
            };
            
            /* CÓDIGO ORIGINAL COMENTADO PARA DEBUG
            const rentals = await DataManager.loadData('grupoAluguel.json');
            
            if (!rentals.grupos || !rentals.grupos[groupId]) {
                return { 
                    active: false, 
                    message: '⚠️ Este grupo não está autorizado a usar o bot. Contrate o serviço para ativar.',
                    reason: 'not_registered'
                };
            }
            */

            /* RESTO DO CÓDIGO ORIGINAL COMENTADO PARA DEBUG
            const groupData = rentals.grupos[groupId];
            const now = moment();
            const expiry = moment(groupData.expiry);

            if (now.isAfter(expiry)) {
                return { 
                    active: false, 
                    message: '⚠️ A licença deste grupo expirou. Renove o serviço para continuar usando.',
                    reason: 'expired',
                    expiredDate: expiry.format('DD/MM/YYYY HH:mm')
                };
            }

            const daysLeft = expiry.diff(now, 'days');
            return { 
                active: true, 
                daysLeft,
                expiry: expiry.format('DD/MM/YYYY HH:mm'),
                reason: 'active'
            };
            */
        } catch (error) {
            Logger.error(`Erro ao verificar status do grupo ${groupId}: ${error.message}`);
            return { active: true, reason: 'error' }; // Permitir uso em caso de erro
        }
    }

    static async liberarGrupo(groupId, days) {
        try {
            const rentals = await DataManager.loadData('grupoAluguel.json');
            if (!rentals.grupos) rentals.grupos = {};

            const expiry = moment().add(days, 'days');
            rentals.grupos[groupId] = {
                activated: moment().format(),
                expiry: expiry.format(),
                days: days,
                activatedBy: 'system'
            };

            const success = await DataManager.saveData('grupoAluguel.json', rentals);
            if (success) {
                Logger.success(`Grupo ${groupId} liberado por ${days} dias`);
            }
            return success;
        } catch (error) {
            Logger.error(`Erro ao liberar grupo ${groupId}: ${error.message}`);
            return false;
        }
    }
}

// ========================================================================================================
// 🛠️ UTILITÁRIOS OTIMIZADOS
// ========================================================================================================

class Utils {
    static async isAdmin(message) {
        try {
            if (!message.author) {
                Logger.warning('isAdmin: message.author não encontrado');
                return false;
            }

            const chat = await message.getChat();
            if (!chat.isGroup) {
                return false;
            }

            const participant = chat.participants.find(p => 
                p.id._serialized === message.author
            );

            if (!participant) {
                Logger.warning(`isAdmin: Participante não encontrado - ${message.author}`);
                return false;
            }

            const isAdmin = participant.isAdmin || participant.isSuperAdmin;
            return isAdmin;
        } catch (error) {
            Logger.error(`Erro ao verificar admin: ${error.message}`);
            return false;
        }
    }

    static isOwner(message) {
        try {
            const userNumber = message.author?.replace('@c.us', '') || message.from?.replace('@c.us', '');
            const ownerNumber = config.numeroDono?.replace('@c.us', '');
            return userNumber === ownerNumber;
        } catch (error) {
            Logger.error(`Erro ao verificar owner: ${error.message}`);
            return false;
        }
    }

    static getUsername(message) {
        try {
            return message._data?.notifyName || 
                   message.author?.split('@')[0] || 
                   'Usuário';
        } catch (error) {
            return 'Usuário';
        }
    }

    static getGroupName(groupId) {
        try {
            return groupId?.split('@')[0]?.substring(0, 15) + '...' || 'Grupo';
        } catch (error) {
            return 'Grupo';
        }
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getSystemInfo() {
        const used = process.memoryUsage();
        return {
            memory: {
                rss: this.formatBytes(used.rss),
                heapTotal: this.formatBytes(used.heapTotal),
                heapUsed: this.formatBytes(used.heapUsed),
                external: this.formatBytes(used.external)
            },
            uptime: Math.floor(process.uptime()),
            version: process.version,
            platform: process.platform
        };
    }
}

// ========================================================================================================
// 🚀 EVENTOS DO CLIENTE OTIMIZADOS
// ========================================================================================================

client.on('qr', (qr) => {
    Logger.logBox('QR CODE GERADO', [
        'Escaneie o QR Code abaixo com seu WhatsApp:',
        '',
        '📱 Abra o WhatsApp no seu celular',
        '⚙️  Vá em Configurações > Aparelhos conectados',
        '📷 Toque em "Conectar um aparelho"',
        '🔍 Escaneie o código QR abaixo'
    ], 'cyan');
    
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    const startTime = Date.now();
    
    Logger.logBox('BOT CONECTADO COM SUCESSO', [
        `📱 Número: ${client.info.wid.user}`,
        `📋 Nome: ${client.info.pushname}`,
        `👑 Dono: ${config.numeroDono}`,
        `🌍 Timezone: ${config.timezone}`,
        `⚡ Versão: ${config.botInfo.versao}`,
        `⏰ Conectado em: ${moment().format('DD/MM/YYYY HH:mm:ss')}`
    ], 'green');
    
    // Log de debug para eventos
    console.log('[DEBUG] Eventos de mensagem configurados: message_create e message');
    
    // Importar módulos após cliente estar pronto (carregamento otimizado)
    console.log('📦 Carregando módulos de comandos...');
    const moduleStartTime = Date.now();
    
    try {
        welcomeHandler = require('./commands/welcome');
        banHandler = require('./commands/ban');
        sorteioHandler = require('./commands/sorteio');
        adsHandler = require('./handlers/AdsHandler');
        menuHandler = require('./commands/menu');
        groupControlHandler = require('./commands/groupControl');
        horariosHandler = require('./commands/horarios');
        autoRespostaHandler = require('./commands/autoresposta');
        syncStatusHandler = require('./commands/sync-status');
        syncPanelHandler = require('./commands/syncpanel');
        
        const moduleLoadTime = Date.now() - moduleStartTime;
        Logger.performance('Módulos de comandos carregados', moduleLoadTime);
    } catch (error) {
        Logger.error(`Erro ao carregar módulos: ${error.message}`);
    }
    
    // Inicializar módulo de envio centralizado primeiro (crítico)
    try {
        Sender.initialize(client);
        Logger.success('Módulo de envio centralizado inicializado');
    } catch (error) {
        Logger.error(`Erro ao inicializar Sender: ${error.message}`);
    }
    
    // Carregar sistemas automáticos em paralelo para ser mais rápido
    console.log('🔄 Iniciando carregamento de sistemas automáticos...');
    const systemStartTime = Date.now();
    
    await Promise.all([
        adsHandler.loadAllAds(client).catch(err => Logger.error('Erro ao carregar anúncios: ' + err.message)),
        groupControlHandler.loadSchedules(client).catch(err => Logger.error('Erro ao carregar agendamentos: ' + err.message)),
        horariosHandler.loadAutoHours(client).catch(err => Logger.error('Erro ao carregar horários: ' + err.message)),
        loadNotifiedUsers().catch(err => Logger.error('Erro ao carregar usuários notificados: ' + err.message))
    ]);
    
    const systemLoadTime = Date.now() - systemStartTime;
    Logger.performance('Sistemas automáticos carregados', systemLoadTime);
    
    Logger.success('Sistemas automáticos inicializados');
    
    // Inicializar serviço de mensagens automáticas híbrido (Laravel + Local)
    try {
        await AutoMessageHandler.initialize(DataManager);
        Logger.success('Serviço de mensagens automáticas híbrido inicializado');
    } catch (error) {
        Logger.error(`Erro ao inicializar AutoMessageHandler: ${error.message}`);
    }
    
    // Notificar painel Laravel de forma não-bloqueante
    notificarPainelLaravel().catch(err => 
        Logger.warning('Falha na notificação do painel (não crítico): ' + err.message)
    );
    
    const totalTime = Date.now() - startTime;
    Logger.performance('🚀 Bot totalmente inicializado', totalTime);
    
    // Mostrar informações do sistema
    const sysInfo = Utils.getSystemInfo();
    Logger.info(`Sistema: ${sysInfo.platform} | Node: ${sysInfo.version} | RAM: ${sysInfo.memory.heapUsed}`);
});

client.on('auth_failure', (msg) => {
    Logger.logBox('FALHA NA AUTENTICAÇÃO', [
        'Erro ao autenticar com o WhatsApp',
        'Possíveis causas:',
        '• QR Code expirado',
        '• Sessão inválida',
        '• Problema de conectividade',
        '',
        'Tentando reconectar...'
    ], 'red');
});

client.on('disconnected', (reason) => {
    Logger.logBox('DESCONECTADO', [
        `Motivo: ${reason}`,
        'Tentando reconectar automaticamente...',
        '',
        'Se o problema persistir, reinicie o bot'
    ], 'yellow');
    
    if (config.autoReconnect) {
        setTimeout(() => {
            Logger.info('Tentando reconectar...');
            client.initialize();
        }, 5000);
    }
});

// ========================================================================================================
// 📨 PROCESSAMENTO DE MENSAGENS OTIMIZADO
// ========================================================================================================

// Função para processar mensagens (unificada)
async function processMessage(message) {
    try {
        const startTime = Date.now();
        
        // Ignorar mensagens do próprio bot
        if (message.fromMe) return;
        
        // Debug log para verificar se mensagens estão chegando
        console.log(`[DEBUG] Mensagem recebida de: ${message.from}, corpo: "${message.body?.substring(0, 50)}..."`);

        // Verificar se é mensagem privada
        if (!message.from.includes('@g.us')) {
            await handlePrivateMessage(client, message);
            return;
        }

        const groupId = message.from;
        const messageBody = message.body?.trim() || '';
        
        // Verificar se a mensagem começa com o prefixo
        if (!messageBody.startsWith(config.prefix)) return;

        // Extrair comando e argumentos
        const args = messageBody.slice(config.prefix.length).trim().split(' ');
        const command = args.shift()?.toLowerCase();
        const argsString = args.join(' ');

        // Log do comando
        Logger.command(Utils.getUsername(message), `${config.prefix}${command}`, Utils.getGroupName(groupId));

        // Verificar status do grupo (otimizado com cache)
        const groupStatus = await RentalSystem.checkGroupStatus(groupId);
        console.log(`[DEBUG] Status do grupo ${groupId}: ${groupStatus.active ? 'ATIVO' : 'INATIVO'} - Razão: ${groupStatus.reason}`);
        
        if (!groupStatus.active && !Utils.isOwner(message)) {
            console.log(`[DEBUG] Grupo bloqueado - enviando mensagem de erro`);
            await message.reply(groupStatus.message);
            return;
        }

        // Lista de comandos disponíveis
        const availableCommands = [
            'menu', 'ban', 'unban', 'kick', 'add', 'promote', 'demote', 'mute', 'unmute',
            'banfoto', 'bangringo', 'addads', 'rmads', 'listads', 'statusads', 'bv', 'legendabv',
            'abrirgrupo', 'fechargrupo', 'abrirgp', 'fechargp', 'afgp', 'sorteio', 'horarios',
            'autoresposta', 'checkpanel', 'fixpanel', 'syncstatus', 'syncpanel', 'linkgp', 'id',
            'sorte', 'conselhos', 'conselho', 'allg', 'allg2', 'ping', 'status', 'uptime'
        ];

        if (!availableCommands.includes(command)) {
            return; // Comando não reconhecido, ignorar silenciosamente
        }

        // ====================================================================================================
        // 🎯 ROTEAMENTO DE COMANDOS OTIMIZADO
        // ====================================================================================================

        switch (command) {
            // Comandos do sistema
            case 'menu':
                await menuHandler.handle(client, message, command, argsString);
                break;

            case 'ping':
                const pingStart = Date.now();
                const pingMessage = await message.reply('🏓 Pong!');
                const pingTime = Date.now() - pingStart;
                
                const sysInfo = Utils.getSystemInfo();
                const statusText = `🏓 *Pong!*\n\n` +
                    `⚡ *Latência:* ${pingTime}ms\n` +
                    `🕐 *Uptime:* ${Math.floor(sysInfo.uptime / 60)}min\n` +
                    `💾 *RAM:* ${sysInfo.memory.heapUsed}\n` +
                    `🤖 *Versão:* ${config.botInfo.versao}\n` +
                    `📅 *Data:* ${moment().format('DD/MM/YYYY HH:mm:ss')}`;
                
                setTimeout(async () => {
                    try {
                        await pingMessage.edit(statusText);
                    } catch (error) {
                        await message.reply(statusText);
                    }
                }, 1000);
                break;

            case 'status':
            case 'uptime':
                const sysStatus = Utils.getSystemInfo();
                const uptimeHours = Math.floor(sysStatus.uptime / 3600);
                const uptimeMinutes = Math.floor((sysStatus.uptime % 3600) / 60);
                
                const statusResponse = `📊 *STATUS DO SISTEMA*\n\n` +
                    `🟢 *Status:* Online\n` +
                    `⏰ *Uptime:* ${uptimeHours}h ${uptimeMinutes}min\n` +
                    `💾 *Memória:*\n` +
                    `   • Heap: ${sysStatus.memory.heapUsed}\n` +
                    `   • Total: ${sysStatus.memory.heapTotal}\n` +
                    `🖥️ *Sistema:* ${sysStatus.platform}\n` +
                    `⚡ *Node.js:* ${sysStatus.version}\n` +
                    `🤖 *Bot:* v${config.botInfo.versao}\n` +
                    `📅 *Última inicialização:* ${moment().subtract(sysStatus.uptime, 'seconds').format('DD/MM/YYYY HH:mm:ss')}`;
                
                await message.reply(statusResponse);
                break;

            // Comandos de moderação
            case 'ban':
            case 'unban':
            case 'kick':
            case 'add':
            case 'promote':
            case 'demote':
            case 'mute':
            case 'unmute':
            case 'banfoto':
            case 'bangringo':
                await banHandler.handle(client, message, command, argsString);
                break;

            // Comandos de anúncios (handler otimizado)
            case 'addads':
            case 'listads':
            case 'rmads':
            case 'statusads':
                await adsHandler.handle(client, message, command, argsString);
                break;

            // Comandos de debug e painel
            case 'checkpanel':
            case 'fixpanel':
                const debugHandler = require('./commands/debug');
                await debugHandler.handle(client, message, command, argsString);
                break;

            // Comandos de bem-vindo
            case 'bv':
            case 'legendabv':
                await welcomeHandler.handle(client, message, command, argsString);
                break;

            // Comandos de controle de grupo
            case 'abrirgrupo':
            case 'fechargrupo':
            case 'abrirgp':
            case 'fechargp':
            case 'afgp':
                await groupControlHandler.handle(client, message, command, argsString);
                break;

            // Comando de sorteio
            case 'sorteio':
                await sorteioHandler.handle(client, message, argsString);
                break;

            // Comandos de horários
            case 'horarios':
                // Verificar modo SOADM para comando interativo
                const soadmStatusHorarios = await DataManager.loadConfig(groupId, 'soadm');
                const isOwnerHorarios = Utils.isOwner(message);
                const isAdminHorarios = await Utils.isAdmin(message);
                
                if ((soadmStatusHorarios === '1' || soadmStatusHorarios === 1) && !isAdminHorarios && !isOwnerHorarios) {
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                    return;
                }
                
                await horariosHandler.handle(client, message, command, argsString);
                break;

            // Comando de autoresposta
            case 'autoresposta':
                await autoRespostaHandler.handle(client, message, command, argsString);
                break;

            // Comandos de sincronização
            case 'syncstatus':
                await syncStatusHandler.handle(client, message, command, argsString);
                break;

            case 'syncpanel':
                await syncPanelHandler.handle(client, message, command, argsString);
                break;

            // Comando de link do grupo
            case 'linkgp':
                try {
                    // Verificar modo SOADM para comando !linkgp
                    const soadmStatusLink = await DataManager.loadConfig(groupId, 'soadm');
                    const isOwnerLink = Utils.isOwner(message);
                    const isAdminLink = await Utils.isAdmin(message);
                    
                    if ((soadmStatusLink === '1' || soadmStatusLink === 1) && !isAdminLink && !isOwnerLink) {
                        await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                        return;
                    }

                    const chat = await message.getChat();
                    if (!chat.isGroup) {
                        await message.reply('❌ Este comando só funciona em grupos.');
                        return;
                    }

                    const inviteCode = await chat.getInviteCode();
                    const groupLink = `https://chat.whatsapp.com/${inviteCode}`;
                    
                    await message.reply(`🔗 *Link do Grupo:*\n\n${groupLink}\n\n📋 *Nome:* ${chat.name}\n👥 *Participantes:* ${chat.participants.length}`);
                    
                } catch (error) {
                    Logger.error(`Erro no comando !linkgp: ${error.message}`);
                    await message.reply('❌ Erro ao gerar link do grupo. Verifique se sou administrador.');
                }
                break;

            // Comando de ID do grupo
            case 'id':
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
                    
                } catch (error) {
                    Logger.error(`Erro no comando !id: ${error.message}`);
                    await message.reply('❌ Erro ao obter ID do grupo.');
                }
                break;

            // Comando de sorte
            case 'sorte':
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

            // Comando de conselhos (com IA)
            case 'conselhos':
            case 'conselho':
                const soadmStatusConselho = await DataManager.loadConfig(groupId, 'soadm');
                const isOwnerConselho = Utils.isOwner(message);
                const isAdminConselho = await Utils.isAdmin(message);
                
                if ((soadmStatusConselho === '1' || soadmStatusConselho === 1) && !isAdminConselho && !isOwnerConselho) {
                    await message.reply('🔒 *Modo SOADM ativado!*\n\n👑 Apenas administradores podem usar comandos interativos.');
                    return;
                }
                
                try {
                    const apiKey = process.env.GROQ_API_KEY || config.groqApiKey || 'SUA_CHAVE_GROQ_AQUI';
                    
                    if (apiKey === 'SUA_CHAVE_GROQ_AQUI') {
                        await message.reply('⚠️ *Comando não configurado!*\n\nConfigure a chave da API Groq no config.json');
                        return;
                    }

                    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                        model: 'llama3-8b-8192',
                        messages: [
                            {
                                role: 'system',
                                content: 'Você é um conselheiro sábio e positivo. Dê conselhos inspiradores e motivacionais em português do Brasil, de forma breve e objetiva.'
                            },
                            {
                                role: 'user',
                                content: argsString || 'Me dê um conselho motivacional para o dia'
                            }
                        ],
                        max_tokens: 200,
                        temperature: 0.7
                    }, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    const conselho = response.data.choices[0].message.content;
                    await message.reply(`💡 *Conselho do Dia:*\n\n${conselho}\n\n✨ _Tenha um ótimo dia!_`);
                    
                } catch (error) {
                    Logger.error(`Erro no comando !conselho: ${error.message}`);
                    await message.reply('❌ Erro ao gerar conselho. Tente novamente mais tarde.');
                }
                break;

            // Comandos de menção em massa
            case 'allg':
                try {
                    if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                        await message.reply('🚫 Apenas administradores podem usar este comando.');
                        return;
                    }

                    const chat = await message.getChat();
                    if (!chat.isGroup) {
                        await message.reply('❌ Este comando só funciona em grupos.');
                        return;
                    }

                    const participants = chat.participants.map(participant => `@${participant.id.user}`);
                    const mentions = chat.participants.map(participant => participant.id);
                    
                    const allgMessage = argsString || 'Atenção pessoal! 📢';
                    const finalMessage = `${allgMessage}\n\n${participants.join(' ')}`;
                    
                    await client.sendMessage(groupId, finalMessage, { mentions });
                    Logger.success(`Comando !allg executado - ${participants.length} membros mencionados`);
                    
                } catch (error) {
                    Logger.error(`Erro no comando !allg: ${error.message}`);
                    await message.reply('❌ Erro ao executar comando !allg. Verifique se sou administrador.');
                }
                break;

            case 'allg2':
                try {
                    if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
                        await message.reply('🚫 Apenas administradores podem usar este comando.');
                        return;
                    }

                    const chat2 = await message.getChat();
                    if (!chat2.isGroup) {
                        await message.reply('❌ Este comando só funciona em grupos.');
                        return;
                    }

                    const participants2 = chat2.participants.map(participant => `@${participant.id.user}`);
                    const mentions2 = chat2.participants.map(participant => participant.id);
                    
                    const allg2Message = argsString || 'Comunicado importante! 📌';
                    const finalMessage2 = `${allg2Message}\n\n${participants2.join(' ')}`;
                    
                    const sentMessage = await client.sendMessage(groupId, finalMessage2, { mentions: mentions2 });
                    
                    // Tentar fixar a mensagem
                    try {
                        await sentMessage.pin();
                    } catch (pinError) {
                        Logger.warning('Não foi possível fixar a mensagem (permissões insuficientes)');
                    }
                    
                    Logger.success(`Comando !allg2 executado - ${participants2.length} membros mencionados e mensagem fixada`);
                    
                } catch (error) {
                    Logger.error(`Erro no comando !allg2: ${error.message}`);
                    await message.reply('❌ Erro ao executar comando !allg2. Verifique se sou administrador.');
                }
                break;

            default:
                // Comando não reconhecido - não fazer nada (já filtrado acima)
                break;
        }

        // Log de performance do comando
        const processingTime = Date.now() - startTime;
        if (processingTime > 1000) {
            Logger.performance(`Comando ${command} processado`, processingTime);
        }

    } catch (error) {
        Logger.error(`Erro crítico ao processar mensagem: ${error.message}`);
        console.error('Stack trace:', error.stack);
        
        try {
            await message.reply('❌ *Erro interno do sistema*\n\n🔧 Tente novamente em alguns segundos.\n📞 Se o problema persistir, contate o suporte.');
        } catch (replyError) {
            Logger.error(`Erro ao enviar mensagem de erro: ${replyError.message}`);
        }
    }
}

// Configurar eventos de mensagem (duplo para garantir compatibilidade)
client.on('message_create', processMessage);
client.on('message', processMessage);

// ========================================================================================================
// 🚀 INICIALIZAÇÃO DO BOT
// ========================================================================================================

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`);
    console.error('Stack trace:', error.stack);
});

// Inicializar o cliente
Logger.logBox('INICIANDO BOT WHATSAPP', [
    `🤖 Bot Administrador v${config.botInfo.versao}`,
    `👑 Dono: ${config.numeroDono}`,
    `🌍 Timezone: ${config.timezone}`,
    `📅 Data: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
    '',
    '🔄 Inicializando cliente WhatsApp...'
], 'blue');

client.initialize();

// Exportar para uso em outros módulos
module.exports = {
    client,
    DataManager,
    Utils,
    Logger,
    RentalSystem,
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