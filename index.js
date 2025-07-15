const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const moment = require('moment-timezone');
const path = require('path');

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
    static isAdmin(message) {
        return message.author ? message.participant?.isAdmin || message.participant?.isSuperAdmin : false;
    }

    static isOwner(message) {
        if (!message.author) return false;
        const authorNumber = message.author.replace('@c.us', '');
        return authorNumber === config.numeroDono;
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
}

// Eventos do cliente
client.on('qr', (qr) => {
    console.log('QR Code recebido (backup):', qr);
});

client.on('ready', async () => {
    console.log('🤖 Bot conectado e pronto!');
    console.log(`📱 Número: ${client.info.wid.user}`);
    console.log(`📋 Nome: ${client.info.pushname}`);
    
    // Importar módulos após cliente estar pronto
    welcomeHandler = require('./commands/welcome');
    banHandler = require('./commands/ban');
    sorteioHandler = require('./commands/sorteio');
    adsHandler = require('./commands/ads');
    menuHandler = require('./commands/menu');
    groupControlHandler = require('./commands/groupControl');
    horariosHandler = require('./commands/horarios');
    
    // Carregar sistemas automáticos
    await adsHandler.loadAllAds(client);
    await groupControlHandler.loadSchedules(client);
    await horariosHandler.loadAutoHours(client);
    
    // Enviar notificação para o dono
    try {
        const donoId = config.numeroDono + '@c.us';
        await client.sendMessage(donoId, '🤖 *Bot Admin conectado com sucesso!*\n\n✅ Pronto para gerenciar grupos\n📅 Data: ' + moment().format('DD/MM/YYYY HH:mm'));
    } catch (error) {
        console.log('Erro ao notificar dono:', error);
    }
});

client.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.log('🔌 Bot desconectado:', reason);
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

    try {
        // Processar comandos
        switch (command) {
            case 'menu':
                await menuHandler.handle(client, message, args);
                break;

            case 'all':
                if (!Utils.isAdmin(message)) {
                    await message.reply('🚫 Apenas administradores podem usar este comando.');
                    return;
                }
                const chat = await message.getChat();
                const participants = chat.participants;
                const mentions = participants.map(p => p.id._serialized);
                const mentionText = participants.map(p => `@${p.id.user}`).join(' ');
                
                await client.sendMessage(groupId, `📣 *Atenção geral!*\n\n${mentionText}`, {
                    mentions: mentions
                });
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
            case 'horapg':
            case 'addhorapg':
                await horariosHandler.handle(client, message, command, args);
                break;

            case 'banextremo':
            case 'banlinkgp':
            case 'antilinkgp':
            case 'antilink':
            case 'ban':
                await banHandler.handle(client, message, command, args);
                break;

            case 'liberargrupo':
                if (!Utils.isOwner(message) && !Utils.isAdmin(message)) {
                    await message.reply('🚫 Apenas o dono pode liberar grupos.');
                    return;
                }
                const days = parseInt(args) || 30;
                await RentalSystem.liberarGrupo(groupId, days);
                await message.reply(`✅ *Grupo liberado por ${days} dias!*\n\n📅 Válido até: ${moment().add(days, 'days').format('DD/MM/YYYY HH:mm')}`);
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
                const debugInfo = `🔍 *DEBUG DO BOT*\n\n` +
                    `👤 *Seu número:* ${message.author ? message.author.replace('@c.us', '') : 'Não detectado'}\n` +
                    `👑 *Dono configurado:* ${config.numeroDono}\n` +
                    `✅ *É o dono?* ${Utils.isOwner(message) ? 'SIM' : 'NÃO'}\n` +
                    `🛡️ *É admin?* ${Utils.isAdmin(message) ? 'SIM' : 'NÃO'}\n` +
                    `🆔 *ID do grupo:* ${groupId}\n\n` +
                    `💡 Se "É o dono?" está "NÃO", verifique o config.json`;
                
                await message.reply(debugInfo);
                break;

            default:
                // Comando não encontrado
                break;
        }
    } catch (error) {
        console.error('Erro ao processar comando:', error);
        await message.reply('❌ Erro interno do bot. Tente novamente.');
    }
});

// Processar novos membros
client.on('group_join', async (notification) => {
    const groupId = notification.chatId;
    const config = await DataManager.loadConfig(groupId);
    
    if (config.boasVindas === 1 && config.legendaBoasVindas) {
        const chat = await client.getChatById(groupId);
        const newMember = await client.getContactById(notification.id.participant);
        
        let message = config.legendaBoasVindas
            .replace('@user', `@${newMember.id.user}`)
            .replace('@group', chat.name);
            
        await client.sendMessage(groupId, message, {
            mentions: [newMember.id._serialized]
        });
    }
});

// Inicialização SIMPLES
async function initialize() {
    console.log('🚀 Iniciando Bot Admin WhatsApp...');
    console.log(`📱 Número configurado: ${config.numeroBot}`);
    
    try {
        // Listener único para QR/Pareamento
        client.on('qr', async (qr) => {
            console.log('📱 Gerando código de pareamento...');
            
            try {
                const pairingCode = await client.requestPairingCode(config.numeroBot);
                
                console.log('');
                console.log('🎉 ════════════════════════════');
                console.log('🎉   CÓDIGO DE PAREAMENTO:');
                console.log('🎉');
                console.log(`🔑      ${pairingCode}`);
                console.log('🎉');
                console.log('🎉 ════════════════════════════');
                console.log('');
                console.log('📱 CONECTAR NO WHATSAPP:');
                console.log('1. Configurações > Aparelhos conectados');
                console.log('2. "Conectar um aparelho"');
                console.log('3. "Usar código do telefone"');
                console.log(`4. Digite: ${pairingCode}`);
                console.log('');
                
            } catch (error) {
                console.log('❌ Erro ao gerar código. Sessão pode estar corrompida.');
                console.log('🔄 Limpando cache...');
                
                try {
                    if (fs.existsSync('./.wwebjs_auth')) fs.removeSync('./.wwebjs_auth');
                    if (fs.existsSync('./.wwebjs_cache')) fs.removeSync('./.wwebjs_cache');
                    console.log('✅ Cache limpo. Execute novamente: npm start');
                    process.exit(1);
                } catch (cleanError) {
                    console.error('❌ Erro ao limpar:', cleanError);
                    process.exit(1);
                }
            }
        });
        
        // Inicializar cliente
        await client.initialize();
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
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
    console.log('📁 Criando pasta data...');
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
            console.log(`✅ Criado: ${dataFile.file}`);
        }
    });
}

// Inicializar bot direto
initialize();