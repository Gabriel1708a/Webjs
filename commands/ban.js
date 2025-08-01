const { DataManager, Utils } = require('../index');
const axios = require('axios');

/**
 * Busca as configurações de um grupo do painel via API.
 * @param {string} groupId O ID do grupo do WhatsApp
 * @returns {Promise<object>} Configurações do grupo ou objeto vazio se falhar
 */
async function getPanelSettings(groupId) {
    try {
        // ▼▼▼ CONFIGURE SUA URL DO PAINEL AQUI ▼▼▼
        const apiUrl = process.env.PANEL_API_URL || 'https://seupainel.com/api';
        const apiToken = process.env.PANEL_API_TOKEN || 'seu-token-aqui';
        // ▲▲▲ CONFIGURE SUA URL DO PAINEL AQUI ▲▲▲
        
        const response = await axios.get(`${apiUrl}/groups/${groupId}/settings`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json'
            }
        });
        
        console.log(`[API] ✅ Configurações obtidas do painel para grupo ${groupId}`);
        return response.data; // { anti_link: '1', ban_extremo: '1', ... }
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`[API] ℹ️  Grupo ${groupId} não encontrado no painel`);
        } else {
            console.error(`[API] ❌ Erro ao buscar configurações do painel:`, error.message);
        }
        return null; // Retorna null para indicar falha na API
    }
}

/**
 * Converte configurações da API para formato local
 * @param {object} apiConfig Configurações da API
 * @returns {object} Configurações no formato local
 */
function convertApiToLocal(apiConfig) {
    const localConfig = {};
    
    // Mapear as configurações da API para formato local
    if (apiConfig.ban_extremo == 1) {
        localConfig.antiLink = 'banextremo';
    } else if (apiConfig.ban_link_gp == 1) {
        localConfig.antiLink = 'banlinkgp';
    } else if (apiConfig.anti_link_gp == 1) {
        localConfig.antiLink = 'antilinkgp';
    } else if (apiConfig.anti_link == 1) {
        localConfig.antiLink = 'antilink';
    } else {
        localConfig.antiLink = null;
    }
    
    localConfig.banFoto = apiConfig.ban_foto == 1;
    localConfig.banGringo = apiConfig.ban_gringo == 1;
    
    return localConfig;
}

/**
 * Sincroniza configurações locais com o painel
 * @param {string} groupId ID do grupo
 * @param {string} configKey Chave da configuração
 * @param {any} value Valor da configuração
 */
async function syncToPanel(groupId, configKey, value) {
    try {
        const apiUrl = process.env.PANEL_API_URL || 'https://seupainel.com/api';
        const apiToken = process.env.PANEL_API_TOKEN || 'seu-token-aqui';
        
        // Mapear configurações locais para API
        const apiData = {};
        
        if (configKey === 'antiLink') {
            // Resetar todos os anti-link
            apiData.ban_extremo = 0;
            apiData.ban_link_gp = 0;
            apiData.anti_link_gp = 0;
            apiData.anti_link = 0;
            
            // Ativar o específico
            switch (value) {
                case 'banextremo':
                    apiData.ban_extremo = 1;
                    break;
                case 'banlinkgp':
                    apiData.ban_link_gp = 1;
                    break;
                case 'antilinkgp':
                    apiData.anti_link_gp = 1;
                    break;
                case 'antilink':
                    apiData.anti_link = 1;
                    break;
            }
        } else if (configKey === 'banFoto') {
            apiData.ban_foto = value ? 1 : 0;
        } else if (configKey === 'banGringo') {
            apiData.ban_gringo = value ? 1 : 0;
        }
        
        await axios.post(`${apiUrl}/groups/${groupId}/settings`, apiData, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`[SYNC] ✅ Configuração ${configKey} sincronizada com o painel`);
    } catch (error) {
        console.error(`[SYNC] ❌ Erro ao sincronizar com painel:`, error.message);
    }
}

class BanHandler {
    static async handle(client, message, command, args) {
        const groupId = message.from;

        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem usar comandos de moderação.');
            return;
        }

