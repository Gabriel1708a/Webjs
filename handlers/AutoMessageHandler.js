const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

// Suas configurações devem vir de um arquivo central
const config = {
    laravelApi: {
        baseUrl: 'https://painel.botwpp.tech/api', // A base da sua API
        token: 'teste' // O MESMO TOKEN DO ARQUIVO .env
    }
};

class AutoMessageHandler {
    static activeMessages = new Map(); // Armazena as mensagens e seus timers
    static client; // Referência ao cliente do WhatsApp

    /**
     * Inicia o serviço, buscando as mensagens e configurando os intervalos.
     * @param {object} waClient - O cliente do whatsapp-web.js
     */
    static async initialize(waClient) {
        this.client = waClient;
        console.log('🔄 Iniciando serviço de mensagens automáticas...');

        // Busca as mensagens do painel a cada 10 segundos para testes (depois voltar para 5 min)
        setInterval(this.fetchMessagesFromPanel, 10 * 1000); // Busca a cada 10 segundos
        
        // Executa a primeira busca imediatamente
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
     * Sincroniza as mensagens locais com as recebidas do painel.
     * @param {Array} panelMessages - Array de mensagens da API.
     */
    static syncMessages(panelMessages) {
        const panelMessageIds = new Set(panelMessages.map(m => m.id));

        // Remove timers de mensagens que foram deletadas no painel
        for (const localId of this.activeMessages.keys()) {
            if (!panelMessageIds.has(localId)) {
                clearInterval(this.activeMessages.get(localId).timerId);
                this.activeMessages.delete(localId);
                console.log(`🗑️ Timer removido para a mensagem ID: ${localId}`);
            }
        }

        // Adiciona ou atualiza timers
        for (const message of panelMessages) {
            this.scheduleMessage(message);
        }
    }

    /**
     * Agenda o envio de uma mensagem específica.
     * @param {object} messageData - Os dados da mensagem vindos da API.
     */
    static scheduleMessage(messageData) {
        const isNewMessage = !this.activeMessages.has(messageData.id);

        if (!isNewMessage) {
            // Se a mensagem já existe, apenas limpa o timer antigo para recriar
            clearInterval(this.activeMessages.get(messageData.id).timerId);
        }

        const intervalMilliseconds = this.convertIntervalToMilliseconds(messageData.interval, messageData.unit);
        if (intervalMilliseconds === 0) return;

        // Se for uma mensagem nova, envia imediatamente a primeira vez
        if (isNewMessage) {
            console.log(`✨ Nova mensagem detectada (ID: ${messageData.id}). Enviando imediatamente...`);
            this.sendMessage(messageData); 
        }

        const timerId = setInterval(() => {
            this.sendMessage(messageData);
        }, intervalMilliseconds);

        this.activeMessages.set(messageData.id, { ...messageData, timerId });
        console.log(`⏰ Mensagem ID ${messageData.id} agendada para cada ${messageData.interval} ${messageData.unit}(s).`);
    }

    /**
     * Converte o intervalo (ex: 5, 'minutes') para milissegundos.
     */
    static convertIntervalToMilliseconds(interval, unit) {
        const value = parseInt(interval, 10);
        switch (unit.toLowerCase()) {
            case 'minutos':
            case 'minutes':
                return value * 60 * 1000;
            case 'horas':
            case 'hours':
                return value * 60 * 60 * 1000;
            case 'dias':
            case 'days':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 0;
        }
    }

    /**
     * Envia a mensagem para todos os grupos/contatos necessários.
     * @param {object} messageData - Os dados da mensagem.
     */
    static async sendMessage(messageData) {
        // IMPORTANTE: Você precisa definir para onde a mensagem será enviada.
        // Vou usar um exemplo de ID de grupo fixo. Você precisa adaptar essa lógica.
        const targetGroupId = '120363402144363977@g.us'; // SUBSTITUA PELO ID DO GRUPO CORRETO

        console.log(`🚀 Enviando mensagem ID ${messageData.id} para ${targetGroupId}...`);

        try {
            let media = null;
            if (messageData.full_media_url) {
                // Baixa a mídia da URL pública do Laravel
                media = await MessageMedia.fromUrl(messageData.full_media_url, { unsafeMime: true });
            }

            await this.client.sendMessage(targetGroupId, messageData.content, { media });
            
            console.log(`✅ Mensagem ID ${messageData.id} enviada com sucesso.`);
            
            // Informa ao painel que a mensagem foi enviada (Etapa 3)
            this.markAsSentInPanel(messageData.id);

        } catch (error) {
            console.error(`❌ Falha ao enviar mensagem ID ${messageData.id}:`, error);
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