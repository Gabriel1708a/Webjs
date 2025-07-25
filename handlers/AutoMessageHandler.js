const axios = require('axios');
const Sender = require('../Sender');

// Suas configurações devem vir de um arquivo central
const config = {
    laravelApi: {
        baseUrl: 'https://painel.botwpp.tech/api', // A base da sua API
        token: 'teste' // O MESMO TOKEN DO ARQUIVO .env
    }
};

class AutoMessageHandler {
    static activeMessages = new Map(); // Armazena as mensagens e seus timers

    /**
     * Inicia o serviço, buscando as mensagens e configurando os intervalos.
     */
    static async initialize() {
        console.log('🔄 Iniciando serviço de mensagens automáticas...');

        // --- BINDING ---
        // "Amarra" o 'this' da classe a cada função.
        // Isso garante que, não importa como a função seja chamada,
        // o 'this' sempre se referirá a 'AutoMessageHandler'.
        this.fetchMessagesFromPanel = this.fetchMessagesFromPanel.bind(this);
        this.syncMessages = this.syncMessages.bind(this);
        this.scheduleMessage = this.scheduleMessage.bind(this);
        this.sendMessage = this.sendMessage.bind(this);

        // Agora que o 'this' está garantido, podemos chamar com segurança.
        setInterval(this.fetchMessagesFromPanel, 10 * 1000); 
        
        this.fetchMessagesFromPanel();
    }



    /**
     * Busca as mensagens da API do Laravel.
     */
    static async fetchMessagesFromPanel() {
        try {
            console.log('📡 Buscando mensagens do painel Laravel...');
            const response = await axios.get(`${config.laravelApi.baseUrl}/messages/pending`, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json'
                }
            });

            const messages = response.data;
            console.log(`✅ ${messages.length} mensagens encontradas. Sincronizando...`);
            this.syncMessages(messages);

        } catch (error) {
            console.error('❌ Erro ao buscar mensagens do painel:', error.response?.data || error.message);
        }
    }

    /**
     * Sincroniza as mensagens locais com as recebidas do painel, lidando com edições.
     * @param {Array} panelMessages - Array de mensagens da API.
     */
    static syncMessages(panelMessages) {
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
}

module.exports = AutoMessageHandler;
