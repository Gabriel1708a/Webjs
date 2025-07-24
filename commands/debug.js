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
                
            case 'fixpanel':
                await this.fixPanelConfig(message, groupId);
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

    static async fixPanelConfig(message, groupId) {
        try {
            await message.reply('🔧 **Tentando corrigir configuração do painel...**\n\n⏳ Aguarde...');
            
            // Simular entrada no grupo para forçar salvamento do panel_user_id
            const chat = await message.getChat();
            const groupName = chat.name || 'Grupo sem nome';
            
            // Dados do grupo para enviar ao painel
            const groupData = {
                group_id: groupId,
                name: groupName,
                icon_url: null,
                is_active: true,
                expires_at: null
            };
            
            // Enviar confirmação ao painel
            const axios = require('axios');
            const config = require('../config.json');
            
            const response = await axios.post('https://painel.botwpp.tech/api/groups/confirm', groupData, {
                timeout: 10000,
                headers: {
                    'Authorization': `Bearer ${config.laravelApi?.token || 'teste'}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`[DEBUG-FIX] Resposta do painel:`, JSON.stringify(response.data, null, 2));
            
            // Tentar extrair panel_user_id da resposta
            let panelUserId = null;
            if (response.data) {
                if (response.data.data && response.data.data.panel_user_id) {
                    panelUserId = response.data.data.panel_user_id;
                } else if (response.data.panel_user_id) {
                    panelUserId = response.data.panel_user_id;
                } else if (response.data.user_id) {
                    panelUserId = response.data.user_id;
                }
            }
            
            if (panelUserId) {
                // Salvar o panel_user_id
                await DataManager.saveConfig(groupId, 'panel_user_id', panelUserId);
                
                await message.reply(`✅ **Configuração corrigida!**\n\n🎯 **panel_user_id:** ${panelUserId}\n\n💡 Agora você pode usar !addads normalmente.`);
            } else {
                await message.reply(`❌ **Não foi possível obter panel_user_id**\n\n🔍 **Resposta do painel:**\n\`\`\`${JSON.stringify(response.data, null, 2)}\`\`\`\n\n💡 Entre em contato com o suporte do painel.`);
            }
            
        } catch (error) {
            console.error('[DEBUG-FIX] Erro ao corrigir configuração:', error);
            await message.reply(`❌ **Erro ao corrigir configuração**\n\n🔍 **Erro:** ${error.message}\n\n💡 Verifique se o painel está online.`);
        }
    }
}

module.exports = DebugHandler;