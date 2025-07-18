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
     * A única função que envia mensagens para o WhatsApp.
     * @param {string} targetId - O ID do grupo ou usuário.
     * @param {string} content - O texto da mensagem.
     * @param {string|null} mediaUrl - A URL da mídia (opcional).
     */
    static async sendMessage(targetId, content, mediaUrl = null) {
        if (!this.client) {
            console.error('❌ ERRO GRAVE: O Sender não foi inicializado com um cliente.');
            return false;
        }

        try {
            if (mediaUrl) {
                // Lógica robusta de envio de mídia
                const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
                const mediaBuffer = Buffer.from(response.data, 'binary');
                const mimetype = response.headers['content-type'];
                const media = new MessageMedia(mimetype, mediaBuffer.toString('base64'), path.basename(mediaUrl));
                    
                await this.client.sendMessage(targetId, media, { caption: content });
            } else {
                // Lógica de texto puro
                await this.client.sendMessage(targetId, content);
            }
            console.log(`✅ Mensagem enviada com sucesso para ${targetId}.`);
            return true; // Retorna sucesso

        } catch (error) {
            console.error(`❌ Falha ao enviar mensagem para ${targetId}:`, error);
            return false; // Retorna falha
        }
    }
}

module.exports = Sender;