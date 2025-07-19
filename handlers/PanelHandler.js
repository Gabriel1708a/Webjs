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
        console.log(`[PanelHandler] Recebida solicitação para grupo: ${group_link} | Usuário ID: ${user_id}`);

        if (!group_link || !user_id) {
            return res.status(400).json({ success: false, message: 'group_link e user_id são obrigatórios.' });
        }

        try {
            let inviteCode = group_link;
            if (group_link.includes('chat.whatsapp.com/')) {
                inviteCode = group_link.split('chat.whatsapp.com/')[1];
            }

            // --- LÓGICA MELHORADA ---
            let groupChat;
            try {
                console.log(`[PanelHandler] Tentando entrar no grupo com o código: ${inviteCode}`);
                const groupId = await this.client.acceptInvite(inviteCode);
                console.log(`[PanelHandler] Bot entrou no grupo com sucesso. ID do Grupo: ${groupId}`);
                groupChat = await this.client.getChatById(groupId);
            } catch (e) {
                // Se o erro for "Evaluation failed", pode ser que o bot já esteja no grupo.
                // Vamos tentar pegar as informações do grupo pelo código de convite.
                console.warn(`[PanelHandler] Falha ao entrar no grupo (pode já ser membro). Tentando obter dados do convite...`);
                const inviteInfo = await this.client.getInviteInfo(inviteCode);
                if (inviteInfo && inviteInfo.id) {
                    console.log(`[PanelHandler] Informações do grupo obtidas com sucesso pelo convite. ID: ${inviteInfo.id._serialized}`);
                    groupChat = await this.client.getChatById(inviteInfo.id._serialized);
                } else {
                    // Se mesmo assim não conseguir, o link é inválido.
                    throw new Error('Link de convite inválido ou expirado.');
                }
            }
            // -------------------------

            const groupData = {
                user_id: user_id,
                group_id: groupChat.id._serialized,
                name: groupChat.name,
                is_active: true,
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Vencimento em 30 dias
            };

            console.log('[PanelHandler] Enviando confirmação para o painel Laravel...');
            await axios.post('http://painel.botwpp.tech/api/groups/confirm', groupData);

            return res.status(200).json({ success: true, message: 'Grupo processado com sucesso.' });

        } catch (error) {
            console.error('[PanelHandler] Erro final no processamento do grupo:', error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = PanelHandler;
