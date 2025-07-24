const { DataManager, Utils } = require('../index');

class DebugHandler {
    static async handle(client, message, command, args) {
        const groupId = message.from;

        // Verificar se é admin
        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem usar comandos de debug.');
            return;
        }

        switch (command) {
            case 'checkpanel':
                await this.checkPanelConfig(message, groupId);
                break;
        }
    }

    static async checkPanelConfig(message, groupId) {
        try {
            const groupConfig = await DataManager.loadConfig(groupId);
            
            let response = `🔍 **DEBUG - Configuração do Painel**\n\n`;
            response += `📱 **Grupo ID:** ${groupId}\n\n`;
            
            if (!groupConfig || Object.keys(groupConfig).length === 0) {
                response += `❌ **Status:** Nenhuma configuração encontrada\n`;
                response += `💡 **Ação:** Execute !syncpanel para sincronizar com o painel`;
            } else {
                response += `✅ **Status:** Configuração encontrada\n\n`;
                response += `🔧 **Configurações:**\n`;
                
                if (groupConfig.panel_user_id) {
                    response += `✅ **panel_user_id:** ${groupConfig.panel_user_id}\n`;
                } else {
                    response += `❌ **panel_user_id:** Não encontrado\n`;
                }
                
                // Mostrar outras configurações importantes
                const importantKeys = ['soadm', 'boasVindas', 'autoResposta', 'antiLink'];
                importantKeys.forEach(key => {
                    if (groupConfig[key] !== undefined) {
                        response += `📋 **${key}:** ${JSON.stringify(groupConfig[key])}\n`;
                    }
                });
                
                // Mostrar total de configurações
                response += `\n📊 **Total de configurações:** ${Object.keys(groupConfig).length}`;
            }
            
            await message.reply(response);
            
        } catch (error) {
            console.error('[DEBUG] Erro ao verificar configuração do painel:', error);
            await message.reply('❌ Erro ao verificar configuração do painel.');
        }
    }
}

module.exports = DebugHandler;