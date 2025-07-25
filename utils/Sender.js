// utils/Sender.js - Sistema de Envio de Mensagens Otimizado
// Versão: 2.1 - Correção validateAndGetParts + Validação Robusta

const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const fs = require('fs');
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

    // Validar ID do chat antes do envio
    static validateChatId(chatId) {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('ID do chat inválido ou não fornecido');
        }
        
        // Validar formato do ID
        if (!chatId.includes('@')) {
            throw new Error(`Formato de ID inválido: ${chatId}`);
        }
        
        // Verificar se é um ID válido do WhatsApp
        const validPatterns = [
            /@c\.us$/, // Contato individual
            /@g\.us$/, // Grupo
            /@s\.whatsapp\.net$/ // Status
        ];
        
        if (!validPatterns.some(pattern => pattern.test(chatId))) {
            throw new Error(`Padrão de ID não reconhecido: ${chatId}`);
        }
        
        return true;
    }

    // Validar conteúdo da mensagem
    static validateContent(content) {
        if (!content) {
            throw new Error('Conteúdo da mensagem não pode estar vazio');
        }
        
        if (typeof content === 'string') {
            if (content.length > 65536) { // Limite do WhatsApp
                throw new Error('Mensagem muito longa (máximo 65536 caracteres)');
            }
        }
        
        return true;
    }

    // Validar opções de envio
    static validateOptions(options = {}) {
        if (options.mentions && Array.isArray(options.mentions)) {
            // Validar cada menção
            for (const mention of options.mentions) {
                if (!mention.includes('@c.us')) {
                    throw new Error(`Formato de menção inválido: ${mention}`);
                }
            }
        }
        
        return true;
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

        const startTime = Date.now();
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                attempt++;
                
                // Validações pré-envio
                Sender.validateChatId(targetId);
                Sender.validateContent(content);
                
                console.log(`[Sender] 📤 Enviando mensagem para: ${targetId} (tentativa ${attempt}/${maxRetries})`);
                
                let media = null;
                // Se uma URL de mídia foi fornecida, baixe-a
                if (finalMediaUrl) {
                    console.log(`[Sender] Baixando mídia de: ${finalMediaUrl}`);
                    try {
                        const response = await axios.get(finalMediaUrl, { 
                            responseType: 'arraybuffer',
                            timeout: 15000,
                            headers: {
                                'User-Agent': 'WhatsApp-Bot/1.0'
                            }
                        });
                        const mediaBuffer = Buffer.from(response.data, 'binary');
                        const mimetype = response.headers['content-type'];
                        media = new MessageMedia(mimetype, mediaBuffer.toString('base64'), path.basename(finalMediaUrl));
                    } catch (urlError) {
                        console.error(`[Sender] Falha ao baixar mídia da URL: ${finalMediaUrl}. Enviando apenas texto.`, urlError.message);
                        media = null; // Garante que a mídia é nula se o download falhar
                    }
                }

                // Define as opções de envio
                const options = {};
                if (media) {
                    // Se a mídia existe, o 'content' vira a legenda (caption)
                    options.caption = content;
                }

                // Validar opções
                Sender.validateOptions(options);

                // Tentar enviar a mensagem com timeout
                const sendPromise = client.sendMessage(targetId, media || content, options);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout no envio da mensagem')), 30000)
                );
                
                const result = await Promise.race([sendPromise, timeoutPromise]);
                
                const duration = Date.now() - startTime;
                console.log(`[Sender] ✅ Mensagem enviada com sucesso para ${targetId} em ${duration}ms`);
                return true;

            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[Sender] ❌ Erro no envio (tentativa ${attempt}/${maxRetries}): ${error.message}`);
                
                // Erros específicos que não devem ser retentados
                const nonRetryableErrors = [
                    'ID do chat inválido',
                    'Formato de ID inválido', 
                    'Mensagem muito longa',
                    'Formato de menção inválido',
                    'Chat not found',
                    'Invalid number'
                ];
                
                if (nonRetryableErrors.some(err => error.message.includes(err))) {
                    console.error(`[Sender] 🚫 Erro não recuperável: ${error.message}`);
                    return false;
                }
                
                // Erro validateAndGetParts específico
                if (error.message.includes('validateAndGetParts') || error.stack?.includes('validateAndGetParts')) {
                    console.error(`[Sender] 🔧 Erro validateAndGetParts detectado - tentando correção automática`);
                    
                    // Tentar com conteúdo simplificado
                    try {
                        const simpleContent = typeof content === 'string' 
                            ? (content.length > 1000 ? content.substring(0, 1000) + '...' : content)
                            : 'Mensagem (conteúdo simplificado)';
                            
                        const result = await client.sendMessage(targetId, simpleContent);
                        console.log(`[Sender] ✅ Mensagem simplificada enviada após correção validateAndGetParts`);
                        return true;
                    } catch (simplifiedError) {
                        console.error(`[Sender] ❌ Falha ao enviar mensagem simplificada: ${simplifiedError.message}`);
                    }
                }
                
                if (attempt === maxRetries) {
                    console.error(`[Sender] 💥 Falha definitiva após ${maxRetries} tentativas em ${duration}ms`);
                    return false;
                }
                
                // Aguardar antes da próxima tentativa
                const delay = 1000 * attempt;
                console.log(`[Sender] ⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return false;
    }
}

module.exports = Sender;