const { DataManager, Utils } = require('../index');
const axios = require('axios');

class SyncStatusHandler {
    static async handle(client, message, command, args) {
        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem verificar status de sincronização.');
            return;
        }

        const groupId = message.from;
        let statusMessage = '🔄 *STATUS DE SINCRONIZAÇÃO*\n\n';

        try {
            // Buscar configurações locais
            const localConfig = await DataManager.loadConfig(groupId);
            statusMessage += '📁 *CONFIGURAÇÕES LOCAIS:*\n';
            statusMessage += `• Anti-Link: ${localConfig.antiLink || 'Desativado'}\n`;
            statusMessage += `• Ban Foto: ${localConfig.banFoto ? 'Ativado' : 'Desativado'}\n`;
            statusMessage += `• Ban Gringo: ${localConfig.banGringo ? 'Ativado' : 'Desativado'}\n\n`;

            // Tentar buscar configurações do painel
            const apiUrl = process.env.PANEL_API_URL || 'https://seupainel.com/api';
            const apiToken = process.env.PANEL_API_TOKEN || 'seu-token-aqui';

            try {
                const response = await axios.get(`${apiUrl}/groups/${groupId}/settings`, {
                    headers: {
                        'Authorization': `Bearer ${apiToken}`,
                        'Accept': 'application/json'
                    },
                    timeout: 5000
                });

                const panelConfig = response.data;
                statusMessage += '🌐 *CONFIGURAÇÕES DO PAINEL:*\n';
                
                // Determinar modo anti-link ativo no painel
                let panelAntiLink = 'Desativado';
                if (panelConfig.ban_extremo == 1) panelAntiLink = 'banextremo';
                else if (panelConfig.ban_link_gp == 1) panelAntiLink = 'banlinkgp';
                else if (panelConfig.anti_link_gp == 1) panelAntiLink = 'antilinkgp';
                else if (panelConfig.anti_link == 1) panelAntiLink = 'antilink';

                statusMessage += `• Anti-Link: ${panelAntiLink}\n`;
                statusMessage += `• Ban Foto: ${panelConfig.ban_foto == 1 ? 'Ativado' : 'Desativado'}\n`;
                statusMessage += `• Ban Gringo: ${panelConfig.ban_gringo == 1 ? 'Ativado' : 'Desativado'}\n\n`;

                // Verificar sincronização
                const localAntiLink = localConfig.antiLink || 'Desativado';
                const localBanFoto = localConfig.banFoto ? 'Ativado' : 'Desativado';
                const localBanGringo = localConfig.banGringo ? 'Ativado' : 'Desativado';
                const panelBanFoto = panelConfig.ban_foto == 1 ? 'Ativado' : 'Desativado';
                const panelBanGringo = panelConfig.ban_gringo == 1 ? 'Ativado' : 'Desativado';

                let syncStatus = '✅ *SINCRONIZADO*';
                if (localAntiLink !== panelAntiLink || localBanFoto !== panelBanFoto || localBanGringo !== panelBanGringo) {
                    syncStatus = '⚠️ *DESSINCRONIZADO*';
                }

                statusMessage += `📊 *STATUS:* ${syncStatus}\n\n`;
                statusMessage += '💡 *SISTEMA HÍBRIDO ATIVO*\n';
                statusMessage += '• Prioridade: Painel Web\n';
                statusMessage += '• Fallback: Configurações Locais\n';
                statusMessage += '• Comandos: Sincronizam ambos';

            } catch (apiError) {
                statusMessage += '🌐 *PAINEL:* ❌ Offline ou inacessível\n\n';
                statusMessage += '📊 *STATUS:* 📁 Usando apenas configurações locais\n\n';
                statusMessage += '💡 *MODO FALLBACK ATIVO*\n';
                statusMessage += '• API do painel indisponível\n';
                statusMessage += '• Usando configurações locais\n';
                statusMessage += '• Comandos salvam localmente';
            }

        } catch (error) {
            statusMessage += `❌ Erro ao verificar status: ${error.message}`;
        }

        await message.reply(statusMessage);
    }
}

module.exports = SyncStatusHandler;
