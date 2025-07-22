const axios = require('axios');
const Sender = require('../Sender');
const config = require('../config.json'); // Usar config centralizado

class AutoMessageHandler {
    static activeMessages = new Map(); // Armazena as mensagens e seus timers
    static localAdsTimers = new Map(); // Armazena timers dos anúncios locais
    static DataManager = null; // Será injetado na inicialização

    /**
     * Inicia o serviço híbrido, buscando mensagens do painel e fallback local.
     * @param {object} dataManager - Instância do DataManager para acessar dados locais
     */
    static async initialize(dataManager = null) {
        console.log('🔄 Iniciando serviço de mensagens automáticas híbrido...');
        
        // Armazenar DataManager para uso posterior
        this.DataManager = dataManager;

        // --- BINDING ---
        this.fetchMessagesFromPanel = this.fetchMessagesFromPanel.bind(this);
        this.syncMessages = this.syncMessages.bind(this);
        this.scheduleMessage = this.scheduleMessage.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.loadLocalAds = this.loadLocalAds.bind(this);
        this.scheduleLocalAd = this.scheduleLocalAd.bind(this);
        this.sendLocalAd = this.sendLocalAd.bind(this);

        // Iniciar busca híbrida
        setInterval(this.fetchMessagesFromPanel, 10 * 1000); 
        
        this.fetchMessagesFromPanel();
    }



