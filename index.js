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

// Função para processar mensagens (versão ultra-robusta) - V3.0
async function processMessage(message) {
    const startTime = Date.now();
    
    try {
        // Log detalhado de entrada
        console.log(`[MSG-HANDLER] 📨 Nova mensagem recebida`);
        console.log(`[MSG-HANDLER] 📍 From: ${message?.from || 'UNKNOWN'}`);
        console.log(`[MSG-HANDLER] 📝 Body: "${message?.body?.substring(0, 100) || 'EMPTY'}"`);
        console.log(`[MSG-HANDLER] 🕐 Timestamp: ${new Date().toISOString()}`);
        
        // Validações críticas
        if (!message) {
            console.log(`[MSG-HANDLER] ⚠️ Mensagem nula - ignorando`);
            return;
        }
        
        if (!message.body || typeof message.body !== 'string') {
            console.log(`[MSG-HANDLER] ⚠️ Body inválido - ignorando`);
            return;
        }
        
        if (!message.from) {
            console.log(`[MSG-HANDLER] ⚠️ From inválido - ignorando`);
            return;
        }

        // Verificar se é comando
        const isCommand = message.body.trim().startsWith('!');
        console.log(`[MSG-HANDLER] ⚡ É comando: ${isCommand ? 'SIM' : 'NÃO'}`);
        
        if (!isCommand) {
            console.log(`[MSG-HANDLER] 📤 Não é comando - finalizando processamento`);
            return;
        }

        // Extrair comando com segurança
        const bodyTrimmed = message.body.trim();
        const args = bodyTrimmed.slice(1).split(/\s+/).filter(arg => arg.length > 0);
        
        if (args.length === 0) {
            console.log(`[MSG-HANDLER] ⚠️ Comando vazio - ignorando`);
            return;
        }
        
        const command = args[0].toLowerCase();
        console.log(`[MSG-HANDLER] 🎯 Comando extraído: "${command}"`);
        console.log(`[MSG-HANDLER] 📋 Argumentos: [${args.slice(1).join(', ')}]`);

        // Obter chat com timeout
        let chat;
        try {
            console.log(`[MSG-HANDLER] 🔍 Obtendo informações do chat...`);
            chat = await Promise.race([
                message.getChat(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao obter chat')), 5000))
            ]);
            console.log(`[MSG-HANDLER] ✅ Chat obtido: ${chat?.name || chat?.id?.user || 'Privado'} (${chat?.isGroup ? 'Grupo' : 'Privado'})`);
        } catch (chatError) {
            console.error(`[MSG-HANDLER] ❌ Erro ao obter chat: ${chatError.message}`);
            // Tentar resposta de emergência
            try {
                await client.sendMessage(message.from, '⚠️ Erro interno - tente novamente');
                console.log(`[MSG-HANDLER] ✅ Resposta de emergência enviada`);
            } catch (emergencyError) {
                console.error(`[MSG-HANDLER] ❌ Falha na resposta de emergência: ${emergencyError.message}`);
            }
            return;
        }

        // Lista de comandos válidos
        const validCommands = [
            'menu', 'ping', 'status', 'uptime', 'listads', 'addad', 'removead',
            'ban', 'unban', 'allg', 'allg2', 'sorteio', 'welcome', 'autoresposta',
            'horarios', 'debug', 'syncpanel', 'syncstatus'
        ];

        if (!validCommands.includes(command)) {
            console.log(`[MSG-HANDLER] ❓ Comando "${command}" não reconhecido`);
            try {
                await Sender.sendMessage(client, message.from, 
                    `❓ *Comando não reconhecido: "${command}"*\n\nDigite *!menu* para ver comandos disponíveis.`);
                console.log(`[MSG-HANDLER] ✅ Resposta de comando inválido enviada`);
            } catch (invalidCmdError) {
                console.error(`[MSG-HANDLER] ❌ Erro ao responder comando inválido: ${invalidCmdError.message}`);
            }
            return;
        }

        console.log(`[MSG-HANDLER] ✅ Comando válido reconhecido: "${command}"`);

        // Processar comando específico com timeout
        const commandTimeout = 30000; // 30 segundos
        
        try {
            await Promise.race([
                executeCommand(command, args, message, chat),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout ao executar comando ${command}`)), commandTimeout)
                )
            ]);
            
            const processingTime = Date.now() - startTime;
            console.log(`[MSG-HANDLER] ✅ Comando "${command}" executado com sucesso em ${processingTime}ms`);
            
        } catch (commandError) {
            console.error(`[MSG-HANDLER] ❌ Erro ao executar comando "${command}": ${commandError.message}`);
            
            // Verificar se é erro validateAndGetParts
            if (commandError.message.includes('validateAndGetParts') || 
                commandError.stack?.includes('validateAndGetParts')) {
                console.error(`[MSG-HANDLER] 🔧 ERRO validateAndGetParts DETECTADO!`);
                
                // Resposta de emergência simplificada
                try {
                    await client.sendMessage(message.from, '⚠️ Erro interno detectado. Comando sendo processado...');
                    console.log(`[MSG-HANDLER] ✅ Resposta de emergência para validateAndGetParts enviada`);
                } catch (emergencyError) {
                    console.error(`[MSG-HANDLER] ❌ Falha na resposta de emergência validateAndGetParts: ${emergencyError.message}`);
                }
            } else {
                // Resposta de erro genérica
                try {
                    await Sender.sendMessage(client, message.from, 
                        `❌ *Erro ao executar comando*\n\n🔧 Comando: ${command}\n⚠️ Tente novamente em alguns segundos.`);
                    console.log(`[MSG-HANDLER] ✅ Resposta de erro genérica enviada`);
                } catch (errorResponseError) {
                    console.error(`[MSG-HANDLER] ❌ Falha ao enviar resposta de erro: ${errorResponseError.message}`);
                }
            }
        }
        
    } catch (globalError) {
        const processingTime = Date.now() - startTime;
        console.error(`[MSG-HANDLER] 🚨 ERRO GLOBAL NO PROCESSAMENTO (${processingTime}ms):`);
        console.error(`[MSG-HANDLER] 📍 From: ${message?.from || 'UNKNOWN'}`);
        console.error(`[MSG-HANDLER] 📝 Body: "${message?.body?.substring(0, 100) || 'EMPTY'}"`);
        console.error(`[MSG-HANDLER] ❌ Erro: ${globalError.message}`);
        console.error(`[MSG-HANDLER] 📚 Stack: ${globalError.stack}`);
        
        // Log específico para validateAndGetParts
        if (globalError.message.includes('validateAndGetParts') || 
            globalError.stack?.includes('validateAndGetParts')) {
            console.error(`[MSG-HANDLER] 🔧 ERRO validateAndGetParts NO NÍVEL GLOBAL!`);
            console.error(`[MSG-HANDLER] 💡 Causa provável: ID de chat malformado ou problema interno do WhatsApp Web`);
        }
        
        // Última tentativa de resposta
        try {
            await client.sendMessage(message.from, '🚨 Erro crítico detectado. Sistema sendo reiniciado...');
            console.log(`[MSG-HANDLER] ✅ Última resposta de emergência enviada`);
        } catch (lastError) {
            console.error(`[MSG-HANDLER] ❌ FALHA TOTAL - não foi possível responder: ${lastError.message}`);
        }
    }
}

// Função auxiliar para executar comandos
async function executeCommand(command, args, message, chat) {
    console.log(`[CMD-EXEC] 🚀 Executando comando: "${command}"`);
    
    switch (command) {
        case 'ping':
            await Sender.sendMessage(client, message.from, '🏓 *Pong!*\n\n✅ Bot está respondendo normalmente.');
            break;
            
        case 'status':
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const statusMsg = `📊 *Status do Bot*\n\n` +
                `⏱️ Online há: ${hours}h ${minutes}m\n` +
                `🔗 Conectado: ✅\n` +
                `📱 WhatsApp: Ativo\n` +
                `💾 Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
            await Sender.sendMessage(client, message.from, statusMsg);
            break;
            
        case 'uptime':
            const uptimeSeconds = process.uptime();
            const days = Math.floor(uptimeSeconds / 86400);
            const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600);
            const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
            await Sender.sendMessage(client, message.from, 
                `⏰ *Bot Online há:*\n${days}d ${uptimeHours}h ${uptimeMinutes}m`);
            break;
            
        case 'menu':
            await MenuCommand.execute(client, message, args);
            break;
            
        case 'listads':
            await AdsHandler.listAds(client, message, args);
            break;
            
        case 'addad':
            await AdsHandler.addAd(client, message, args);
            break;
            
        case 'removead':
            await AdsHandler.removeAd(client, message, args);
            break;
            
        default:
            console.log(`[CMD-EXEC] ⚠️ Comando "${command}" reconhecido mas não implementado nesta versão`);
            await Sender.sendMessage(client, message.from, 
                `⚠️ *Comando em manutenção*\n\nO comando "${command}" está sendo atualizado.\n\nTente novamente em alguns minutos.`);
            break;
    }
    
    console.log(`[CMD-EXEC] ✅ Comando "${command}" finalizado`);
}
                    console.error(`[DEBUG] Erro no comando listads: ${error.message}`);
                }
                break;

            case 'addad':
                try {
                    await AdsHandler.addAd(client, message, args);
                    console.log(`[DEBUG] ✅ Comando addad executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando addad: ${error.message}`);
                }
                break;

            case 'removead':
                try {
                    await AdsHandler.removeAd(client, message, args);
                    console.log(`[DEBUG] ✅ Comando removead executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando removead: ${error.message}`);
                }
                break;

            case 'ban':
                try {
                    await BanCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando ban executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando ban: ${error.message}`);
                }
                break;

            case 'unban':
                try {
                    await BanCommand.unban(client, message, args);
                    console.log(`[DEBUG] ✅ Comando unban executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando unban: ${error.message}`);
                }
                break;

            case 'allg':
            case 'allg2':
                try {
                    if (!chat.isGroup) {
                        await Sender.sendMessage(client, message.from, 
                            '❌ Este comando só funciona em grupos!');
                        return;
                    }
                    
                    const participants = chat.participants;
                    if (!participants || participants.length === 0) {
                        await Sender.sendMessage(client, message.from, 
                            '❌ Não foi possível obter a lista de participantes.');
                        return;
                    }
                    
                    const mentions = participants.map(p => p.id._serialized);
                    const mentionText = participants.map(p => `@${p.id.user}`).join(' ');
                    
                    await client.sendMessage(message.from, mentionText, {
                        mentions: mentions
                    });
                    console.log(`[DEBUG] ✅ Comando ${command} executado - ${mentions.length} menções`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando ${command}: ${error.message}`);
                }
                break;

            case 'sorteio':
                try {
                    await SorteioCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando sorteio executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando sorteio: ${error.message}`);
                }
                break;

            case 'welcome':
                try {
                    await WelcomeCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando welcome executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando welcome: ${error.message}`);
                }
                break;

            case 'autoresposta':
                try {
                    await AutoRespostaCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando autoresposta executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando autoresposta: ${error.message}`);
                }
                break;

            case 'horarios':
                try {
                    await HorariosCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando horarios executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando horarios: ${error.message}`);
                }
                break;

            case 'debug':
                try {
                    await DebugCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando debug executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando debug: ${error.message}`);
                }
                break;

            case 'syncpanel':
                try {
                    await SyncPanelCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando syncpanel executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando syncpanel: ${error.message}`);
                }
                break;

            case 'syncstatus':
                try {
                    await SyncStatusCommand.execute(client, message, args);
                    console.log(`[DEBUG] ✅ Comando syncstatus executado`);
                } catch (error) {
                    console.error(`[DEBUG] Erro no comando syncstatus: ${error.message}`);
                }
                break;

            default:
                console.log(`[DEBUG] ❓ Comando não implementado: "${command}"`);
                try {
                    await Sender.sendMessage(client, message.from, 
                        `❓ Comando "${command}" não implementado.\n\nDigite *!menu* para ver comandos disponíveis.`);
                } catch (error) {
                    console.error(`[DEBUG] Erro ao enviar resposta de comando não implementado: ${error.message}`);
                }
                break;
        }

    } catch (error) {
        console.error(`[DEBUG] 🚨 ERRO CRÍTICO NO PROCESSAMENTO DE MENSAGEM:`);
        console.error(`[DEBUG] Mensagem de: ${message?.from || 'UNKNOWN'}`);
        console.error(`[DEBUG] Corpo: "${message?.body?.substring(0, 100) || 'EMPTY'}"`);
        console.error(`[DEBUG] Erro: ${error.message}`);
        console.error(`[DEBUG] Stack: ${error.stack}`);
        
        // Verificar se é o erro validateAndGetParts
        if (error.message.includes('validateAndGetParts') || error.stack?.includes('validateAndGetParts')) {
            console.error(`[DEBUG] 🔧 ERRO validateAndGetParts DETECTADO - Este é o erro principal!`);
            console.error(`[DEBUG] 💡 Possíveis causas: ID de chat inválido, mensagem malformada, ou problema interno do WhatsApp Web`);
            
            // Tentar uma resposta de emergência simplificada
            try {
                const simpleResponse = '⚠️ Erro interno detectado. Tente novamente.';
                await client.sendMessage(message.from, simpleResponse);
                console.log(`[DEBUG] ✅ Resposta de emergência enviada com sucesso`);
            } catch (emergencyError) {
                console.error(`[DEBUG] ❌ Falha ao enviar resposta de emergência: ${emergencyError.message}`);
            }
        }
        
        Logger.error(`Erro crítico ao processar mensagem: ${error.message}`);
        
        // Tentar enviar resposta de erro se possível
        try {
            if (message && message.reply && typeof message.reply === 'function') {
                await message.reply('❌ *Erro interno do sistema*\n\n🔧 Tente novamente em alguns segundos.\n📞 Se o problema persistir, contate o suporte.');
                console.log(`[DEBUG] ✅ Resposta de erro enviada via reply`);
            } else {
                await Sender.sendMessage(client, message.from, '❌ *Erro interno*\n\nTente novamente em alguns segundos.');
                console.log(`[DEBUG] ✅ Resposta de erro enviada via Sender`);
            }
        } catch (replyError) {
            console.error(`[DEBUG] ❌ Não foi possível enviar resposta de erro: ${replyError.message}`);
            Logger.error(`Erro ao enviar mensagem de erro: ${replyError.message}`);
        }
    }
}

// Configurar eventos de mensagem com wrapper de segurança
const safeProcessMessage = async (message) => {
    try {
        await processMessage(message);
    } catch (error) {
        console.error(`[SAFETY] Erro capturado no wrapper de segurança: ${error.message}`);
        console.error(`[SAFETY] Stack: ${error.stack}`);
    }
};

// Configurar eventos de mensagem (duplo para garantir compatibilidade)
client.on('message_create', safeProcessMessage);
client.on('message', safeProcessMessage);

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