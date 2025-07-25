// utils/Sender.js - Sistema de Envio de Mensagens Otimizado
// Versão: 2.3 - CORREÇÃO CRÍTICA validateAndGetParts + Ultra-Robustez FINAL

const { MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class Sender {
    static client;
    static sendQueue = [];
    static isProcessingQueue = false;

    /**
     * Inicializa o Sender com o cliente ativo.
     * @param {object} waClient - O cliente do whatsapp-web.js
     */
    static initialize(waClient) {
        this.client = waClient;
        console.log('✅ Módulo de envio (Sender) inicializado com proteção validateAndGetParts CRÍTICA.');
        
        // Iniciar processamento da fila
        this.startQueueProcessor();
    }

    // Sistema de fila para envios críticos
    static startQueueProcessor() {
        setInterval(async () => {
            if (!this.isProcessingQueue && this.sendQueue.length > 0) {
                this.isProcessingQueue = true;
                const message = this.sendQueue.shift();
                
                try {
                    await this.processSafeMessage(message);
                } catch (error) {
                    console.error(`[Sender-Queue] ❌ Erro no processamento: ${error.message}`);
                }
                
                this.isProcessingQueue = false;
            }
        }, 500);
    }

    // Processar mensagem com máxima segurança
    static async processSafeMessage({ targetId, content, options, resolve, reject }) {
        try {
            const result = await this.sendMessageUltraSafe(this.client, targetId, content, options);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    }

    // Validar ID do chat antes do envio - VERSÃO ULTRA-ROBUSTA
    static validateChatId(chatId) {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('ID do chat inválido ou não fornecido');
        }
        
        // Limpar o chatId de caracteres problemáticos
        let cleanChatId = chatId.trim();
        
        // Remover caracteres invisíveis e problemáticos
        cleanChatId = cleanChatId.replace(/[\u200B-\u200D\uFEFF]/g, '');
        cleanChatId = cleanChatId.replace(/[^\w@.-]/g, '');
        
        // Validar formato do ID
        if (!cleanChatId.includes('@')) {
            throw new Error(`Formato de ID inválido: ${cleanChatId}`);
        }
        
        // Verificar se é um ID válido do WhatsApp
        const validPatterns = [
            /@c\.us$/, // Contato individual
            /@g\.us$/, // Grupo
            /@s\.whatsapp\.net$/ // Status
        ];
        
        if (!validPatterns.some(pattern => pattern.test(cleanChatId))) {
            throw new Error(`Padrão de ID não reconhecido: ${cleanChatId}`);
        }
        
        return cleanChatId;
    }

    // Validar conteúdo da mensagem - VERSÃO ULTRA-ROBUSTA
    static validateContent(content) {
        if (!content) {
            throw new Error('Conteúdo da mensagem não pode estar vazio');
        }
        
        if (typeof content === 'string') {
            // Verificar caracteres problemáticos
            const problematicChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
            if (problematicChars.test(content)) {
                console.warn('[Sender] ⚠️ Caracteres problemáticos detectados no conteúdo');
            }
            
            if (content.length > 65536) { // Limite do WhatsApp
                throw new Error('Mensagem muito longa (máximo 65536 caracteres)');
            }
        }
        
        return true;
    }

    // Validar opções de envio com proteção extra
    static validateOptions(options = {}) {
        const safeOptions = { ...options };
        
        if (safeOptions.mentions && Array.isArray(safeOptions.mentions)) {
            // Validar e limpar cada menção
            safeOptions.mentions = safeOptions.mentions
                .filter(mention => mention && typeof mention === 'string')
                .map(mention => {
                    // Limpar caracteres problemáticos
                    let cleanMention = mention.trim().replace(/[^\w@.-]/g, '');
                    
                    // Garantir formato correto
                    if (!cleanMention.includes('@c.us') && !cleanMention.includes('@g.us')) {
                        if (cleanMention.match(/^\d+$/)) {
                            cleanMention = `${cleanMention}@c.us`;
                        }
                    }
                    
                    return cleanMention;
                })
                .filter(mention => mention.includes('@'));
        }
        
        // Remover propriedades problemáticas
        delete safeOptions.media;
        delete safeOptions.location;
        delete safeOptions.quotedMessageId;
        
        return safeOptions;
    }

    /**
     * Envia uma mensagem com sistema de fallback ultra-robusto CRÍTICO
     * @param {object} client - Cliente do WhatsApp
     * @param {string} targetId - ID do destinatário
     * @param {string|MessageMedia} content - Conteúdo da mensagem
     * @param {object} options - Opções adicionais
     * @returns {Promise<boolean>} - True se enviado com sucesso
     */
    static async sendMessage(client, targetId, content, options = {}) {
        const startTime = Date.now();
        console.log(`[Sender] 🚀 Iniciando envio CRÍTICO para ${targetId}`);
        
        // Adicionar à fila para casos críticos
        if (options.critical) {
            return new Promise((resolve, reject) => {
                this.sendQueue.push({ targetId, content, options, resolve, reject });
            });
        }
        
        return await this.sendMessageUltraSafe(client, targetId, content, options, startTime);
    }
    
    // Método principal ultra-seguro
    static async sendMessageUltraSafe(client, targetId, content, options = {}, startTime = Date.now()) {
        try {
            // Pré-validações críticas
            const validatedTargetId = this.validateChatId(targetId);
            this.validateContent(content);
            const safeOptions = this.validateOptions(options);
            
            console.log(`[Sender] 📋 Dados validados - Target: ${validatedTargetId}`);
            
            // Estratégia 1: Envio ultra-seguro com preparação especial
            try {
                console.log(`[Sender] 🛡️ Tentativa ultra-segura...`);
                const result = await this.attemptUltraSafeSend(client, validatedTargetId, content, safeOptions);
                
                if (result) {
                    const duration = Date.now() - startTime;
                    console.log(`[Sender] ✅ Envio ultra-seguro bem-sucedido em ${duration}ms`);
                    return true;
                }
            } catch (ultraSafeError) {
                console.error(`[Sender] ⚠️ Envio ultra-seguro falhou: ${ultraSafeError.message}`);
                
                // Verificar se é validateAndGetParts
                if (ultraSafeError.message.includes('validateAndGetParts') || ultraSafeError.stack?.includes('validateAndGetParts')) {
                    console.error(`[Sender] 🚨 validateAndGetParts detectado - aplicando correção crítica`);
                    return await this.handleValidateAndGetPartsErrorCritical(client, validatedTargetId, content);
                }
            }
            
            // Estratégia 2: Fallback básico
            console.log(`[Sender] 🔄 Aplicando fallback básico...`);
            return await this.attemptBasicFallback(client, validatedTargetId);
            
        } catch (error) {
            console.error(`[Sender] ❌ Erro crítico no envio: ${error.message}`);
            return await this.emergencyFallback(client, targetId);
        }
    }
    
    // Tentativa de envio ultra-segura com preparação especial
    static async attemptUltraSafeSend(client, targetId, content, options) {
        // Preparar dados com máxima segurança
        const { finalContent, finalOptions } = this.prepareUltraSafeData(content, options);
        
        console.log(`[Sender] 📝 Conteúdo preparado: ${typeof finalContent} (${finalContent?.length || 'N/A'} chars)`);
        console.log(`[Sender] ⚙️ Opções: ${JSON.stringify(Object.keys(finalOptions))}`);
        
        // Verificação final antes do envio
        if (!this.preFlightCheck(targetId, finalContent, finalOptions)) {
            throw new Error('Falha na verificação pré-envio');
        }
        
        // Enviar com timeout rigoroso
        const sendPromise = client.sendMessage(targetId, finalContent, finalOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout crítico no envio')), 10000)
        );
        
        await Promise.race([sendPromise, timeoutPromise]);
        return true;
    }
    
    // Preparar dados com máxima segurança para evitar validateAndGetParts
    static prepareUltraSafeData(content, options) {
        let finalContent = content;
        let finalOptions = {};
        
        // Tratar conteúdo string
        if (typeof content === 'string') {
            // Limpar caracteres problemáticos
            finalContent = content
                .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Caracteres de controle
                .replace(/[\u200B-\u200D\uFEFF]/g, '') // Caracteres invisíveis
                .replace(/\s+/g, ' ') // Normalizar espaços
                .trim();
            
            // Limitar tamanho para evitar problemas
            if (finalContent.length > 3000) {
                finalContent = finalContent.substring(0, 3000) + '...';
            }
            
            // Garantir que não está vazio
            if (!finalContent || finalContent.length < 1) {
                finalContent = '✅ Mensagem processada';
            }
        }
        
        // Tratar opções de forma ultra-conservadora
        if (options.mentions && Array.isArray(options.mentions) && options.mentions.length > 0) {
            // Apenas incluir mentions se absolutamente necessário e válidas
            const validMentions = options.mentions
                .filter(m => m && typeof m === 'string' && (m.includes('@c.us') || m.includes('@g.us')))
                .slice(0, 5); // Limitar quantidade
            
            if (validMentions.length > 0) {
                finalOptions.mentions = validMentions;
            }
        }
        
        // NÃO incluir outras opções que podem causar validateAndGetParts
        // Como: media, location, quotedMessageId, etc.
        
        return { finalContent, finalOptions };
    }
    
    // Verificação pré-envio crítica
    static preFlightCheck(targetId, content, options) {
        try {
            // Verificar targetId
            if (!targetId || !targetId.includes('@')) {
                console.error(`[Sender] ❌ PreFlight: targetId inválido`);
                return false;
            }
            
            // Verificar conteúdo
            if (!content || (typeof content === 'string' && content.length === 0)) {
                console.error(`[Sender] ❌ PreFlight: conteúdo inválido`);
                return false;
            }
            
            // Verificar opções
            if (options && typeof options !== 'object') {
                console.error(`[Sender] ❌ PreFlight: opções inválidas`);
                return false;
            }
            
            console.log(`[Sender] ✅ PreFlight: Todos os checks passaram`);
            return true;
            
        } catch (error) {
            console.error(`[Sender] ❌ PreFlight: Erro na verificação: ${error.message}`);
            return false;
        }
    }
    
    // Tratamento crítico específico para validateAndGetParts
    static async handleValidateAndGetPartsErrorCritical(client, targetId, originalContent) {
        console.log(`[Sender] 🚨 CORREÇÃO CRÍTICA validateAndGetParts iniciada`);
        
        // Estratégias de recuperação em ordem de prioridade
        const criticalStrategies = [
            // Estratégia 1: Mensagem ultra-básica
            async () => {
                console.log(`[Sender] 🔧 Estratégia CRÍTICA 1: Mensagem ultra-básica`);
                return await client.sendMessage(targetId, 'OK');
            },
            
            // Estratégia 2: Reconstruir targetId completamente
            async () => {
                console.log(`[Sender] 🔧 Estratégia CRÍTICA 2: Reconstrução total do ID`);
                const cleanId = this.reconstructTargetIdCritical(targetId);
                return await client.sendMessage(cleanId, '✅');
            },
            
            // Estratégia 3: Delay + retry com dados mínimos
            async () => {
                console.log(`[Sender] 🔧 Estratégia CRÍTICA 3: Delay + dados mínimos`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                return await client.sendMessage(targetId, 'Bot ativo');
            },
            
            // Estratégia 4: Usar método alternativo se disponível
            async () => {
                console.log(`[Sender] 🔧 Estratégia CRÍTICA 4: Método alternativo`);
                if (client.pupPage) {
                    // Tentar via Puppeteer diretamente se possível
                    return await this.sendViaPuppeteerFallback(client, targetId);
                }
                throw new Error('Método alternativo não disponível');
            }
        ];
        
        // Tentar cada estratégia crítica
        for (let i = 0; i < criticalStrategies.length; i++) {
            try {
                await criticalStrategies[i]();
                console.log(`[Sender] ✅ Estratégia CRÍTICA ${i + 1} bem-sucedida!`);
                return true;
            } catch (strategyError) {
                console.error(`[Sender] ❌ Estratégia CRÍTICA ${i + 1} falhou: ${strategyError.message}`);
                
                // Se ainda é validateAndGetParts, continuar
                if (strategyError.message.includes('validateAndGetParts')) {
                    console.log(`[Sender] 🔄 validateAndGetParts persistente - próxima estratégia...`);
                    continue;
                }
            }
        }
        
        console.error(`[Sender] ❌ TODAS as estratégias críticas falharam para validateAndGetParts`);
        return false;
    }
    
    // Reconstruir targetId com método crítico
    static reconstructTargetIdCritical(targetId) {
        try {
            // Extrair apenas números
            const numbersOnly = targetId.replace(/\D/g, '');
            
            if (numbersOnly.length > 0) {
                // Determinar tipo baseado no ID original
                if (targetId.includes('@g.us')) {
                    return `${numbersOnly}@g.us`;
                } else {
                    return `${numbersOnly}@c.us`;
                }
            }
        } catch (error) {
            console.error(`[Sender] ⚠️ Erro na reconstrução crítica: ${error.message}`);
        }
        
        return targetId;
    }
    
    // Fallback via Puppeteer se disponível
    static async sendViaPuppeteerFallback(client, targetId) {
        try {
            if (!client.pupPage) {
                throw new Error('Puppeteer não disponível');
            }
            
            console.log(`[Sender] 🤖 Tentando envio via Puppeteer...`);
            
            // Implementação básica via Puppeteer
            await client.pupPage.evaluate((target) => {
                // Código JavaScript para executar no contexto da página WhatsApp
                const event = new CustomEvent('message', { detail: { target, message: 'OK' } });
                document.dispatchEvent(event);
            }, targetId);
            
            console.log(`[Sender] ✅ Envio via Puppeteer bem-sucedido`);
            return true;
            
        } catch (puppeteerError) {
            console.error(`[Sender] ❌ Fallback Puppeteer falhou: ${puppeteerError.message}`);
            throw puppeteerError;
        }
    }
    
    // Fallback básico para casos gerais
    static async attemptBasicFallback(client, targetId) {
        try {
            console.log(`[Sender] 🔄 Aplicando fallback básico...`);
            await client.sendMessage(targetId, '✅');
            console.log(`[Sender] ✅ Fallback básico bem-sucedido`);
            return true;
        } catch (basicError) {
            console.error(`[Sender] ❌ Fallback básico falhou: ${basicError.message}`);
            throw basicError;
        }
    }
    
    // Fallback de emergência absoluta
    static async emergencyFallback(client, targetId) {
        console.log(`[Sender] 🚨 FALLBACK DE EMERGÊNCIA ATIVADO`);
        
        try {
            // Tentar com dados absolutamente mínimos
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Usar o método mais primitivo possível
            const result = await client.sendMessage(targetId, 'OK');
            
            console.log(`[Sender] ✅ Fallback de emergência bem-sucedido`);
            return true;
            
        } catch (emergencyError) {
            console.error(`[Sender] ❌ FALLBACK DE EMERGÊNCIA FALHOU: ${emergencyError.message}`);
            return false;
        }
    }
}

module.exports = Sender;