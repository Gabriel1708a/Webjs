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
            return res.status(400).json({ success: false, message: 'group_link e user_id são obrigatórios.' });
        }

        try {
            if (!this.client || !await this.isClientReady()) {
                throw new Error('Cliente WhatsApp não está pronto');
            }

            const inviteCode = this.extractInviteCode(group_link);
            console.log(`[PanelHandler] Código de convite extraído: ${inviteCode}`);

            let groupChat = await this.processGroupJoin(inviteCode);
            
            // --- LÓGICA NOVA E ROBUSTA PARA OBTER O NOME ---
            let groupName = groupChat.name;

            // Se o nome não veio na primeira tentativa, vamos forçar um "reload" dos dados.
            if (!groupName) {
                console.warn('[PanelHandler] Nome do grupo veio como undefined. Tentando recarregar os dados do chat...');
                try {
                    // O método .reload() foi feito para isso, mas pode não ser 100% confiável.
                    await groupChat.reload(); 
                    groupName = groupChat.name; // Tenta pegar o nome de novo
                    console.log(`[PanelHandler] DEBUG: Nome após reload: ${groupName}`);
                } catch (reloadError) {
                    console.error('[PanelHandler] Erro ao tentar recarregar o chat:', reloadError.message);
                }
            }

            // --- PLANO B (FALLBACK) ---
            // Se, mesmo depois de tudo, o nome ainda não existir, usamos um nome padrão.
            if (!groupName) {
                console.warn(`[PanelHandler] ⚠️ Nome ainda não disponível, usando fallback. ID do Grupo: ${groupChat.id._serialized}`);
                groupName = `Grupo ${groupChat.id.user}`; // Ex: "Grupo 12036329..."
            }
            // --- FIM DA NOVA LÓGICA ---

            const groupData = {
                user_id: user_id,
                group_id: groupChat.id._serialized,
                name: groupName, // Usamos a variável segura que SEMPRE terá um valor
                is_active: true,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            console.log('[PanelHandler] Enviando confirmação para o painel Laravel com os dados:', groupData);
            await this.sendConfirmationToPanel(groupData);

            const processingTime = Date.now() - startTime;
            console.log(`[PanelHandler] ✅ Processamento concluído em ${processingTime}ms`);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Grupo processado com sucesso.',
                group_name: groupName,
                group_id: groupChat.id._serialized,
                processing_time_ms: processingTime
            });

        } catch (error) {
            console.error('[PanelHandler] Erro no processamento do grupo:', error);
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
        console.log(`[PanelHandler] Processando entrada no grupo (Lógica Yara): ${inviteCode}`);
        
        try {
            // Passo 1: Tenta entrar no grupo diretamente.
            // O resultado de acceptInvite é o ID do grupo.
            const groupId = await this.client.acceptInvite(inviteCode);
            console.log(`[PanelHandler] ✅ Bot entrou no grupo com sucesso! ID: ${groupId}`);
            
            // Passo 2: Aguarda um pequeno instante para a sincronização inicial.
            // Este delay é uma garantia extra.
            await this.delay(2000); // Espera 2 segundos.

            // Passo 3: Busca os detalhes do chat usando o ID obtido.
            const groupChat = await this.client.getChatById(groupId);
            
            // Se, mesmo assim, o nome não vier, usamos nosso fallback.
            if (!groupChat.name) {
                console.warn(`[PanelHandler] Nome não obtido após entrada. Usando fallback. Chat:`, groupChat);
                groupChat.name = `Grupo ${groupChat.id.user}`;
            }
            
            return groupChat;

        } catch (error) {
            // Se o erro for "já é membro", precisamos tratar isso.
            if (error.message.includes('already') || error.message.includes('member')) {
                console.warn(`[PanelHandler] Bot já era membro. Tentando obter informações do convite para pegar o ID.`);
                
                // Se já somos membros, não temos o ID. Precisamos obtê-lo pelo código do convite.
                const inviteInfo = await this.client.getInviteInfo(inviteCode);
                if (inviteInfo && inviteInfo.id) {
                    const groupId = inviteInfo.id._serialized;
                    console.log(`[PanelHandler] ID do grupo existente obtido: ${groupId}`);
                    const groupChat = await this.client.getChatById(groupId);

                    // Aplica o fallback se necessário
                    if (!groupChat.name) {
                        console.warn(`[PanelHandler] Nome não obtido para grupo existente. Usando fallback.`);
                        groupChat.name = `Grupo ${groupChat.id.user}`;
                    }
                    return groupChat;
                } else {
                    throw new Error('Já era membro, mas falhou ao obter o ID do grupo pelo convite.');
                }
            }
            
            // Se for outro tipo de erro, nós o relançamos.
            console.error(`[PanelHandler] Erro ao processar entrada no grupo:`, error);
            throw error;
        }
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