        switch (command) {
            case 'banextremo':
                const statusExtremo = parseInt(args);
                if (statusExtremo === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'banextremo');
                    await syncToPanel(groupId, 'antiLink', 'banextremo');
                    await message.reply('💣 *Anti-Link Extremo ativado!*\n\n🔥 Qualquer link será removido e o usuário banido\n🔄 Sincronizado com painel');
                } else if (statusExtremo === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await syncToPanel(groupId, 'antiLink', null);
                    await message.reply('❌ *Anti-Link Extremo desativado!*\n🔄 Sincronizado com painel');
                } else {
                    await message.reply('❌ Use: !banextremo 1 (ativar) ou !banextremo 0 (desativar)');
                }
                break;

            case 'banlinkgp':
                const statusLinkGp = parseInt(args);
                if (statusLinkGp === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'banlinkgp');
                    await syncToPanel(groupId, 'antiLink', 'banlinkgp');
                    await message.reply('🔗 *Ban Link de Grupo ativado!*\n\n⚠️ Links de grupos WhatsApp serão removidos e usuário banido\n🔄 Sincronizado com painel');
                } else if (statusLinkGp === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await syncToPanel(groupId, 'antiLink', null);
                    await message.reply('❌ *Ban Link de Grupo desativado!*\n🔄 Sincronizado com painel');
                } else {
                    await message.reply('❌ Use: !banlinkgp 1 (ativar) ou !banlinkgp 0 (desativar)');
                }
                break;

            case 'antilinkgp':
                const statusAntiLinkGp = parseInt(args);
                if (statusAntiLinkGp === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'antilinkgp');
                    await syncToPanel(groupId, 'antiLink', 'antilinkgp');
                    await message.reply('🧹 *Anti-Link de Grupo ativado!*\n\n🗑️ Links de grupos serão apenas removidos (sem ban)\n🔄 Sincronizado com painel');
                } else if (statusAntiLinkGp === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await syncToPanel(groupId, 'antiLink', null);
                    await message.reply('❌ *Anti-Link de Grupo desativado!*\n🔄 Sincronizado com painel');
                } else {
                    await message.reply('❌ Use: !antilinkgp 1 (ativar) ou !antilinkgp 0 (desativar)');
                }
                break;

            case 'antilink':
                const statusAntiLink = parseInt(args);
                if (statusAntiLink === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'antilink');
                    await syncToPanel(groupId, 'antiLink', 'antilink');
                    await message.reply('🗑️ *Anti-Link ativado!*\n\n📝 Links serão apenas removidos (sem ban)\n🔄 Sincronizado com painel');
                } else if (statusAntiLink === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await syncToPanel(groupId, 'antiLink', null);
                    await message.reply('❌ *Anti-Link desativado!*\n🔄 Sincronizado com painel');
                } else {
                    await message.reply('❌ Use: !antilink 1 (ativar) ou !antilink 0 (desativar)');
                }
                break;

            case 'banfoto':
                const statusBanFoto = parseInt(args);
                if (statusBanFoto === 1) {
                    await DataManager.saveConfig(groupId, 'banFoto', true);
                    await syncToPanel(groupId, 'banFoto', true);
                    await message.reply('📷 *Ban Foto ativado!*\n\n🚫 Qualquer imagem/vídeo será removida automaticamente\n🔄 Sincronizado com painel');
                } else if (statusBanFoto === 0) {
                    await DataManager.saveConfig(groupId, 'banFoto', false);
                    await syncToPanel(groupId, 'banFoto', false);
                    await message.reply('❌ *Ban Foto desativado!*\n🔄 Sincronizado com painel');
                } else {
                    await message.reply('❌ Use: !banfoto 1 (ativar) ou !banfoto 0 (desativar)');
                }
                break;

            case 'bangringo':
                const statusBanGringo = parseInt(args);
                if (statusBanGringo === 1) {
                    await DataManager.saveConfig(groupId, 'banGringo', true);
                    await syncToPanel(groupId, 'banGringo', true);
                    await message.reply('🇧🇷 *Ban Gringo ativado!*\n\n🚫 Números não brasileiros (+55) serão banidos automaticamente\n🔄 Sincronizado com painel');
                } else if (statusBanGringo === 0) {
                    await DataManager.saveConfig(groupId, 'banGringo', false);
                    await syncToPanel(groupId, 'banGringo', false);
                    await message.reply('❌ *Ban Gringo desativado!*\n🔄 Sincronizado com painel');
                } else {
                    await message.reply('❌ Use: !bangringo 1 (ativar) ou !bangringo 0 (desativar)');
                }
                break;

            case 'ban':
                if (!message.hasQuotedMsg) {
                    await message.reply('❌ Responda a uma mensagem para banir o usuário');
                    return;
                }

                try {
                    const quotedMsg = await message.getQuotedMessage();
                    const targetUser = quotedMsg.author || quotedMsg.from;
                    
                    // Deletar a mensagem antes de banir
                    try {
                        await quotedMsg.delete(true); // true para deletar para todos
                    } catch (deleteError) {
                        console.log('Erro ao deletar mensagem:', deleteError.message);
                    }
                    
                    const chat = await message.getChat();
                    await chat.removeParticipants([targetUser]);
                    
                    await message.reply('🔨 *Usuário banido com sucesso!*\n📝 Mensagem deletada');
                } catch (error) {
                    await message.reply('❌ Erro ao banir usuário. Verifique se sou administrador.');
                }
                break;
        }
    }

    // Método para verificar mensagens automaticamente
    static async checkMessage(client, message) {
        if (await Utils.isAdmin(message)) return; // Admins não são afetados

        const groupId = message.from;
        
        // Sistema híbrido: busca do painel primeiro, fallback para local
        let config;
        const apiConfig = await getPanelSettings(groupId);
        
        if (apiConfig) {
            // API funcionou - usar configurações do painel
            config = convertApiToLocal(apiConfig);
            console.log(`[HYBRID] 🌐 Usando configurações do painel para grupo ${groupId}`);
        } else {
            // API falhou - usar configurações locais
            config = await DataManager.loadConfig(groupId);
            console.log(`[HYBRID] 📁 Usando configurações locais para grupo ${groupId}`);
        }
        
        let shouldDelete = false;
        let shouldBan = false;
        let reason = '';

        // Verificar anti-link
        const antiLinkMode = config.antiLink;
        if (antiLinkMode) {
            const text = message.body.toLowerCase();
            const hasLink = text.includes('http') || text.includes('www.') || text.includes('.com');
            const hasGroupLink = text.includes('chat.whatsapp.com');

            switch (antiLinkMode) {
                case 'banextremo':
                    if (hasLink) {
                        shouldDelete = true;
                        shouldBan = true;
                        reason = 'enviar link proibido';
                    }
                    break;

                case 'banlinkgp':
                    if (hasGroupLink) {
                        shouldDelete = true;
                        shouldBan = true;
                        reason = 'enviar link de grupo';
                    }
                    break;

                case 'antilinkgp':
                    if (hasGroupLink) {
                        shouldDelete = true;
                        reason = 'link de grupo removido';
                    }
                    break;

                case 'antilink':
                    if (hasLink) {
                        shouldDelete = true;
                        reason = 'link removido';
                    }
                    break;
            }
        }

        // Verificar ban de foto/vídeo
        if (config.banFoto && message.hasMedia) {
            const media = await message.downloadMedia();
            if (media.mimetype.startsWith('image/') || media.mimetype.startsWith('video/')) {
                shouldDelete = true;
                reason = 'mídia não permitida';
            }
        }

        // Verificar ban gringo (números não brasileiros)
        if (config.banGringo && message.author) {
            const userNumber = message.author.replace('@c.us', '');
            if (!userNumber.startsWith('55')) {
                shouldDelete = true;
                shouldBan = true;
                reason = 'número estrangeiro';
            }
        }

        // Executar ações
        if (shouldDelete) {
            try {
                await message.delete(true);
                
                if (shouldBan) {
                    const chat = await message.getChat();
                    await chat.removeParticipants([message.author]);
                    await client.sendMessage(groupId, `🔨 *Usuário banido por ${reason}!*`);
                } else {
                    await client.sendMessage(groupId, `🗑️ *Mensagem removida: ${reason}*`);
                }
            } catch (error) {
                console.error('Erro na moderação automática:', error);
            }
        }
    }
}

module.exports = BanHandler;