// handlers/PanelHandler.js

const express = require('express');
const axios = require('axios');
const Sender = require('../Sender');

class PanelHandler {
    static client;
    static app;

    static initialize() {
        this.client = Sender.client;
        if (!this.client) {
            console.error('[PanelHandler] Erro Crítico: Cliente do WhatsApp não está disponível.');
            return;
        }
        this.app = express();
        this.app.use(express.json());
        const port = 3000;
        this.app.post('/join-group', this.handleJoinGroupRequest.bind(this));
        this.app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Servidor do painel inicializado. Escutando na porta ${port}.`);
        });
    }

    static async handleJoinGroupRequest(req, res) {
        const { group_link, user_id } = req.body;
        const startTime = Date.now();
        console.log(`[PanelHandler] 🚀 Recebida solicitação para grupo: ${group_link} | Usuário ID: ${user_id}`);

        if (!group_link || !user_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'group_link e user_id são obrigatórios.' 
            });
        }

        try {
            // Validar se o cliente está pronto
            if (!this.client || !await this.isClientReady()) {
                throw new Error('Cliente WhatsApp não está pronto');
            }

            let inviteCode = this.extractInviteCode(group_link);
            console.log(`[PanelHandler] Código de convite extraído: ${inviteCode}`);

            const groupChat = await this.processGroupJoin(inviteCode);
            
            const groupData = {
                user_id: user_id,
                group_id: groupChat.id._serialized,
                name: groupChat.name,
                is_active: true,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            console.log('[PanelHandler] Enviando confirmação para o painel Laravel...');
            await this.sendConfirmationToPanel(groupData);

            const processingTime = Date.now() - startTime;
            console.log(`[PanelHandler] ⚡ Processamento concluído em ${processingTime}ms`);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Grupo processado com sucesso.',
                group_name: groupChat.name,
                group_id: groupChat.id._serialized,
                processing_time_ms: processingTime
            });

        } catch (error) {
            console.error('[PanelHandler] Erro no processamento do grupo:', error);
            
            // Determinar o tipo de erro e resposta apropriada
            const errorResponse = this.getErrorResponse(error);
            return res.status(errorResponse.status).json({
                success: false,
                message: errorResponse.message,
                error_type: errorResponse.type
            });
        }
    }

    static extractInviteCode(groupLink) {
        if (!groupLink) throw new Error('Link do grupo não fornecido');
        
        let inviteCode = groupLink.trim();
        
        // Remover https://
        if (inviteCode.startsWith('https://')) {
            inviteCode = inviteCode.substring(8);
        }
        
        // Extrair código do chat.whatsapp.com
        if (inviteCode.includes('chat.whatsapp.com/')) {
            inviteCode = inviteCode.split('chat.whatsapp.com/')[1];
        }

        // Remover parâmetros extras da URL
        if (inviteCode.includes('?')) {
            inviteCode = inviteCode.split('?')[0];
        }

        if (!inviteCode || inviteCode.length < 10) {
            throw new Error('Código de convite inválido');
        }

        return inviteCode;
    }

    static async processGroupJoin(inviteCode) {
        console.log(`[PanelHandler] Processando entrada no grupo: ${inviteCode}`);
        
        // Primeira tentativa: verificar se já está no grupo
        try {
            console.log(`[PanelHandler] Verificando informações do convite...`);
            const inviteInfo = await this.client.getInviteInfo(inviteCode);
            
            if (!inviteInfo || !inviteInfo.id) {
                throw new Error('Link de convite inválido ou expirado');
            }

            console.log(`[PanelHandler] Informações do convite obtidas: ${inviteInfo.title || 'Sem nome'}`);
            
            // Verificar se já está no grupo
            try {
                const existingChat = await this.client.getChatById(inviteInfo.id._serialized);
                if (existingChat) {
                    console.log(`[PanelHandler] Bot já é membro do grupo: ${existingChat.name}`);
                    return existingChat;
                }
            } catch (chatError) {
                console.log(`[PanelHandler] Bot não é membro do grupo, tentando entrar...`);
            }

            // Tentar entrar no grupo
            return await this.attemptGroupJoin(inviteCode, inviteInfo);

        } catch (error) {
            console.error(`[PanelHandler] Erro ao processar grupo:`, error);
            throw error;
        }
    }

    static async attemptGroupJoin(inviteCode, inviteInfo) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[PanelHandler] Tentativa ${attempt}/${maxRetries} de entrar no grupo...`);
                
