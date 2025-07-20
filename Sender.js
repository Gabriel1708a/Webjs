// Arquivo: Sender.js
const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const path = require('path');

class Sender {
    static client;

    /**
     * Inicializa o Sender com o cliente ativo.
     * @param {object} waClient - O cliente do whatsapp-web.js
     */
    static initialize(waClient) {
        this.client = waClient;
        console.log('✅ Módulo de envio (Sender) inicializado.');
    }

    /**
     * Envia uma mensagem para um grupo, com suporte opcional para mídia via URL.
     * @param {object|string} clientOrTargetId - A instância do cliente do whatsapp-web.js OU o ID do grupo (compatibilidade).
     * @param {string} groupIdOrContent - O ID do grupo OU o texto da mensagem (compatibilidade).
     * @param {string} contentOrMediaUrl - O texto da mensagem OU a URL da mídia (compatibilidade).
     * @param {string|null} mediaUrl - A URL completa da mídia a ser enviada (opcional).
     * @returns {boolean} - Retorna true se o envio foi bem-sucedido, false caso contrário.
     */
    static async sendMessage(clientOrTargetId, groupIdOrContent, contentOrMediaUrl = null, mediaUrl = null) {
        let client, targetId, content, finalMediaUrl;

        // Detecta se está sendo chamado com cliente como primeiro parâmetro (AdManager) ou sem cliente (AutoMessageHandler)
        if (typeof clientOrTargetId === 'object' && clientOrTargetId.sendMessage) {
            // Nova assinatura: sendMessage(client, groupId, content, mediaUrl)
            client = clientOrTargetId;
            targetId = groupIdOrContent;
            content = contentOrMediaUrl;
            finalMediaUrl = mediaUrl;
        } else {
            // Assinatura antiga: sendMessage(targetId, content, mediaUrl)
            client = this.client;
            targetId = clientOrTargetId;
            content = groupIdOrContent;
            finalMediaUrl = contentOrMediaUrl;
        }

        if (!client) {
            console.error('❌ ERRO GRAVE: O Sender não foi inicializado com um cliente.');
            return false;
        }

        try {
            let media = null;
            // Se uma URL de mídia foi fornecida, baixe-a
            if (finalMediaUrl) {
                console.log(`[Sender] Baixando mídia de: ${finalMediaUrl}`);
                try {
                    const response = await axios.get(finalMediaUrl, { responseType: 'arraybuffer' });
                    const mediaBuffer = Buffer.from(response.data, 'binary');
                    const mimetype = response.headers['content-type'];
                    media = new MessageMedia(mimetype, mediaBuffer.toString('base64'), path.basename(finalMediaUrl));
                } catch (urlError) {
                    console.error(`[Sender] Falha ao baixar mídia da URL: ${finalMediaUrl}. Enviando apenas texto.`, urlError);
                    media = null; // Garante que a mídia é nula se o download falhar
                }
            }

            // Define as opções de envio
            const options = {};
            if (media) {
                // Se a mídia existe, o 'content' vira a legenda (caption)
                options.caption = content;
            }

            // Envia a mensagem: envia a mídia com legenda, ou apenas o texto
            await client.sendMessage(targetId, media || content, options);
            
            console.log(`[Sender] Mensagem enviada com sucesso para ${targetId}.`);
            return true;

        } catch (error) {
            console.error(`[Sender] Falha catastrófica ao enviar mensagem para ${targetId}:`, error);
            return false;
        }
    }
}

module.exports = Sender;