    /**
     * Busca mensagens do painel Laravel com fallback para anúncios locais.
     */
    static async fetchMessagesFromPanel() {
        let panelMessages = [];
        let panelError = false;

        try {
            console.log('📡 Buscando mensagens do painel Laravel...');
            const response = await axios.get(`${config.laravelApi.baseUrl}/messages/pending`, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            // [CORREÇÃO] Verificar o formato da resposta do Laravel
            let messages = response.data;
            
            // Se a resposta tem um wrapper 'data', extrair o array
            if (messages && typeof messages === 'object' && !Array.isArray(messages)) {
                if (messages.data && Array.isArray(messages.data)) {
                    messages = messages.data;
                } else if (messages.messages && Array.isArray(messages.messages)) {
                    messages = messages.messages;
                } else {
                    console.warn('⚠️ Formato de resposta inesperado do painel:', messages);
                    console.warn('⚠️ Esperado: array ou objeto com propriedade data/messages');
                    panelError = true;
                }
            }

            // Verificar se é um array válido
            if (!Array.isArray(messages)) {
                console.error('❌ Resposta do painel não é um array válido:', typeof messages, messages);
                panelError = true;
            } else {
                panelMessages = messages;
                console.log(`✅ ${messages.length} mensagens do painel encontradas.`);
            }

        } catch (error) {
            console.error('❌ Erro ao buscar mensagens do painel:', error.response?.data || error.message);
            panelError = true;
        }

        // [SISTEMA HÍBRIDO] Se painel falhou ou está vazio, usar anúncios locais
        if (panelError || panelMessages.length === 0) {
            console.log('🔄 Painel indisponível ou vazio. Carregando anúncios locais como fallback...');
            await this.loadLocalAds();
        } else {
            // Painel funcionando - sincronizar mensagens do painel
            this.syncMessages(panelMessages);
            // Parar anúncios locais se estiverem rodando
            this.stopLocalAds();
        }
    }

    /**
     * Sincroniza as mensagens locais com as recebidas do painel, lidando com edições.
     * @param {Array} panelMessages - Array de mensagens da API.
     */
    static syncMessages(panelMessages) {
        // [CORREÇÃO] Verificação adicional de segurança
        if (!Array.isArray(panelMessages)) {
            console.error('❌ syncMessages: panelMessages não é um array válido:', typeof panelMessages, panelMessages);
            return;
        }

        console.log('[DEBUG] Iniciando a sincronização. Mensagens ativas no momento:', this.activeMessages.size);
        const panelMessageIds = new Set(panelMessages.map(m => m.id));

        // Etapa 1: Remove timers de mensagens que foram deletadas no painel
        for (const localId of this.activeMessages.keys()) {
            if (!panelMessageIds.has(localId)) {
                console.log(`[DEBUG] Mensagem ID ${localId} foi removida do painel. Parando timer.`);
                clearInterval(this.activeMessages.get(localId).timerId);
                this.activeMessages.delete(localId);
            }
        }

        // Etapa 2: Adiciona ou ATUALIZA timers
        for (const panelMessage of panelMessages) {
            const existingMessage = this.activeMessages.get(panelMessage.id);

            // CASO 1: A mensagem é completamente nova.
            if (!existingMessage) {
                console.log(`[DEBUG] Nova mensagem do painel detectada ID: ${panelMessage.id}. Agendando...`);
                this.scheduleMessage(panelMessage);
                continue; // Pula para a próxima
            }

            // CASO 2: A mensagem já existe. Vamos verificar se mudou.
            const hasChanged =
                existingMessage.content !== panelMessage.content ||
                existingMessage.interval !== panelMessage.interval ||
                existingMessage.unit !== panelMessage.unit ||
                existingMessage.media_url !== panelMessage.media_url;

            if (hasChanged) {
                console.log(`[DEBUG] Mensagem ID ${panelMessage.id} foi atualizada no painel. Reagendando...`);
                // Para reagendar, simplesmente chamamos scheduleMessage de novo.
                // A função já lida com limpar o timer antigo.
                this.scheduleMessage(panelMessage);
            }
            // Se não mudou, não fazemos nada e deixamos o timer antigo correr.
        }
        console.log('[DEBUG] Sincronização concluída. Total de timers ativos:', this.activeMessages.size);
    }

    /**
     * Agenda o envio de uma mensagem específica.
     * @param {object} messageData - Os dados da mensagem vindos da API.
     */
    static scheduleMessage(messageData) {
        // --- LOGS DE DEBUG ---
        const isNew = !this.activeMessages.has(messageData.id);
        console.log(`[DEBUG] scheduleMessage para ID: ${messageData.id}. É nova? ${isNew}`);

        if (!isNew) {
            clearInterval(this.activeMessages.get(messageData.id).timerId);
        }

        const intervalMs = this.convertIntervalToMilliseconds(messageData.interval, messageData.unit);
        console.log(`[DEBUG] Intervalo recebido: ${messageData.interval} ${messageData.unit}. Convertido para: ${intervalMs} ms.`);

        if (intervalMs === 0) {
            console.log(`[DEBUG] Intervalo é 0. Abortando agendamento para ID: ${messageData.id}.`);
            return;
        }

        if (isNew) {
            console.log(`[DEBUG] É nova. Enviando imediatamente...`);
            this.sendMessage(messageData); 
        }

        const timerId = setInterval(() => {
            this.sendMessage(messageData);
        }, intervalMs);

        this.activeMessages.set(messageData.id, { ...messageData, timerId });
        console.log(`[DEBUG] Agendamento concluído para ID: ${messageData.id}.`);
    }

    /**
     * Converte o intervalo (ex: 5, 'minutes' ou 'm') para milissegundos.
     */
    static convertIntervalToMilliseconds(interval, unit) {
        const value = parseInt(interval, 10);
        if (isNaN(value)) return 0; // Proteção extra

        switch (unit.toLowerCase()) {
            case 'minuto':
            case 'minutos':
            case 'minute':
            case 'minutes':
            case 'm': // <-- Adicionamos a abreviação
                return value * 60 * 1000;

            case 'hora':
            case 'horas':
            case 'hour':
            case 'hours':
            case 'h': // <-- Adicionamos a abreviação
                return value * 60 * 60 * 1000;

            case 'dia':
            case 'dias':
            case 'day':
            case 'days':
            case 'd': // <-- Adicionamos a abreviação
                return value * 24 * 60 * 60 * 1000;

            default:
                // Se não reconhecer a unidade, loga um aviso
                console.warn(`[AVISO] Unidade de tempo não reconhecida: "${unit}". Abortando agendamento.`);
                return 0;
        }
    }

    /**
     * Envia a mensagem usando o módulo Sender centralizado.
     * @param {object} messageData - Os dados da mensagem, que agora devem incluir 'group_id'.
     */
    static async sendMessage(messageData) {
        // --- A MUDANÇA ESTÁ AQUI ---
        // Removemos o ID fixo e usamos o que vem da API.
        const targetGroupId = messageData.group_id; 

        // Verificação de segurança: se por algum motivo o group_id não vier, abortamos.
        if (!targetGroupId) {
            console.error(`❌ ERRO CRÍTICO: Tentativa de enviar mensagem ID ${messageData.id} sem um group_id. Verifique sua API.`);
            return; // Não continua se não souber para onde enviar.
        }

        console.log(`🚀 Preparando para enviar mensagem ID ${messageData.id} para o grupo ${targetGroupId}...`);

        const success = await Sender.sendMessage(
            targetGroupId, // <-- Usamos a variável dinâmica
            messageData.content,
            messageData.full_media_url
        );

        if (success) {
            this.markAsSentInPanel(messageData.id);
        }
    }

    /**
     * Informa ao painel Laravel que a mensagem foi enviada.
     * @param {number} messageId - O ID da mensagem.
     */
    static async markAsSentInPanel(messageId) {
        try {
            await axios.post(`${config.laravelApi.baseUrl}/messages/${messageId}/sent`, {}, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`
                }
            });
            console.log(`📈 Status de envio atualizado no painel para a mensagem ID: ${messageId}`);
        } catch (error) {
            console.error(`❌ Falha ao atualizar status no painel para a mensagem ID ${messageId}:`, error.response?.data || error.message);
        }
    }

    // ========================================
    // MÉTODOS PARA ANÚNCIOS LOCAIS (FALLBACK)
    // ========================================

    /**
     * Carrega e agenda anúncios locais do ads.json
     */
    static async loadLocalAds() {
        if (!this.DataManager) {
            console.warn('⚠️ DataManager não disponível. Não é possível carregar anúncios locais.');
            return;
        }

        try {
            console.log('📂 Carregando anúncios locais do ads.json...');
            const adsData = await this.DataManager.loadData('ads.json');
            
            if (!adsData.anuncios) {
                console.log('📭 Nenhum anúncio local encontrado.');
                return;
            }

            let totalActiveAds = 0;

            // Processar anúncios de todos os grupos
            for (const [groupId, groupAds] of Object.entries(adsData.anuncios)) {
                const activeAds = Object.values(groupAds).filter(ad => ad.ativo);
                
                if (activeAds.length > 0) {
                    console.log(`📢 Grupo ${groupId}: ${activeAds.length} anúncio(s) ativo(s) encontrado(s)`);
                    
                    // Agendar cada anúncio ativo
                    for (const ad of activeAds) {
                        this.scheduleLocalAd(groupId, ad);
                        totalActiveAds++;
                    }
                }
            }

            console.log(`✅ Total de ${totalActiveAds} anúncios locais agendados como fallback.`);

        } catch (error) {
            console.error('❌ Erro ao carregar anúncios locais:', error.message);
        }
    }

    /**
     * Agenda um anúncio local específico
     * @param {string} groupId - ID do grupo
     * @param {object} adData - Dados do anúncio
     */
    static scheduleLocalAd(groupId, adData) {
        const adKey = `${groupId}_${adData.id}`;
        
        // Se já existe timer para este anúncio, limpar primeiro
        if (this.localAdsTimers.has(adKey)) {
            clearInterval(this.localAdsTimers.get(adKey));
        }

        const intervalMs = adData.intervalo * 60 * 1000; // Converter minutos para ms
        
        console.log(`⏰ Agendando anúncio local ID ${adData.id} para grupo ${groupId} (${adData.intervalo} min)`);

        // Enviar primeira vez imediatamente
        this.sendLocalAd(groupId, adData);

        // Agendar envios recorrentes
        const timerId = setInterval(() => {
            this.sendLocalAd(groupId, adData);
        }, intervalMs);

        this.localAdsTimers.set(adKey, timerId);
    }

    /**
     * Envia um anúncio local
     * @param {string} groupId - ID do grupo
     * @param {object} adData - Dados do anúncio
     */
    static async sendLocalAd(groupId, adData) {
        try {
            console.log(`📢 Enviando anúncio local ID ${adData.id} para grupo ${groupId}`);
            
            let mediaUrl = null;
            if (adData.media && adData.media.data) {
                // Converter dados de mídia para URL temporária se necessário
                // Por enquanto, vamos apenas logar que tem mídia
                console.log(`📷 Anúncio contém mídia (${adData.media.mimetype})`);
                // TODO: Implementar conversão de dados base64 para URL se necessário
            }

            const success = await Sender.sendMessage(
                groupId,
                adData.mensagem,
                mediaUrl
            );

            if (success) {
                console.log(`✅ Anúncio local ID ${adData.id} enviado com sucesso`);
            } else {
                console.log(`❌ Falha ao enviar anúncio local ID ${adData.id}`);
            }

        } catch (error) {
            console.error(`❌ Erro ao enviar anúncio local ID ${adData.id}:`, error.message);
        }
    }

    /**
     * Para todos os timers de anúncios locais
     */
    static stopLocalAds() {
        if (this.localAdsTimers.size > 0) {
            console.log(`🛑 Parando ${this.localAdsTimers.size} anúncios locais (painel disponível)`);
            
            for (const timerId of this.localAdsTimers.values()) {
                clearInterval(timerId);
            }
            
            this.localAdsTimers.clear();
        }
    }
}

module.exports = AutoMessageHandler;
