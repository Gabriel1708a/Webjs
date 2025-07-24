const axios = require('axios');
const Sender = require('../utils/Sender');
const config = require('../config.json');

class AutoMessageHandler {
    static activeMessages = new Map(); // Armazena as mensagens e seus timers
    static localAdsTimers = new Map(); // Armazena timers dos anúncios locais
    static DataManager = null; // Será injetado na inicialização
    static panelAvailable = false; // Status do painel
    static lastPanelCheck = 0; // Timestamp da última verificação

    /**
     * Inicia o serviço híbrido, buscando mensagens do painel e fallback local.
     * @param {object} dataManager - Instância do DataManager para acessar dados locais
     */
    static async initialize(dataManager = null) {
        console.log('🔄 Iniciando serviço de mensagens automáticas híbrido v2.1...');
        
        // Armazenar DataManager para uso posterior
        this.DataManager = dataManager;

        // Verificar conexão inicial com o painel
        await this.checkPanelConnection();

        // Iniciar busca híbrida com intervalo otimizado
        setInterval(() => this.fetchMessagesFromPanel(), config.sync?.messagesInterval || 30000);
        
        // Verificar conexão com painel a cada 5 minutos
        setInterval(() => this.checkPanelConnection(), 5 * 60 * 1000);
        
        this.fetchMessagesFromPanel();
    }

    /**
     * Verifica se o painel está disponível
     */
    static async checkPanelConnection() {
        try {
            const response = await axios.get(`${config.laravelApi.baseUrl}/ads`, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json'
                },
                timeout: config.laravelApi?.timeout || 10000
            });

            const wasUnavailable = !this.panelAvailable;
            this.panelAvailable = true;
            this.lastPanelCheck = Date.now();

