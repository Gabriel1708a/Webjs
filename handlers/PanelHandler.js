const express = require('express');
const axios = require('axios');

class PanelHandler {
    static client; // Referência ao cliente do WhatsApp
    static laravelApiConfig; // Configurações da API do Laravel

    /**
     * Inicializa o handler com o cliente e as configurações.
     * @param {object} waClient - O cliente do whatsapp-web.js.
     * @param {object} config - O objeto de configuração com os dados da API Laravel.
     */
    static initialize(waClient, config) {
        this.client = waClient;
        this.laravelApiConfig = config.laravelApi;

        const app = express();
        app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

        // Configurações do servidor (pode ser alterado no config.json)
        const PORT = config.panelHandler?.port || 3000;
        const HOST = config.panelHandler?.host || '0.0.0.0';

        // Rota para receber a solicitação de entrar em um grupo
        app.post('/join-group', this.handleJoinGroupRequest.bind(this));

        app.listen(PORT, HOST, () => {
            console.log(`🤖 Servidor do Bot escutando na porta ${PORT}`);
            console.log(`   - Host: ${HOST}`);
            console.log(`   - Endpoint para entrar em grupos: http://${HOST}:${PORT}/join-group`);
        });
    }

    /**
     * Lida com a requisição vinda do painel Laravel.
     */
    static async handleJoinGroupRequest(req, res) {
        const { group_link, user_id } = req.body;

        if (!group_link || !user_id) {
            return res.status(400).json({ success: false, message: 'group_link e user_id são obrigatórios.' });
        }

        console.log(`[PanelHandler] Recebida solicitação para entrar no grupo: ${group_link} para o usuário ID: ${user_id}`);

        try {
            // Extrai o código do convite do link
            const inviteCode = group_link.split('https://chat.whatsapp.com/')[1];
            if (!inviteCode) {
                throw new Error('Link de convite inválido.');
            }

            // Entra no grupo usando o código
            const groupId = await this.client.acceptInvite(inviteCode);
            console.log(`[PanelHandler] Bot entrou no grupo com sucesso! ID: ${groupId}`);

            // Aguarda um pouco para o chat ser totalmente carregado
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Pega os detalhes do grupo
            const chat = await this.client.getChatById(groupId);
            const groupName = chat.name;
            const groupIconUrl = await chat.getProfilePicUrl() || null;

            // Envia a confirmação para a API do Laravel
            await this.confirmGroupInPanel(user_id, groupId, groupName, groupIconUrl);

            // Responde ao painel Laravel que a operação foi um sucesso
            res.status(200).json({ success: true, message: 'Bot entrou no grupo e confirmou no painel.', groupId: groupId });

        } catch (error) {
            console.error('[PanelHandler] Erro ao tentar entrar no grupo:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Envia os dados do grupo para a API do Laravel para confirmar o cadastro.
     */
    static async confirmGroupInPanel(userId, groupId, groupName, groupIconUrl) {
        const url = `${this.laravelApiConfig.baseUrl}/groups/confirm`;
        const token = this.laravelApiConfig.token;

        const payload = {
            user_id: userId,
            group_id: groupId,
            name: groupName,
            icon_url: groupIconUrl,
        };

        try {
            console.log(`[PanelHandler] Enviando confirmação para o painel Laravel:`, payload);
            await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            console.log(`[PanelHandler] Confirmação enviada com sucesso para o painel.`);
        } catch (error) {
            console.error('[PanelHandler] Erro ao enviar confirmação para o painel:', error.response?.data || error.message);
        }
    }
}

module.exports = PanelHandler;