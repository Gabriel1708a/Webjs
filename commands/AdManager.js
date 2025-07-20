const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

// Ajuste os caminhos para apontar para os arquivos corretos a partir da pasta 'commands'
// O '../' sobe um nível de diretório.
const { Utils } = require('../utils/Utils'); // Supondo que Utils.js esteja em utils/
const Sender = require('../Sender'); // Supondo que Sender.js esteja na raiz

// --- CONFIGURAÇÃO CENTRALIZADA ---
// É uma boa prática usar variáveis de ambiente (.env) para isso
const config = {
    laravelApi: {
        baseUrl: process.env.LARAVEL_API_BASE_URL || 'https://painel.botwpp.tech/api',
        token: process.env.LARAVEL_API_TOKEN || 'teste'
    },
    syncIntervalSeconds: 15 // Intervalo para sincronizar com o painel (em segundos)
};

class AdManager {
    // Armazena todos os timers ativos, chaveados por um ID único (ex: 'panel_123')
    static activeTimers = new Map();
    static client = null; // Armazena a instância do cliente do WhatsApp

    /**
     * Ponto de entrada principal. Inicia o sistema de anúncios.
     * Começa a sincronização com o painel.
     */
    static async initialize(client) {
        console.log('📢 [AdManager] Iniciando serviço unificado de anúncios...');
        this.client = client; // Armazena a instância do cliente para uso posterior

        // Verificar configuração da API
        console.log('🔧 [AdManager] Configuração da API:', {
            baseUrl: config.laravelApi.baseUrl,
            token: config.laravelApi.token ? '***TOKEN_CONFIGURADO***' : '❌ TOKEN_NÃO_CONFIGURADO',
            syncInterval: config.syncIntervalSeconds + 's'
        });

        if (!config.laravelApi.baseUrl || config.laravelApi.baseUrl === 'https://painel.botwpp.tech/api') {
            console.warn('⚠️ [AdManager] ATENÇÃO: URL da API não configurada ou usando valor padrão.');
        }

        if (!config.laravelApi.token || config.laravelApi.token === 'teste') {
            console.warn('⚠️ [AdManager] ATENÇÃO: Token da API não configurado ou usando valor padrão.');
        }

        // Inicia a sincronização periódica com o painel Laravel
        setInterval(() => this.syncWithPanel(), config.syncIntervalSeconds * 1000);
        
        // Realiza a primeira sincronização imediatamente
        await this.syncWithPanel();
    }

    //================================================================================
    // SEÇÃO: MANIPULAÇÃO DE COMANDOS DO WHATSAPP
    //================================================================================

    /**
     * Manipula os comandos (!addads, !listads, !rmads) vindos do WhatsApp.
     */
    static async handleCommand(message, command, args) {
        // A verificação de admin agora usa o Utils.js importado
        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            return message.reply('🚫 Apenas administradores podem gerenciar anúncios.');
        }

