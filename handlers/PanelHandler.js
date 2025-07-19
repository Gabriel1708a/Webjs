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
            console.error('[PanelHandler] Erro Crítico: Cliente do WhatsApp não está disponível via Sender.');
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
            let groupChat;
            let inviteCode = group_link;

            if (group_link.includes('chat.whatsapp.com/')) {
                inviteCode = group_link.split('chat.whatsapp.com/')[1];
            }

            console.log(`[PanelHandler] Tentando entrar no grupo com o código: ${inviteCode}`);
            const groupId = await this.client.acceptInvite(inviteCode);
            console.log(`[PanelHandler] Bot entrou no grupo com sucesso. ID do Grupo: ${groupId}`);
            
            groupChat = await this.client.getChatById(groupId);
            
            const groupData = {
                user_id: user_id,
                group_id: groupChat.id._serialized,
                name: groupChat.name,
                is_active: true
            };

            console.log('[PanelHandler] Enviando confirmação para o painel Laravel...');
            await axios.post('https://painel.botwpp.tech/api/groups/confirm', groupData);

            return res.status(200).json({ success: true, message: 'Bot entrou no grupo e dados foram confirmados.' });

        } catch (error) {
            console.error('[PanelHandler] Erro ao tentar entrar no grupo:', error.message);
            if (error.message.includes('already in group')) {
                 return res.status(400).json({ success: false, message: 'O bot já está neste grupo.' });
            }
            return res.status(500).json({ success: false, message: 'Ocorreu um erro no bot ao tentar entrar no grupo.' });
        }
    }
}

module.exports = PanelHandler;