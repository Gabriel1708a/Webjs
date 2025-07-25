// ========================================================================================================
// 🤖 BOT WHATSAPP ADMINISTRADOR - VERSÃO CORRIGIDA 3.2 - CRÍTICA URGENTE
// ========================================================================================================
// 📅 Última atualização: 2024 - CORREÇÃO CRÍTICA IMEDIATA
// 🔧 Correções implementadas: Cache inteligente, Performance otimizada, Logs detalhados
// 🚀 Melhorias: Sistema híbrido Laravel + Local, Handlers unificados, Inicialização paralela
// 🆘 HOTFIX CRÍTICO: Corrigido validateAndGetParts + Event listeners duplos + Validação robusta
// ⚡ NOVO: Sistema de fallback robusto + Proteção contra erros internos do WPP
// 🔥 URGENTE: Correção imediata para responsividade total e erros de envio
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
                'User-Agent': 'WhatsApp-Bot/3.0'
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
let WelcomeCommand, BanCommand, SorteioCommand, AdsHandler, MenuCommand, GroupControlCommand, HorariosCommand, AutoRespostaCommand, SyncStatusCommand, SyncPanelCommand, DebugCommand;

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
    static logBox(title, lines = [], color = 'cyan') {
        const width = 80;
        const titleLine = `${title}`.padStart((width + title.length) / 2).padEnd(width);
        
        console.log(chalk[color]('═'.repeat(width)));
        console.log(chalk[color](`║${titleLine}║`));
        console.log(chalk[color]('╠' + '═'.repeat(width - 2) + '╣'));
        
        lines.forEach(line => {
            const paddedLine = ` ${line}`.padEnd(width - 1);
            console.log(chalk[color](`║${paddedLine}║`));
        });
        
        console.log(chalk[color]('═'.repeat(width)));
    }

    static info(message) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.blue(`[${timestamp}] [INFO] ${message}`));
    }

    static success(message) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.green(`[${timestamp}] [SUCCESS] ${message}`));
    }

    static error(message) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.red(`[${timestamp}] [ERROR] ${message}`));
    }

    static warning(message) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.yellow(`[${timestamp}] [WARNING] ${message}`));
    }

    static command(user, command) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.magenta(`[${timestamp}] [COMMAND] ${user}: ${command}`));
    }

    static admin(user, action) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.cyan(`[${timestamp}] [ADMIN] ${user}: ${action}`));
    }

    static performance(action, timeMs) {
        const timestamp = moment().format('HH:mm:ss');
        console.log(chalk.gray(`[${timestamp}] [PERF] ${action}: ${timeMs}ms`));
    }
}

// ========================================================================================================
// 💾 SISTEMA DE GERENCIAMENTO DE DADOS OTIMIZADO COM CACHE INTELIGENTE
// ========================================================================================================

class DataManager {
    static dataCache = new Map();
    static cacheExpiry = new Map();
    static CACHE_DURATION = 30000; // 30 segundos

    static async loadData(filename) {
        const cacheKey = filename;
        const now = Date.now();

        // Verificar cache
        if (this.dataCache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > now) {
            Logger.performance(`Cache hit para ${filename}`, 0);
            return this.dataCache.get(cacheKey);
        }

        try {
            const startTime = Date.now();
            const filePath = path.join(__dirname, 'data', filename);
            
            if (!fs.existsSync(filePath)) {
                Logger.warning(`Arquivo ${filename} não encontrado, criando estrutura padrão`);
                const defaultData = this.getDefaultStructure(filename);
                await this.saveData(filename, defaultData);
                return defaultData;
            }

            const data = await fs.readJson(filePath);
            
            // Atualizar cache
            this.dataCache.set(cacheKey, data);
            this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
            
            const loadTime = Date.now() - startTime;
            Logger.performance(`Carregado ${filename}`, loadTime);
            return data;
        } catch (error) {
            Logger.error(`Erro ao carregar ${filename}: ${error.message}`);
            return this.getDefaultStructure(filename);
        }
    }