        switch (command) {
            case 'addads':
                await this.createAdFromCommand(message, args);
                break;
            case 'listads':
                await this.listAllAds(message);
                break;
            case 'rmads':
                await this.removeAdFromCommand(message, args);
                break;
        }
    }

    /**
     * Cria um novo anúncio a partir do comando !addads e o sincroniza com o painel.
     */
    static async createAdFromCommand(message, args) {
        if (!args.includes('|')) {
            return message.reply('❌ *Formato incorreto!*\n\n📝 Use: `!addads mensagem|intervalo`\n\n🔸 Exemplo: `!addads Visite nosso site!|60`\n🔸 O intervalo é em minutos.');
        }

        const [content, intervalStr] = args.split('|').map(s => s.trim());
        const interval = parseInt(intervalStr);

        if (!content || !interval || isNaN(interval) || interval < 1) {
            return message.reply('❌ *Dados inválidos!*\n\n✅ A mensagem e o intervalo (em minutos, maior que 0) são obrigatórios.');
        }

        try {
            // NOTA: O envio de mídia via comando para a API é complexo.
            // O bot precisaria fazer upload do arquivo para o Laravel.
            // Por enquanto, este comando criará apenas anúncios de texto no painel.
            // Anúncios com mídia devem ser criados diretamente no painel.

            const adPayload = {
                group_id: message.from,
                content: content,
                interval: interval,
                unit: 'minutes', // O comando local sempre usa minutos
            };

            console.log(`[AdManager] Enviando novo anúncio para o painel Laravel...`);
            const response = await axios.post(`${config.laravelApi.baseUrl}/messages`, adPayload, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}`, 'Accept': 'application/json' }
            });

            console.log('📋 [AdManager] Resposta da criação do anúncio:', JSON.stringify(response.data, null, 2));

            // Verificação robusta da resposta de criação
            let newAdFromPanel = null;
            if (response.data) {
                if (response.data.data) {
                    newAdFromPanel = response.data.data;
                } else if (response.data.id) {
                    newAdFromPanel = response.data;
                } else {
                    console.warn('⚠️ [AdManager] Estrutura de resposta de criação não reconhecida:', response.data);
                    newAdFromPanel = { id: 'unknown' };
                }
            }
            
            // Força uma sincronização para o anúncio começar a rodar imediatamente.
            await this.syncWithPanel();

            await message.reply(`✅ *Anúncio criado e enviado ao painel!*\n\n📢 ID do Painel: *${newAdFromPanel.id}*\n⏰ Ele começará a ser enviado em breve, conforme o agendamento.`);

        } catch (error) {
            console.error('❌ Erro ao criar anúncio via comando:', error.response?.data || error.message);
            await message.reply('❌ Erro ao sincronizar anúncio com o painel. Verifique os logs e a API.');
        }
    }

    /**
     * Lista TODOS os anúncios ativos para o grupo atual.
     */
    static async listAllAds(message) {
        const groupId = message.from;
        let listText = '📢 *ANÚNCIOS ATIVOS (Sincronizados):*\n\n';
        let foundAds = false;

        if (this.activeTimers.size === 0) {
            return message.reply('📭 *Nenhum anúncio ativo no momento.*');
        }

        this.activeTimers.forEach((timerData, uniqueId) => {
            // Mostra apenas anúncios do grupo que pediu a lista
            if (timerData.group_id === groupId) {
                foundAds = true;
                const source = timerData.source === 'panel' ? '🌐 Painel' : '📱 Local';
                const id = timerData.id;
                const tipoIcon = timerData.full_media_url ? '🖼️ Mídia' : '📝 Texto';
                
                listText += `🆔 *ID:* ${id} (${source})\n`;
                listText += `⏰ *Intervalo:* ${timerData.interval} ${timerData.unit}\n`;
                listText += `${tipoIcon}\n`;
                listText += `💬 *Mensagem:* ${timerData.content.substring(0, 50)}...\n`;
                listText += `━━━━━━━━━━━━━━━━━━\n\n`;
            }
        });

        if (!foundAds) {
            listText = `📭 *Nenhum anúncio ativo para este grupo.*`;
        }

        await message.reply(listText);
    }

    /**
     * Remove um anúncio (seja local ou do painel) a partir do comando !rmads.
     */
    static async removeAdFromCommand(message, args) {
        const adIdToRemove = args.trim();
        if (!adIdToRemove) {
            return message.reply('❌ *Digite o ID do anúncio!*\n\n📝 Use: `!rmads ID`\n💡 Veja os IDs com `!listads`');
        }

        try {
            console.log(`[AdManager] Enviando solicitação de remoção para o painel (ID: ${adIdToRemove})...`);
            await axios.delete(`${config.laravelApi.baseUrl}/messages/${adIdToRemove}`, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}` }
            });

            // Para o timer local imediatamente para não esperar a próxima sincronização
            const timerKey = `panel_${adIdToRemove}`;
            if (this.activeTimers.has(timerKey)) {
                clearInterval(this.activeTimers.get(timerKey).timerId);
                this.activeTimers.delete(timerKey);
            }

            await message.reply(`✅ *Solicitação de remoção para o anúncio ID ${adIdToRemove} enviada com sucesso!*`);

        } catch (error) {
            console.error(`❌ Erro ao remover anúncio ID ${adIdToRemove}:`, error.response?.data || error.message);
            await message.reply(`❌ Falha ao remover o anúncio. Verifique se o ID está correto.`);
        }
    }


    //================================================================================
    // SEÇÃO: SINCRONIZAÇÃO COM O PAINEL LARAVEL
    //================================================================================

    static async syncWithPanel() {
        try {
            console.log('📡 [AdManager] Sincronizando com o painel Laravel...');
            const response = await axios.get(`${config.laravelApi.baseUrl}/messages/pending`, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}`, 'Accept': 'application/json' }
            });

            console.log('📋 [AdManager] Resposta da API recebida:', JSON.stringify(response.data, null, 2));

            // Verificação robusta da estrutura da resposta
            let panelMessages = [];
            
            if (response.data) {
                if (Array.isArray(response.data)) {
                    // Se response.data já é um array
                    panelMessages = response.data;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    // Se os dados estão em response.data.data
                    panelMessages = response.data.data;
                } else if (response.data.messages && Array.isArray(response.data.messages)) {
                    // Se os dados estão em response.data.messages
                    panelMessages = response.data.messages;
                } else {
                    console.warn('⚠️ [AdManager] Estrutura de resposta não reconhecida. Dados recebidos:', response.data);
                    panelMessages = [];
                }
            }

            console.log(`📊 [AdManager] ${panelMessages.length} anúncios encontrados no painel.`);

            if (!Array.isArray(panelMessages)) {
                console.error('❌ [AdManager] ERRO: panelMessages não é um array:', typeof panelMessages);
                panelMessages = [];
            }

            const panelMessageIds = new Set(panelMessages.map(m => `panel_${m.id}`));

            // 1. Remove timers de anúncios que não existem mais no painel
            this.activeTimers.forEach((timerData, uniqueId) => {
                if (timerData.source === 'panel' && !panelMessageIds.has(uniqueId)) {
                    console.log(`[AdManager] Anúncio do painel (ID: ${timerData.id}) removido. Parando timer.`);
                    clearInterval(timerData.timerId);
                    this.activeTimers.delete(uniqueId);
                }
            });

            // 2. Adiciona ou atualiza anúncios vindos do painel
            for (const ad of panelMessages) {
                this.scheduleAd(ad, 'panel');
            }
            
            console.log(`✅ [AdManager] Sincronização concluída. Total de timers ativos: ${this.activeTimers.size}`);

        } catch (error) {
            console.error('❌ [AdManager] Erro ao sincronizar com o painel:', error.response?.data || error.message);
        }
    }

    static scheduleAd(adData, source) {
        const uniqueId = `${source}_${adData.id}`;
        const existingTimerData = this.activeTimers.get(uniqueId);

        if (existingTimerData) {
            const hasChanged =
                existingTimerData.content !== adData.content ||
                existingTimerData.interval !== adData.interval ||
                existingTimerData.unit !== adData.unit ||
                existingTimerData.full_media_url !== adData.full_media_url;

            if (!hasChanged) return;

            console.log(`[AdManager] Anúncio ${uniqueId} foi atualizado. Reagendando...`);
            clearInterval(existingTimerData.timerId);
        }

        const intervalMs = this.convertIntervalToMs(adData.interval, adData.unit);
        if (intervalMs <= 0) {
            console.warn(`[AdManager] Anúncio ${uniqueId} com intervalo inválido. Não será agendado.`);
            return;
        }

        const timerId = setInterval(() => this.sendAd(adData), intervalMs);
        this.activeTimers.set(uniqueId, { ...adData, timerId, source });
        console.log(`[AdManager] Anúncio ${uniqueId} agendado para o grupo ${adData.group_id} a cada ${intervalMs}ms.`);
    }

    static async sendAd(adData) {
        if (!adData.group_id) {
            console.error(`❌ [AdManager] ERRO CRÍTICO: Tentativa de enviar anúncio ID ${adData.id} sem um group_id.`);
            return;
        }

        try {
            console.log(`🚀 [AdManager] Enviando anúncio ID ${adData.id} para o grupo ${adData.group_id}...`);
            
            // O Sender.js deve ser capaz de lidar com uma URL de mídia ou apenas com o conteúdo.
            const success = await Sender.sendMessage(
                this.client, // O Sender agora precisa do client para enviar a mensagem
                adData.group_id,
                adData.content,
                adData.full_media_url // URL da mídia vinda do painel
            );

            if (success) {
                try {
                    await axios.post(`${config.laravelApi.baseUrl}/messages/${adData.id}/sent`, {}, {
                        headers: { 'Authorization': `Bearer ${config.laravelApi.token}` }
                    });
                    console.log(`✅ [AdManager] Anúncio ID ${adData.id} marcado como enviado no painel.`);
                } catch (markError) {
                    console.error(`⚠️ [AdManager] Falha ao marcar anúncio ID ${adData.id} como enviado:`, markError.response?.data || markError.message);
                }
            }
        } catch (error) {
            console.error(`❌ [AdManager] Erro ao enviar anúncio ID ${adData.id}:`, error);
        }
    }

    //================================================================================
    // SEÇÃO: FUNÇÕES UTILITÁRIAS
    //================================================================================

    static convertIntervalToMs(interval, unit) {
        const value = parseInt(interval, 10);
        if (isNaN(value)) return 0;

        switch (String(unit).toLowerCase()) {
            case 'minuto': case 'minutos': case 'minute': case 'minutes': case 'm':
                return value * 60 * 1000;
            case 'hora': case 'horas': case 'hour': case 'hours': case 'h':
                return value * 60 * 60 * 1000;
            case 'dia': case 'dias': case 'day': case 'days': case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                console.warn(`[AVISO] Unidade de tempo não reconhecida: "${unit}".`);
                return 0;
        }
    }
}

module.exports = AdManager;