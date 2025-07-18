const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs').promises; // Usamos a versão com Promises
const path = require('path');

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

        // --- BINDING ---
        // "Amarra" o 'this' da classe a cada função.
        // Isso garante que, não importa como a função seja chamada,
        // o 'this' sempre se referirá a 'AutoMessageHandler'.
        this.fetchMessagesFromPanel = this.fetchMessagesFromPanel.bind(this);
        this.syncMessages = this.syncMessages.bind(this);
        this.scheduleMessage = this.scheduleMessage.bind(this);
        this.sendMessage = this.sendMessage.bind(this);

        // Lista os grupos disponíveis para debug
        await this.listAvailableGroups();

        // Agora que o 'this' está garantido, podemos chamar com segurança.
        setInterval(this.fetchMessagesFromPanel, 10 * 1000); 
        
        this.fetchMessagesFromPanel();
    }

    /**
     * Lista todos os grupos disponíveis para debug
     */
    static async listAvailableGroups() {
        try {
            console.log('📋 Listando grupos disponíveis...');
            const chats = await this.client.getChats();
            const groups = chats.filter(chat => chat.isGroup);
            
            console.log(`📊 Total de grupos encontrados: ${groups.length}`);
            groups.forEach((group, index) => {
                console.log(`${index + 1}. Nome: "${group.name}" | ID: ${group.id._serialized}`);
            });
            
            if (groups.length === 0) {
                console.log('⚠️  Nenhum grupo encontrado. Verifique se o WhatsApp está conectado e se há grupos disponíveis.');
            }
        } catch (error) {
            console.error('❌ Erro ao listar grupos:', error.message);
        }
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
     * Envia a mensagem para todos os grupos/contatos necessários.
     * @param {object} messageData - Os dados da mensagem.
     */
    static async sendMessage(messageData) {
        const targetGroupId = '12036302965087023@g.us'; // SEU ID DE GRUPO

        console.log(`🚀 Enviando mensagem ID ${messageData.id} para ${targetGroupId}...`);
        console.log(`[DEBUG] Conteúdo da mensagem: "${messageData.content}"`);
        console.log(`[DEBUG] URL da mídia: ${messageData.full_media_url || 'Nenhuma'}`);

        // Verificações de segurança
        if (!this.client) {
            console.error(`❌ ERRO CRÍTICO: Cliente WhatsApp não está inicializado!`);
            return;
        }

        try {
            // Verifica se o cliente está conectado
            const state = await this.client.getState();
            console.log(`[DEBUG] Estado do cliente WhatsApp: ${state}`);
            
            if (state !== 'CONNECTED') {
                console.error(`❌ ERRO: Cliente WhatsApp não está conectado. Estado atual: ${state}`);
                return;
            }

            // Verifica se o grupo existe
            try {
                const chat = await this.client.getChatById(targetGroupId);
                console.log(`[DEBUG] Grupo encontrado: ${chat.name || 'Nome não disponível'}`);
            } catch (chatError) {
                console.error(`❌ ERRO: Não foi possível encontrar o grupo ${targetGroupId}:`, chatError.message);
                return;
            }

            let sentMessage = null;

            if (messageData.full_media_url) {
                // --- LÓGICA FINAL COMBINADA ---
                console.log(`[DEBUG] Baixando mídia com axios de: ${messageData.full_media_url}`);
                    
                // 1. Baixa a imagem como um buffer
                const response = await axios.get(messageData.full_media_url, {
                    responseType: 'arraybuffer',
                    timeout: 30000 // 30 segundos timeout
                });
                console.log(`[DEBUG] Mídia baixada. Tamanho: ${response.data.byteLength} bytes`);
                
                const imageBuffer = Buffer.from(response.data, 'binary');
                    
                // 2. Pega o tipo de mídia (mimetype)
                const mimetype = response.headers['content-type'];
                console.log(`[DEBUG] Mimetype detectado: ${mimetype}`);

                // 3. Cria o MessageMedia a partir do BUFFER (não do arquivo)
                const media = new MessageMedia(mimetype, imageBuffer.toString('base64'), path.basename(messageData.full_media_url));
                console.log(`[DEBUG] MessageMedia criado. Tamanho base64: ${media.data.length} caracteres`);
                    
                // 4. Envia a mídia com a legenda
                sentMessage = await this.client.sendMessage(targetGroupId, media, { caption: messageData.content });

            } else {
                // --- LÓGICA PARA TEXTO PURO ---
                sentMessage = await this.client.sendMessage(targetGroupId, messageData.content);
            }

            console.log(`✅ Mensagem ID ${messageData.id} enviada com sucesso!`);
            console.log(`[DEBUG] ID da mensagem enviada: ${sentMessage.id._serialized}`);
            console.log(`[DEBUG] Timestamp do envio: ${sentMessage.timestamp}`);
            
            this.markAsSentInPanel(messageData.id);

        } catch (error) {
            console.error(`❌ FALHA REAL ao enviar mensagem ID ${messageData.id}:`);
            console.error(`[DEBUG] Tipo do erro: ${error.constructor.name}`);
            console.error(`[DEBUG] Mensagem do erro: ${error.message}`);
            console.error(`[DEBUG] Stack trace:`, error.stack);
            
            // Não marca como enviado se houve erro
            console.log(`[DEBUG] Mensagem ID ${messageData.id} NÃO foi marcada como enviada devido ao erro.`);
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