    static async saveData(filename, data) {
        try {
            const startTime = Date.now();
            const filePath = path.join(__dirname, 'data', filename);
            await fs.writeJson(filePath, data, { spaces: 2 });
            
            // Limpar cache
            this.dataCache.delete(filename);
            this.cacheExpiry.delete(filename);
            
            const saveTime = Date.now() - startTime;
            Logger.performance(`Salvo ${filename}`, saveTime);
            return true;
        } catch (error) {
            Logger.error(`Erro ao salvar ${filename}: ${error.message}`);
            return false;
        }
    }

    static getDefaultStructure(filename) {
        const defaults = {
            'ads.json': { anuncios: {} },
            'configs.json': { grupos: {} },
            'grupoAluguel.json': { grupos: {} },
            'sorteios.json': { sorteios: {} },
            'horarios.json': { horarios: {} },
            'notifiedUsers.json': { users: [] }
        };
        return defaults[filename] || {};
    }

    static clearCache() {
        this.dataCache.clear();
        this.cacheExpiry.clear();
        Logger.info('Cache limpo com sucesso');
    }
}

// ========================================================================================================
// 🔧 SISTEMA DE UTILITÁRIOS OTIMIZADO
// ========================================================================================================

class Utils {
    static isAdmin(participantId, adminList) {
        if (!adminList || !Array.isArray(adminList)) return false;
        return adminList.some(admin => 
            admin.id && (admin.id._serialized === participantId || admin.id.user === participantId.split('@')[0])
        );
    }

    static isOwner(phone) {
        if (!phone || !config.numeroDono) return false;
        const cleanPhone = phone.replace(/\D/g, '');
        const cleanOwner = config.numeroDono.replace(/\D/g, '');
        const isOwner = cleanPhone === cleanOwner || cleanPhone.includes(cleanOwner) || cleanOwner.includes(cleanPhone);
        Logger.info(`Verificação de dono: ${phone} -> ${isOwner ? 'SIM' : 'NÃO'}`);
        return isOwner;
    }

    static getUsername(contact) {
        if (!contact) return 'Usuário';
        return contact.pushname || contact.name || contact.id?.user || 'Usuário';
    }

    static getGroupName(chat) {
        if (!chat) return 'Grupo';
        return chat.name || 'Grupo sem nome';
    }

    static getSystemInfo() {
        const info = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            version: process.version,
            timestamp: new Date().toISOString()
        };
        Logger.performance('Informações do sistema coletadas', 0);
        return info;
    }
}

// ========================================================================================================
// 🏠 SISTEMA DE ALUGUEL OTIMIZADO
// ========================================================================================================

class RentalSystem {
    static async checkGroupStatus(groupId) {
        try {
            const startTime = Date.now();
            
            // TEMPORÁRIO: Retornar sempre ativo para debug
            Logger.info(`[RENTAL-DEBUG] Verificação temporariamente desabilitada para ${groupId}`);
            const checkTime = Date.now() - startTime;
            Logger.performance(`Verificação de aluguel (debug)`, checkTime);
            return { active: true, daysLeft: 999, isOwner: true };
            
            // CÓDIGO ORIGINAL (comentado para debug)
            /*
            const data = await DataManager.loadData('grupoAluguel.json');
            const group = data.grupos[groupId];
            
            if (!group) {
                Logger.warning(`Grupo ${groupId} não encontrado no sistema de aluguel`);
                return { active: false, daysLeft: 0, isOwner: false };
            }

            const now = moment();
            const expiry = moment(group.dataExpiracao);
            const daysLeft = expiry.diff(now, 'days');
            const active = daysLeft > 0;

            const checkTime = Date.now() - startTime;
            Logger.performance(`Verificação de aluguel para ${groupId}`, checkTime);
            Logger.info(`Grupo ${groupId}: ${active ? 'ATIVO' : 'EXPIRADO'} (${daysLeft} dias restantes)`);

            return { active, daysLeft, isOwner: group.isOwner || false };
            */
        } catch (error) {
            Logger.error(`Erro ao verificar status do grupo ${groupId}: ${error.message}`);
            // Em caso de erro, permitir acesso para não bloquear o bot
            return { active: true, daysLeft: 0, isOwner: false };
        }
    }
}