                // Aguardar um pouco entre tentativas
                if (attempt > 1) {
                    await this.delay(2000 * attempt);
                }

                const groupId = await this.client.acceptInvite(inviteCode);
                console.log(`[PanelHandler] ✅ Bot entrou no grupo com sucesso! ID: ${groupId}`);
                
                // Aguardar um momento para o WhatsApp processar
                await this.delay(1000);
                
                const groupChat = await this.client.getChatById(groupId);
                return groupChat;

            } catch (error) {
                lastError = error;
                console.warn(`[PanelHandler] Tentativa ${attempt} falhou:`, error.message);
                
                // Se for erro de "já é membro", tentar obter o chat diretamente
                if (error.message.includes('already') || error.message.includes('member')) {
                    try {
                        const groupChat = await this.client.getChatById(inviteInfo.id._serialized);
                        console.log(`[PanelHandler] ✅ Bot já era membro do grupo: ${groupChat.name}`);
                        return groupChat;
                    } catch (getChatError) {
                        console.error(`[PanelHandler] Erro ao obter chat existente:`, getChatError.message);
                    }
                }

                // Se for o último retry, lançar o erro
                if (attempt === maxRetries) {
                    break;
                }
            }
        }

        throw new Error(`Falha ao entrar no grupo após ${maxRetries} tentativas: ${lastError?.message}`);
    }

    static async sendConfirmationToPanel(groupData) {
        const maxRetries = 3;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await axios.post('https://painel.botwpp.tech/api/groups/confirm', groupData, {
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'WhatsApp-Bot/1.0'
                    }
                });
                console.log(`[PanelHandler] ✅ Confirmação enviada ao painel com sucesso`);
                return;
            } catch (error) {
                console.warn(`[PanelHandler] Tentativa ${attempt} de envio ao painel falhou:`, error.message);
                if (attempt === maxRetries) {
                    throw new Error(`Falha ao confirmar no painel: ${error.message}`);
                }
                await this.delay(1000 * attempt);
            }
        }
    }

    static getErrorResponse(error) {
        const message = error.message || 'Erro desconhecido';
        
        if (message.includes('Evaluation failed') || message.includes('Protocol error')) {
            return {
                status: 500,
                message: 'Erro interno do WhatsApp Web. Tente novamente em alguns minutos.',
                type: 'WHATSAPP_INTERNAL_ERROR'
            };
        }
        
        if (message.includes('inválido') || message.includes('expirado')) {
            return {
                status: 400,
                message: 'Link de convite inválido ou expirado.',
                type: 'INVALID_INVITE'
            };
        }
        
        if (message.includes('não está pronto') || message.includes('not ready')) {
            return {
                status: 503,
                message: 'Bot não está conectado ao WhatsApp. Tente novamente em alguns minutos.',
                type: 'BOT_NOT_READY'
            };
        }
        
        if (message.includes('painel')) {
            return {
                status: 500,
                message: 'Erro ao confirmar no painel. Grupo pode ter sido adicionado, mas não confirmado.',
                type: 'PANEL_ERROR'
            };
        }
        
        return {
            status: 500,
            message: `Erro inesperado: ${message}`,
            type: 'UNKNOWN_ERROR'
        };
    }

    static async isClientReady() {
        try {
            const state = await this.client.getState();
            return state === 'CONNECTED';
        } catch (error) {
            console.error('[PanelHandler] Erro ao verificar estado do cliente:', error);
            return false;
        }
    }

    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = PanelHandler;