            if (wasUnavailable) {
                console.log('✅ Conexão com painel restabelecida');
                // Parar anúncios locais se estavam rodando
                this.stopLocalAds();
            }

        } catch (error) {
            const wasAvailable = this.panelAvailable;
            this.panelAvailable = false;
            
            if (wasAvailable) {
                console.log('❌ Conexão com painel perdida. Ativando fallback local.');
                // Iniciar anúncios locais imediatamente
                await this.loadLocalAds();
            }
        }
    }

    /**
     * Busca mensagens do painel Laravel com fallback inteligente para anúncios locais.
     * CORREÇÃO: Usa /api/ads em vez de /api/messages/pending
     */
    static async fetchMessagesFromPanel() {
        let panelMessages = [];
        let panelError = false;

        // Se o painel estava indisponível há muito tempo, verificar novamente
        if (!this.panelAvailable && (Date.now() - this.lastPanelCheck) > 60000) {
            await this.checkPanelConnection();
        }

        if (this.panelAvailable) {
            try {
                if (config.logging?.enableApiLogs) {
                    console.log('📡 Buscando mensagens do painel Laravel (nova rota /api/ads)...');
                }
                
                // CORREÇÃO: Mudança da rota /api/messages/pending para /api/ads
                const response = await axios.get(`${config.laravelApi.baseUrl}/ads`, {
                    headers: {
                        'Authorization': `Bearer ${config.laravelApi.token}`,
                        'Accept': 'application/json'
                    },
                    timeout: config.laravelApi?.timeout || 10000
                });

                // Processar resposta com múltiplos formatos possíveis
                let messages = response.data;
                
                if (messages && typeof messages === 'object' && !Array.isArray(messages)) {
                    if (messages.data && Array.isArray(messages.data)) {
                        messages = messages.data;
                    } else if (messages.messages && Array.isArray(messages.messages)) {
                        messages = messages.messages;
                    } else if (messages.ads && Array.isArray(messages.ads)) {
                        messages = messages.ads;
                    } else {
                        console.warn('⚠️ Formato de resposta inesperado do painel:', Object.keys(messages));
                        panelError = true;
                    }
                }

                if (!Array.isArray(messages)) {
                    console.error('❌ Resposta do painel não é um array válido:', typeof messages);
                    panelError = true;
                } else {
                    panelMessages = messages;
                    if (config.logging?.enableApiLogs) {
                        console.log(`✅ ${messages.length} mensagens do painel encontradas.`);
                    }
                }

            } catch (error) {
                console.error('❌ Erro ao buscar mensagens do painel:', error.response?.data || error.message);
                panelError = true;
                this.panelAvailable = false;
            }
        } else {
            panelError = true;
        }

        // Sistema híbrido inteligente
        if (panelError || !this.panelAvailable) {
            // Se não tem anúncios locais rodando, carregar
            if (this.localAdsTimers.size === 0 && config.localAds?.enabled !== false) {
                console.log('🔄 Painel indisponível. Carregando anúncios locais como fallback...');
                await this.loadLocalAds();
            }
        } else {
            // Painel funcionando - sincronizar mensagens
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
        if (!Array.isArray(panelMessages)) {
            console.error('❌ syncMessages: panelMessages não é um array válido:', typeof panelMessages);
            return;
        }

        if (config.logging?.enableSyncLogs) {
            console.log(`[SYNC] Iniciando sincronização. Mensagens ativas: ${this.activeMessages.size}, Painel: ${panelMessages.length}`);
        }
        
        const panelMessageIds = new Set(panelMessages.map(m => m.id));

        // Etapa 1: Remove timers de mensagens que foram deletadas no painel
        for (const localId of this.activeMessages.keys()) {
            if (!panelMessageIds.has(localId)) {
                if (config.logging?.enableSyncLogs) {
                    console.log(`[SYNC] Mensagem ID ${localId} removida do painel. Parando timer.`);
                }
                clearInterval(this.activeMessages.get(localId).timerId);
                this.activeMessages.delete(localId);
            }
        }

        // Etapa 2: Adiciona ou ATUALIZA timers
        for (const panelMessage of panelMessages) {
            const existingMessage = this.activeMessages.get(panelMessage.id);

            // Validar campos obrigatórios
            if (!panelMessage.group_id) {
                console.warn(`[SYNC] Mensagem ID ${panelMessage.id} sem group_id. Ignorando.`);
                continue;
            }

            // CASO 1: A mensagem é completamente nova
            if (!existingMessage) {
                if (config.logging?.enableSyncLogs) {
                    console.log(`[SYNC] Nova mensagem detectada ID: ${panelMessage.id}. Agendando...`);
                }
                this.scheduleMessage(panelMessage);
                continue;
            }

            // CASO 2: A mensagem já existe - verificar mudanças
            const hasChanged =
                existingMessage.content !== panelMessage.content ||
                existingMessage.interval !== panelMessage.interval ||
                existingMessage.unit !== panelMessage.unit ||
                existingMessage.media_url !== panelMessage.media_url ||
                existingMessage.group_id !== panelMessage.group_id;

            if (hasChanged) {
                if (config.logging?.enableSyncLogs) {
                    console.log(`[SYNC] Mensagem ID ${panelMessage.id} atualizada. Reagendando...`);
                }
                this.scheduleMessage(panelMessage);
            }
        }
        
        if (config.logging?.enableSyncLogs) {
            console.log(`[SYNC] Sincronização concluída. Total de timers ativos: ${this.activeMessages.size}`);
        }
    }

    /**
     * Agenda o envio de uma mensagem específica.
     * @param {object} messageData - Os dados da mensagem vindos da API.
     */
    static scheduleMessage(messageData) {
        const isNew = !this.activeMessages.has(messageData.id);
        
        if (config.logging?.enableSyncLogs) {
            console.log(`[SCHEDULE] Agendando mensagem ID: ${messageData.id}. Nova: ${isNew}`);
        }

        // Validações
        if (!messageData.group_id) {
            console.error(`[SCHEDULE] Mensagem ID ${messageData.id} sem group_id. Abortando.`);
            return;
        }

        // Se já existe, limpar timer anterior
        if (!isNew) {
            clearInterval(this.activeMessages.get(messageData.id).timerId);
        }

        const intervalMs = this.convertIntervalToMilliseconds(messageData.interval, messageData.unit);
        
        if (config.logging?.enableSyncLogs) {
            console.log(`[SCHEDULE] Intervalo: ${messageData.interval} ${messageData.unit} = ${intervalMs} ms`);
        }

        if (intervalMs === 0) {
            console.log(`[SCHEDULE] Intervalo inválido para ID: ${messageData.id}. Abortando.`);
            return;
        }

        // Para mensagens novas, enviar imediatamente apenas se configurado
        if (isNew && config.sync?.sendNewImmediately) {
            console.log(`[SCHEDULE] Enviando nova mensagem imediatamente...`);
            this.sendMessage(messageData);
        }

        // Agendar envios recorrentes
        const timerId = setInterval(() => {
            this.sendMessage(messageData);
        }, intervalMs);

        this.activeMessages.set(messageData.id, { ...messageData, timerId });
        
        if (config.logging?.enableSyncLogs) {
            console.log(`[SCHEDULE] Agendamento concluído para ID: ${messageData.id}`);
        }
    }

    /**
     * Converte o intervalo para milissegundos com validação aprimorada.
     */
    static convertIntervalToMilliseconds(interval, unit) {
        const value = parseInt(interval, 10);
        if (isNaN(value) || value <= 0) {
            console.warn(`[INTERVAL] Valor inválido: ${interval}`);
            return 0;
        }

        const unitMap = {
            'minuto': 60 * 1000,
            'minutos': 60 * 1000,
            'minute': 60 * 1000,
            'minutes': 60 * 1000,
            'm': 60 * 1000,
            
            'hora': 60 * 60 * 1000,
            'horas': 60 * 60 * 1000,
            'hour': 60 * 60 * 1000,
            'hours': 60 * 60 * 1000,
            'h': 60 * 60 * 1000,
            
            'dia': 24 * 60 * 60 * 1000,
            'dias': 24 * 60 * 60 * 1000,
            'day': 24 * 60 * 60 * 1000,
            'days': 24 * 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };

        const normalizedUnit = (unit || 'minutos').toLowerCase().trim();
        const multiplier = unitMap[normalizedUnit];

        if (!multiplier) {
            console.warn(`[INTERVAL] Unidade não reconhecida: "${unit}". Usando padrão (minutos).`);
            return value * 60 * 1000; // Default para minutos
        }

        return value * multiplier;
    }

    /**
     * Envia a mensagem usando o módulo Sender centralizado.
     * @param {object} messageData - Os dados da mensagem.
     */
    static async sendMessage(messageData) {
        const targetGroupId = messageData.group_id;

        if (!targetGroupId) {
            console.error(`❌ ERRO: Mensagem ID ${messageData.id} sem group_id definido`);
            return;
        }

        console.log(`🚀 Enviando mensagem ID ${messageData.id} para grupo ${targetGroupId}`);

        const success = await Sender.sendMessage(
            targetGroupId,
            messageData.content,
            messageData.media_url || messageData.full_media_url
        );

        if (success) {
            await this.markAsSentInPanel(messageData.id);
        }
    }

    /**
     * Informa ao painel Laravel que a mensagem foi enviada.
     * CORREÇÃO: Usa /api/ads/{id}/sent em vez de /api/messages/{id}/sent
     * @param {number} messageId - O ID da mensagem.
     */
    static async markAsSentInPanel(messageId) {
        try {
            // CORREÇÃO: Mudança da rota /api/messages/{id}/sent para /api/ads/{id}/sent
            await axios.post(`${config.laravelApi.baseUrl}/ads/${messageId}/sent`, {}, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });
            
            if (config.logging?.enableApiLogs) {
                console.log(`📈 Status atualizado no painel para mensagem ID: ${messageId}`);
            }
        } catch (error) {
            console.error(`❌ Falha ao atualizar status no painel para mensagem ID ${messageId}:`, error.response?.data || error.message);
        }
    }

    // ========================================
    // MÉTODOS PARA ANÚNCIOS LOCAIS (FALLBACK) - VERSÃO APRIMORADA
    // ========================================

    /**
     * Carrega e agenda anúncios locais do ads.json (versão otimizada)
     */
    static async loadLocalAds() {
        if (!this.DataManager) {
            console.warn('⚠️ DataManager não disponível para anúncios locais.');
            return;
        }

        try {
            if (config.logging?.enableSyncLogs) {
                console.log('📂 Carregando anúncios locais do ads.json...');
            }
            const adsData = await this.DataManager.loadData(config.localAds?.dataFile || 'ads.json');
            
            if (!adsData.anuncios) {
                console.log('📭 Nenhum anúncio local encontrado.');
                return;
            }

            let totalActiveAds = 0;
            const groupsWithAds = [];

            for (const [groupId, groupAds] of Object.entries(adsData.anuncios)) {
                const activeAds = Object.values(groupAds).filter(ad => ad.ativo);
                
                if (activeAds.length > 0) {
                    totalActiveAds += activeAds.length;
                    groupsWithAds.push(groupId);
                    
                    // Agendar anúncios em lote
                    activeAds.forEach(ad => this.scheduleLocalAd(groupId, ad));
                }
            }

            console.log(`✅ ${totalActiveAds} anúncios locais agendados em ${groupsWithAds.length} grupos`);

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
        
        // NÃO enviar imediatamente - apenas agendar
        const timerId = setInterval(() => {
            this.sendLocalAd(groupId, adData);
        }, intervalMs);

        this.localAdsTimers.set(adKey, timerId);
        
        if (config.logging?.enableSyncLogs) {
            console.log(`⏰ Anúncio local agendado: ID ${adData.id}, Grupo ${groupId}, Intervalo ${adData.intervalo}m`);
        }
    }

    /**
     * Envia um anúncio local
     * @param {string} groupId - ID do grupo
     * @param {object} adData - Dados do anúncio
     */
    static async sendLocalAd(groupId, adData) {
        try {
            let mediaUrl = null;
            if (adData.media && adData.media.data) {
                // TODO: Implementar conversão de dados base64 para URL se necessário
                // Por enquanto, anúncios locais só suportam texto
                mediaUrl = null;
            }

            const success = await Sender.sendMessage(
                groupId,
                adData.mensagem,
                mediaUrl
            );

            if (success && config.logging?.enableApiLogs) {
                console.log(`📢 Anúncio local enviado: ID ${adData.id} para grupo ${groupId}`);
            } else if (!success) {
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

    /**
     * Métodos de diagnóstico e monitoramento
     */
    static getStatus() {
        return {
            panelAvailable: this.panelAvailable,
            activeMessages: this.activeMessages.size,
            localAdsActive: this.localAdsTimers.size,
            lastPanelCheck: new Date(this.lastPanelCheck).toISOString()
        };
    }

    static logStatus() {
        const status = this.getStatus();
        console.log(`[STATUS] Painel: ${status.panelAvailable ? '✅' : '❌'} | Mensagens painel: ${status.activeMessages} | Anúncios locais: ${status.localAdsActive}`);
    }
}

module.exports = AutoMessageHandler;