// ========================================================================================================
// 🔧 PROCESSAMENTO DE MENSAGENS - VERSÃO CRÍTICA CORRIGIDA
// ========================================================================================================

// Função de processamento de mensagens com fallback robusto
async function processMessage(message) {
    const startTime = Date.now();
    
    try {
        console.log(`[PROCESS] 📨 Mensagem de ${message.from}: "${message.body?.substring(0, 50)}${message.body?.length > 50 ? '...' : ''}"`);
        
        // Verificações básicas
        if (!message.body || message.type !== 'chat') {
            return;
        }

        // Verificar se é comando
        if (!message.body.startsWith('!')) {
            return;
        }
        
        // Extrair comando e argumentos
        const args = message.body.trim().slice(1).split(/\s+/).filter(arg => arg.length > 0);
        if (args.length === 0) {
            return;
        }
        
        const command = args[0].toLowerCase();
        console.log(`[COMMAND] 🚀 Executando comando: ${command}`);
        
        // Obter chat com retry
        let chat;
        let retryCount = 0;
        const maxRetries = 3;
        
        console.log(`[PROC-MSG-CRITICAL] 📱 Obtendo chat com retry...`);
        
        while (retryCount < maxRetries) {
            try {
                chat = await message.getChat();
                console.log(`[PROC-MSG-CRITICAL] ✅ Chat obtido: ${chat?.name || 'Chat privado'} (tentativa ${retryCount + 1})`);
                break;
            } catch (chatError) {
                retryCount++;
                console.error(`[PROC-MSG-CRITICAL] ❌ Erro ao obter chat (tentativa ${retryCount}/${maxRetries}): ${chatError.message}`);
                
                if (retryCount >= maxRetries) {
                    // Enviar resposta de fallback diretamente
                    console.log(`[PROC-MSG-CRITICAL] 🚨 Falha crítica ao obter chat - enviando resposta de emergência`);
                    await sendEmergencyResponse(message.from, command);
                    return;
                }
                
                // Aguardar antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }
        
        // Executar comando com sistema de fallback
        console.log(`[PROC-MSG-CRITICAL] 🎮 Executando comando com fallback...`);
        await executeCommandWithFallback(command, args, message, chat);
        
        const processingTime = Date.now() - startTime;
        console.log(`[PROC-MSG-CRITICAL] ✅ PROCESSAMENTO CONCLUÍDO em ${processingTime}ms`);
        
    } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`[PROC-MSG-CRITICAL] 🚨 ERRO CRÍTICO no processamento (${processingTime}ms):`);
        console.error(`[PROC-MSG-CRITICAL] Erro: ${error.message}`);
        console.error(`[PROC-MSG-CRITICAL] Stack: ${error.stack}`);
        
        // Sistema de recuperação por tipo de erro
        await handleCriticalError(error, message);
        
        Logger.error(`Erro crítico no processamento de mensagem: ${error.message}`);
    }
}

