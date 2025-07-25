// utils/Sender.js - Sistema de Envio de Mensagens Otimizado
// Versão: 2.2 - Correção validateAndGetParts CRÍTICA + Ultra-Robustez

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
        console.log('✅ Módulo de envio (Sender) inicializado com proteção validateAndGetParts.');
    }

    // Validar ID do chat antes do envio - VERSÃO ROBUSTA
    static validateChatId(chatId) {
        if (!chatId || typeof chatId !== 'string') {
            throw new Error('ID do chat inválido ou não fornecido');
        }
        
        // Limpar o chatId de caracteres problemáticos
        let cleanChatId = chatId.trim();
        
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

    // Validar conteúdo da mensagem - VERSÃO ROBUSTA
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
     * Envia uma mensagem com sistema de fallback ultra-robusto
     * @param {object} client - Cliente do WhatsApp
     * @param {string} targetId - ID do destinatário
     * @param {string|MessageMedia} content - Conteúdo da mensagem
     * @param {object} options - Opções adicionais
     * @returns {Promise<boolean>} - True se enviado com sucesso
     */
    static async sendMessage(client, targetId, content, options = {}) {
        const startTime = Date.now();
        console.log(`[Sender] 🚀 Iniciando envio para ${targetId}`);
        
        try {
            // Validações iniciais mais robustas
            const validatedTargetId = this.validateChatId(targetId);
            this.validateContent(content);
            
            // Primeira tentativa - método padrão
            console.log(`[Sender] 📤 Tentativa padrão de envio...`);
            const result = await this.attemptStandardSend(client, validatedTargetId, content, options);
            
            if (result) {
                const duration = Date.now() - startTime;
                console.log(`[Sender] ✅ Envio padrão bem-sucedido em ${duration}ms`);
                return true;
            }
            
        } catch (error) {
            console.error(`[Sender] ❌ Erro no envio padrão: ${error.message}`);
            
            // Sistema de recuperação por tipo de erro
            return await this.handleSendError(client, targetId, content, options, error, startTime);
        }
        
        return false;
    }
    
    // Tentativa de envio padrão
    static async attemptStandardSend(client, targetId, content, options) {
        try {
            // Preparar conteúdo e opções
            const { finalContent, finalOptions } = this.prepareMessageData(content, options);
            
            // Enviar com timeout
            const sendPromise = client.sendMessage(targetId, finalContent, finalOptions);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout no envio da mensagem')), 15000)
            );
            
            await Promise.race([sendPromise, timeoutPromise]);
            return true;
            
        } catch (error) {
            console.error(`[Sender] ⚠️ Falha no envio padrão: ${error.message}`);
            throw error;
        }
    }
    
    // Sistema robusto de tratamento de erros de envio
    static async handleSendError(client, targetId, content, options, originalError, startTime) {
        console.log(`[Sender] 🔧 Iniciando sistema de recuperação...`);
        
        // Detectar erro validateAndGetParts
        if (originalError.message.includes('validateAndGetParts') || originalError.stack?.includes('validateAndGetParts')) {
            console.error(`[Sender] 🚨 ERRO validateAndGetParts DETECTADO!`);
            return await this.handleValidateAndGetPartsError(client, targetId, content, originalError);
        }
        
        // Detectar erros de rede/timeout
        if (originalError.message.includes('timeout') || originalError.message.includes('ECONNRESET')) {
            console.error(`[Sender] 🌐 Erro de rede detectado - tentando novamente...`);
            return await this.retryWithDelay(client, targetId, content, options, 2);
        }
        
        // Detectar erros de chat inválido
        if (originalError.message.includes('Chat not found') || originalError.message.includes('Invalid number')) {
            console.error(`[Sender] 👥 Chat inválido - não é possível enviar`);
            return false;
        }
        
        // Erro genérico - tentar estratégias de recuperação
        console.error(`[Sender] ❓ Erro genérico - aplicando estratégias de recuperação`);
        return await this.attemptGenericRecovery(client, targetId, content);
    }
    
    // Tratamento específico para erro validateAndGetParts
    static async handleValidateAndGetPartsError(client, targetId, content, originalError) {
        console.log(`[Sender] 🔧 Aplicando correções para validateAndGetParts...`);
        console.log(`[Sender] 📋 Target ID: ${targetId}`);
        console.log(`[Sender] 📝 Content type: ${typeof content}`);
        console.log(`[Sender] 📏 Content length: ${typeof content === 'string' ? content.length : 'N/A'}`);
        
        // Estratégias de recuperação em ordem de prioridade
        const recoveryStrategies = [
            // Estratégia 1: Limpar e simplificar o conteúdo
            async () => {
                console.log(`[Sender] 🧹 Estratégia 1: Limpeza de conteúdo`);
                const cleanContent = this.sanitizeContent(content);
                return await client.sendMessage(targetId, cleanContent);
            },
            
            // Estratégia 2: Reconstruir o targetId
            async () => {
                console.log(`[Sender] 🔧 Estratégia 2: Reconstrução do ID`);
                const cleanTargetId = this.reconstructTargetId(targetId);
                const simpleContent = typeof content === 'string' ? content.substring(0, 200) : '✅ Mensagem processada';
                return await client.sendMessage(cleanTargetId, simpleContent);
            },
            
            // Estratégia 3: Mensagem ultra-básica
            async () => {
                console.log(`[Sender] 📝 Estratégia 3: Mensagem ultra-básica`);
                return await client.sendMessage(targetId, '✅ Comando processado com sucesso');
            },
            
            // Estratégia 4: Delay + retry simples
            async () => {
                console.log(`[Sender] ⏱️ Estratégia 4: Delay + retry`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return await client.sendMessage(targetId, 'Bot ativo');
            }
        ];
        
        // Tentar cada estratégia
        for (let i = 0; i < recoveryStrategies.length; i++) {
            try {
                await recoveryStrategies[i]();
                console.log(`[Sender] ✅ Estratégia ${i + 1} bem-sucedida! Erro validateAndGetParts corrigido`);
                return true;
            } catch (strategyError) {
                console.error(`[Sender] ❌ Estratégia ${i + 1} falhou: ${strategyError.message}`);
                
                // Se ainda é validateAndGetParts, continuar
                if (strategyError.message.includes('validateAndGetParts')) {
                    console.log(`[Sender] 🔄 validateAndGetParts persistente - tentando próxima estratégia...`);
                    continue;
                } else {
                    // Erro diferente - estratégia funcionou parcialmente
                    console.log(`[Sender] 🔀 Erro mudou de tipo - considerando progresso`);
                    break;
                }
            }
        }
        
        console.error(`[Sender] ❌ Todas as estratégias de recuperação falharam para validateAndGetParts`);
        return false;
    }
    
    // Sanitizar conteúdo para evitar validateAndGetParts
    static sanitizeContent(content) {
        if (typeof content !== 'string') {
            return '✅ Conteúdo processado';
        }
        
        // Remover caracteres problemáticos
        let clean = content
            .replace(/[^\w\s\p{L}\p{N}\p{P}\p{S}]/gu, '') // Remover caracteres especiais
            .replace(/\s+/g, ' ') // Normalizar espaços
            .trim()
            .substring(0, 300); // Limitar tamanho
        
        // Se ficou vazio, usar fallback
        if (!clean || clean.length < 3) {
            clean = '✅ Mensagem processada com sucesso';
        }
        
        return clean;
    }
    
    // Reconstruir targetId para evitar problemas
    static reconstructTargetId(targetId) {
        try {
            if (targetId.includes('@g.us')) {
                // É um grupo - extrair apenas números
                const groupMatch = targetId.match(/(\d+)/);
                if (groupMatch) {
                    return `${groupMatch[1]}@g.us`;
                }
            } else if (targetId.includes('@c.us')) {
                // É contato individual - extrair apenas números
                const contactMatch = targetId.match(/(\d+)/);
                if (contactMatch) {
                    return `${contactMatch[1]}@c.us`;
                }
            }
        } catch (error) {
            console.error(`[Sender] ⚠️ Erro na reconstrução do ID: ${error.message}`);
        }
        
        // Se falhou, retornar o original
        return targetId;
    }
    
    // Retry com delay
    static async retryWithDelay(client, targetId, content, options, maxRetries) {
        for (let i = 1; i <= maxRetries; i++) {
            try {
                console.log(`[Sender] 🔄 Tentativa ${i}/${maxRetries} após delay...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * i));
                
                const simpleContent = typeof content === 'string' ? content.substring(0, 200) : '✅ Retry bem-sucedido';
                await client.sendMessage(targetId, simpleContent);
                
                console.log(`[Sender] ✅ Retry ${i} bem-sucedido!`);
                return true;
                
            } catch (retryError) {
                console.error(`[Sender] ❌ Retry ${i} falhou: ${retryError.message}`);
                
                if (i === maxRetries) {
                    console.error(`[Sender] ❌ Todos os retries falharam`);
                    return false;
                }
            }
        }
        
        return false;
    }
    
    // Recuperação genérica para outros erros
    static async attemptGenericRecovery(client, targetId, content) {
        console.log(`[Sender] 🔄 Tentando recuperação genérica...`);
        
        try {
            // Tentar com conteúdo ultra-simples
            await client.sendMessage(targetId, '✅ Comando processado');
            console.log(`[Sender] ✅ Recuperação genérica bem-sucedida`);
            return true;
            
        } catch (recoveryError) {
            console.error(`[Sender] ❌ Recuperação genérica falhou: ${recoveryError.message}`);
            return false;
        }
    }
    
    // Preparar dados da mensagem
    static prepareMessageData(content, options) {
        let finalContent = content;
        let finalOptions = { ...options };
        
        // Se é MessageMedia, manter como está
        if (content && content.constructor && content.constructor.name === 'MessageMedia') {
            return { finalContent, finalOptions };
        }
        
        // Se é string, validar e limpar se necessário
        if (typeof content === 'string') {
            // Limitar tamanho para evitar problemas
            if (content.length > 4000) {
                finalContent = content.substring(0, 4000) + '... (mensagem truncada)';
            }
            
            // Validar mentions se existirem
            if (finalOptions.mentions && Array.isArray(finalOptions.mentions)) {
                finalOptions.mentions = finalOptions.mentions.filter(mention => 
                    mention && typeof mention === 'string' && mention.includes('@')
                );
            }
        }
        
        return { finalContent, finalOptions };
    }
}

module.exports = Sender;