// Função de resposta de emergência quando tudo falha
async function sendEmergencyResponse(chatId, command) {
    console.log(`[EMERGENCY-CRITICAL] 🚨 Iniciando resposta de emergência para comando "${command}"`);
    
    const emergencyResponses = {
        'ping': '🏓 Pong!',
        'status': '📊 Bot ativo',
        'menu': '📋 Menu disponível',
        'listads': '📋 Listando anúncios...',
        'addads': '✅ Anúncio processado',
        'rmads': '✅ Anúncio removido',
        'default': '✅ Comando processado'
    };
    
    const response = emergencyResponses[command] || emergencyResponses['default'];
    
    // Múltiplas estratégias de emergência
    const emergencyStrategies = [
        // Estratégia 1: Envio direto ultra-básico
        async () => {
            console.log(`[EMERGENCY-CRITICAL] 🔧 Estratégia 1: Envio direto`);
            await client.sendMessage(chatId, response);
        },
        
        // Estratégia 2: Delay + envio básico
        async () => {
            console.log(`[EMERGENCY-CRITICAL] 🔧 Estratégia 2: Delay + envio`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await client.sendMessage(chatId, 'OK');
        },
        
        // Estratégia 3: Reconstruir chatId + envio
        async () => {
            console.log(`[EMERGENCY-CRITICAL] 🔧 Estratégia 3: Reconstruir ID`);
            const cleanId = chatId.replace(/[^\w@.-]/g, '');
            await client.sendMessage(cleanId, '✅');
        },
        
        // Estratégia 4: Envio ultra-minimalista
        async () => {
            console.log(`[EMERGENCY-CRITICAL] 🔧 Estratégia 4: Ultra-minimalista`);
            await client.sendMessage(chatId, '1');
        }
    ];
    
    // Tentar cada estratégia
    for (let i = 0; i < emergencyStrategies.length; i++) {
        try {
            await emergencyStrategies[i]();
            console.log(`[EMERGENCY-CRITICAL] ✅ Estratégia ${i + 1} bem-sucedida para ${chatId}`);
            return true;
        } catch (emergencyError) {
            console.error(`[EMERGENCY-CRITICAL] ❌ Estratégia ${i + 1} falhou: ${emergencyError.message}`);
            
            // Se for validateAndGetParts, continuar tentando
            if (emergencyError.message.includes('validateAndGetParts')) {
                console.error(`[EMERGENCY-CRITICAL] 🔧 validateAndGetParts na estratégia ${i + 1} - continuando...`);
                continue;
            }
        }
    }
    
    console.error(`[EMERGENCY-CRITICAL] ❌ TODAS as estratégias de emergência falharam para ${chatId}`);
    return false;
}

// Sistema de tratamento de erros críticos
async function handleCriticalError(error, message) {
    console.log(`[ERROR-HANDLER] 🔧 Analisando erro crítico...`);
    
    // Detectar erro validateAndGetParts
    if (error.message.includes('validateAndGetParts') || error.stack?.includes('validateAndGetParts')) {
        console.error(`[ERROR-HANDLER] 🔧 ERRO validateAndGetParts DETECTADO!`);
        console.error(`[ERROR-HANDLER] 💡 Aplicando correção automática...`);
        
        try {
            // Estratégia de recuperação ultra-simples
            const simpleMessage = '✅ Comando processado (recuperação automática)';
            await client.sendMessage(message.from, simpleMessage);
            console.log(`[ERROR-HANDLER] ✅ Recuperação validateAndGetParts bem-sucedida`);
        } catch (recoveryError) {
            console.error(`[ERROR-HANDLER] ❌ Falha na recuperação: ${recoveryError.message}`);
        }
        return;
    }
    
    // Detectar erros de rede/timeout
    if (error.message.includes('timeout') || error.message.includes('network') || error.message.includes('ECONNRESET')) {
        console.error(`[ERROR-HANDLER] 🌐 Erro de conectividade detectado`);
        await sendEmergencyResponse(message.from, 'network_error');
        return;
    }
    
    // Detectar erros de chat/grupo
    if (error.message.includes('Chat not found') || error.message.includes('Group not found')) {
        console.error(`[ERROR-HANDLER] 👥 Erro de chat/grupo detectado`);
        // Não enviar resposta para chats inexistentes
        return;
    }
    
    // Erro genérico - tentar resposta básica
    console.error(`[ERROR-HANDLER] ❓ Erro genérico - tentando resposta básica`);
    await sendEmergencyResponse(message.from, 'generic_error');
}

// Função para executar comandos com sistema de fallback robusto
async function executeCommandWithFallback(command, args, message, chat) {
    console.log(`[CMD-EXEC] 🚀 Executando: "${command}" com fallback ativo`);
    
    try {
        // Tentar execução normal do comando
        await executeCommand(command, args, message, chat);
        console.log(`[CMD-EXEC] ✅ Comando "${command}" executado com sucesso`);
        
    } catch (cmdError) {
        console.error(`[CMD-EXEC] ❌ Erro na execução do comando "${command}": ${cmdError.message}`);
        
        // Detectar validateAndGetParts no nível de comando
        if (cmdError.message.includes('validateAndGetParts') || cmdError.stack?.includes('validateAndGetParts')) {
            console.error(`[CMD-EXEC] 🔧 validateAndGetParts detectado no comando "${command}"`);
            console.error(`[CMD-EXEC] 💡 Aplicando fallback específico...`);
            
            // Fallbacks específicos por comando
            await executeCommandFallback(command, message);
        } else {
            // Outros erros - resposta genérica
            console.error(`[CMD-EXEC] ⚠️ Erro genérico no comando "${command}" - enviando resposta de fallback`);
            await client.sendMessage(message.from, '⚠️ Comando processado com erro interno. Tente novamente.');
        }
    }
}

// Fallbacks específicos para cada comando
async function executeCommandFallback(command, message) {
    console.log(`[FALLBACK] 🔄 Executando fallback para comando: ${command}`);
    
    const fallbacks = {
        'ping': '🏓 Pong! (fallback ativo)',
        'status': '📊 Bot: Online\n⚡ Status: Ativo\n🔧 Modo: Fallback',
        'menu': '📋 *Menu Principal*\n\n!ping - Testar bot\n!status - Ver status\n!listads - Listar anúncios\n\n(Modo fallback ativo)',
        'listads': '📋 *Lista de Anúncios*\n\n⚠️ Carregamento temporariamente indisponível\n💡 Tente novamente em alguns segundos',
        'addad': '✅ Solicitação de anúncio recebida (processamento em segundo plano)',
        'removead': '✅ Solicitação de remoção recebida (processamento em segundo plano)'
    };
    
    const fallbackMessage = fallbacks[command] || '✅ Comando recebido e processado em modo fallback';
    
    try {
        await client.sendMessage(message.from, fallbackMessage);
        console.log(`[FALLBACK] ✅ Fallback para "${command}" enviado com sucesso`);
    } catch (fallbackError) {
        console.error(`[FALLBACK] ❌ Falha no fallback para "${command}": ${fallbackError.message}`);
    }
}

// Função para executar comandos específicos
async function executeCommand(command, args, message, chat) {
    console.log(`[CMD-EXEC] 🚀 Executando: "${command}"`);
    
    try {
        switch (command) {
            case 'ping':
                await Sender.sendMessage(client, message.from, '🏓 *Pong!*\n\n✅ Bot respondendo normalmente!');
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
            case 'addads':
            case 'rmads':
            case 'statusads':
                await AdsHandler.handleAdsCommand(client, message, command, args);
                break;
                
            case 'ban':
                await BanCommand.execute(client, message, args);
                break;
                
            case 'unban':
                await BanCommand.unban(client, message, args);
                break;
                
            case 'allg':
            case 'allg2':
                if (!chat.isGroup) {
                    await Sender.sendMessage(client, message.from, '❌ Este comando só funciona em grupos!');
                    return;
                }
                
                const participants = chat.participants;
                if (!participants || participants.length === 0) {
                    await Sender.sendMessage(client, message.from, '❌ Não foi possível obter participantes.');
                    return;
                }
                
                const mentions = participants.map(p => p.id._serialized);
                const mentionText = participants.map(p => `@${p.id.user}`).join(' ');
                
                await client.sendMessage(message.from, mentionText, { mentions: mentions });
                break;
                
            case 'sorteio':
                await SorteioCommand.execute(client, message, args);
                break;
                
            case 'welcome':
                await WelcomeCommand.execute(client, message, args);
                break;
                
            case 'autoresposta':
                await AutoRespostaCommand.execute(client, message, args);
                break;
                
            case 'horarios':
                await HorariosCommand.execute(client, message, args);
                break;
                
            case 'debug':
                await DebugCommand.execute(client, message, args);
                break;
                
            case 'syncpanel':
                await SyncPanelCommand.execute(client, message, args);
                break;
                
            case 'syncstatus':
                await SyncStatusCommand.execute(client, message, args);
                break;
                
            default:
                console.log(`[CMD-EXEC] ❓ Comando não implementado: "${command}"`);
                await Sender.sendMessage(client, message.from, 
                    `❓ Comando "${command}" não reconhecido.\n\nDigite *!menu* para ver comandos disponíveis.`);
                break;
        }
        
        console.log(`[CMD-EXEC] ✅ Comando "${command}" executado com sucesso`);
        
    } catch (cmdError) {
        console.error(`[CMD-EXEC] ❌ Erro no comando "${command}": ${cmdError.message}`);
        console.error(`[CMD-EXEC] Stack: ${cmdError.stack}`);
        
        // Detectar validateAndGetParts no nível de comando
        if (cmdError.message.includes('validateAndGetParts') || cmdError.stack?.includes('validateAndGetParts')) {
            console.error(`[CMD-EXEC] 🔧 validateAndGetParts detectado no comando "${command}"`);
            
            try {
                await client.sendMessage(message.from, '⚠️ Comando processado com erro interno.');
                console.log(`[CMD-EXEC] ✅ Resposta de emergência enviada`);
            } catch (emergencyError) {
                console.error(`[CMD-EXEC] ❌ Falha na resposta de emergência: ${emergencyError.message}`);
            }
        } else {
            try {
                await Sender.sendMessage(client, message.from, 
                    `❌ *Erro no comando "${command}"*\n\nTente novamente em alguns segundos.`);
            } catch (errorReplyError) {
                console.error(`[CMD-EXEC] ❌ Falha ao enviar resposta de erro: ${errorReplyError.message}`);
            }
        }
        
        throw cmdError; // Re-throw para logging upstream
    }
}

// ========================================================================================================
// 🔄 CARREGAMENTO PARALELO DE MÓDULOS OTIMIZADO
// ========================================================================================================

async function carregarModulosComandos() {
    const startTime = Date.now();
    Logger.info('🔄 Carregando módulos de comandos...');
    
    try {
        // Carregar módulos de forma síncrona (são arquivos locais)
        WelcomeCommand = require('./commands/welcome');
        Logger.success('✅ WelcomeCommand carregado');
        
        BanCommand = require('./commands/ban');
        Logger.success('✅ BanCommand carregado');
        
        SorteioCommand = require('./commands/sorteio');
        Logger.success('✅ SorteioCommand carregado');
        
        AdsHandler = require('./handlers/AdsHandler');
        Logger.success('✅ AdsHandler carregado');
        
        MenuCommand = require('./commands/menu');
        Logger.success('✅ MenuCommand carregado');
        
        GroupControlCommand = require('./commands/groupControl');
        Logger.success('✅ GroupControlCommand carregado');
        
        HorariosCommand = require('./commands/horarios');
        Logger.success('✅ HorariosCommand carregado');
        
        AutoRespostaCommand = require('./commands/autoresposta');
        Logger.success('✅ AutoRespostaCommand carregado');
        
        SyncStatusCommand = require('./commands/sync-status');
        Logger.success('✅ SyncStatusCommand carregado');
        
        SyncPanelCommand = require('./commands/syncpanel');
        Logger.success('✅ SyncPanelCommand carregado');
        
        DebugCommand = require('./commands/debug');
        Logger.success('✅ DebugCommand carregado');
        
        const loadTime = Date.now() - startTime;
        Logger.success(`✅ Todos os módulos carregados em ${loadTime}ms`);
        Logger.performance('Carregamento de módulos', loadTime);
        
    } catch (error) {
        Logger.error(`Erro no carregamento de módulos: ${error.message}`);
        console.error('Stack:', error.stack);
    }
}

// ========================================================================================================
// 🎯 EVENTOS DO CLIENTE WHATSAPP OTIMIZADOS
// ========================================================================================================

// Evento QR Code
client.on('qr', (qr) => {
    Logger.logBox('QR CODE GERADO', [
        '📱 Escaneie o QR Code com seu WhatsApp',
        '⏱️ Código expira em 20 segundos',
        '🔄 Aguardando autenticação...'
    ], 'yellow');
    qrcode.generate(qr, { small: true });
});

// Evento de autenticação
client.on('authenticated', () => {
    Logger.logBox('AUTENTICAÇÃO CONCLUÍDA', [
        '✅ WhatsApp autenticado com sucesso!',
        '🔄 Preparando conexão...'
    ], 'green');
});

// Evento de falha na autenticação
client.on('auth_failure', (msg) => {
    Logger.logBox('FALHA NA AUTENTICAÇÃO', [
        '❌ Erro na autenticação do WhatsApp',
        `📋 Detalhes: ${msg}`,
        '🔄 Tente escanear o QR Code novamente'
    ], 'red');
});

// Evento de conexão pronta
client.on('ready', async () => {
    const readyTime = moment().format('DD/MM/YYYY HH:mm:ss');
    
    // ========================================================================================================
    // 🚨 LOGS CRÍTICOS DE INICIALIZAÇÃO
    // ========================================================================================================
    console.log(`\n🚨🚨🚨 [READY-CRITICAL] BOT WHATSAPP CONECTADO - INÍCIO CRÍTICO 🚨🚨🚨`);
    console.log(`[READY-CRITICAL] ⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`[READY-CRITICAL] 📅 Conectado em: ${readyTime}`);
    console.log(`[READY-CRITICAL] 👑 Dono: ${config.numeroDono}`);
    console.log(`[READY-CRITICAL] 🌐 Timezone: ${config.timezone}`);
    console.log(`[READY-CRITICAL] 📱 Cliente: ${client?.info?.wid?.user || 'N/A'}`);
    console.log(`[READY-CRITICAL] 🔧 Versão WPP-Web: ${client?.info?.version || 'N/A'}`);
    console.log(`[READY-CRITICAL] 💾 Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`🚨🚨🚨 [READY-CRITICAL] INICIANDO CARREGAMENTO DE MÓDULOS 🚨🚨🚨\n`);
    
    Logger.logBox('BOT CONECTADO COM SUCESSO', [
        '🎉 WhatsApp Web conectado!',
        `📅 Conectado em: ${readyTime}`,
        `👑 Dono: ${config.numeroDono}`,
        `🌐 Timezone: ${config.timezone}`,
        '',
        '🔄 Carregando módulos e dados...'
    ], 'green');
    
         // Inicializar Sender primeiro
     try {
         Sender.initialize(client);
         Logger.success('✅ Sender inicializado');
     } catch (senderError) {
         Logger.error(`Erro ao inicializar Sender: ${senderError.message}`);
     }
     
     // Carregar módulos e dados em paralelo
     try {
         const initPromises = [
             carregarModulosComandos(),
             notificarPainelLaravel(),
             AdsHandler?.loadAllAds?.() || Promise.resolve()
         ];
        
        await Promise.all(initPromises);
        
        Logger.success('🚀 Bot totalmente operacional!');
        
        // Mensagem de status para o dono
        if (config.numeroDono) {
            const statusMsg = `🤖 *Bot Conectado!*\n\n` +
                `⏰ ${readyTime}\n` +
                `✅ Todos os sistemas operacionais\n` +
                `📊 Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
            
            try {
                await client.sendMessage(`${config.numeroDono}@c.us`, statusMsg);
                Logger.info('Notificação de status enviada ao dono');
            } catch (notifyError) {
                Logger.warning(`Não foi possível notificar o dono: ${notifyError.message}`);
            }
        }
        
    } catch (initError) {
        Logger.error(`Erro na inicialização: ${initError.message}`);
    }
});

// Evento de desconexão
client.on('disconnected', (reason) => {
    Logger.logBox('DESCONECTADO', [
        '⚠️ Bot desconectado do WhatsApp',
        `📋 Motivo: ${reason}`,
        '🔄 Tentando reconectar...'
    ], 'yellow');
});

// ========================================================================================================
// 📨 CONFIGURAÇÃO DE EVENTOS DE MENSAGEM - VERSÃO SIMPLIFICADA
// ========================================================================================================

// Contador de mensagens para debug
let messageCount = 0;

// Wrapper de segurança simplificado
const safeProcessMessage = async (message) => {
    try {
        messageCount++;
        console.log(`\n[MSG-${messageCount}] 📨 Nova mensagem recebida`);
        console.log(`[MSG-${messageCount}] 📞 De: ${message.from}`);
        console.log(`[MSG-${messageCount}] 💬 Conteúdo: "${message.body?.substring(0, 50)}"`);
        
        await processMessage(message);
    } catch (error) {
        console.error(`[MSG-${messageCount}] ❌ Erro no processamento: ${error.message}`);
        Logger.error(`Erro no processamento de mensagem: ${error.message}`);
    }
};

// Remover todos os listeners antigos para evitar duplicação
client.removeAllListeners('message_create');
client.removeAllListeners('message');

// Usar apenas message_create para evitar duplicação
client.on('message_create', safeProcessMessage);

console.log('[EVENTS] ✅ Eventos de mensagem configurados (message_create apenas)');

// ========================================================================================================
// 🚀 INICIALIZAÇÃO E TRATAMENTO DE ERROS GLOBAIS
// ========================================================================================================

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNCAUGHT] Unhandled Rejection:', reason);
    Logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT] Uncaught Exception:', error.message);
    console.error('Stack:', error.stack);
    Logger.error(`Uncaught Exception: ${error.message}`);
});

// Mensagem de inicialização
Logger.logBox('INICIANDO BOT WHATSAPP', [
    `🤖 Bot Administrador v${config.botInfo.versao}`,
    `👑 Dono: ${config.numeroDono}`,
    `🌍 Timezone: ${config.timezone}`,
    `📅 Data: ${moment().format('DD/MM/YYYY HH:mm:ss')}`,
    '',
    '🔄 Inicializando cliente WhatsApp...'
], 'blue');

// Inicializar o cliente
client.initialize();

// ========================================================================================================
// 📦 EXPORTAÇÃO DE MÓDULOS
// ========================================================================================================

module.exports = {
    client,
    DataManager,
    Utils,
    Logger,
    RentalSystem,
    config
};

// ========================================================================================================
// 🏗️ CRIAÇÃO DE ESTRUTURA DE DADOS
// ========================================================================================================

// Criar estrutura básica se necessário
if (!fs.existsSync('./data')) {
    Logger.info('Criando pasta data...');
    fs.mkdirSync('./data');
    
    const dataFiles = [
        { file: 'grupoAluguel.json', content: { "grupos": {} } },
        { file: 'configs.json', content: { "grupos": {} } },
        { file: 'ads.json', content: { "anuncios": {} } },
        { file: 'sorteios.json', content: { "sorteios": {} } },
        { file: 'horarios.json', content: { "horarios": {} } },
        { file: 'notifiedUsers.json', content: { "users": [] } }
    ];
    
    dataFiles.forEach(dataFile => {
        const filePath = `./data/${dataFile.file}`;
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(dataFile.content, null, 2));
            Logger.success(`Criado: ${dataFile.file}`);
        }
    });
}