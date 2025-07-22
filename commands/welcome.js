const { DataManager, Utils } = require('../index');
const { sincronizarGrupoComPainel } = require('../utils/SyncUtils');

class WelcomeHandler {
    static async handle(client, message, command, args) {
        const groupId = message.from;

        if (!(await Utils.isAdmin(message))) {
            await message.reply('🚫 Apenas administradores podem configurar boas-vindas.');
            return;
        }

        switch (command) {
            case 'bv':
                const status = parseInt(args);
                if (status !== 0 && status !== 1) {
                    await message.reply('❌ Use: !bv 1 (ativar) ou !bv 0 (desativar)');
                    return;
                }

                await DataManager.saveConfig(groupId, 'boasVindas', status);
                
                // Sincronizar com o painel
                await sincronizarGrupoComPainel(groupId);
                
                if (status === 1) {
                    await message.reply('✅ *Boas-vindas ativadas!*\n\n💡 Configure a mensagem com !legendabv\n📷 Envie foto/vídeo com !legendabv para boas-vindas com mídia');
                } else {
                    await message.reply('❌ *Boas-vindas desativadas!*');
                }
                break;

            case 'legendabv':
                if (!args) {
                    await message.reply('❌ *Digite a mensagem de boas-vindas!*\n\n📝 Exemplo: !legendabv Bem-vindo @user ao grupo @group!\n\n🔹 @user = novo membro\n🔹 @group = nome do grupo\n\n📷 *Para mídia:* Envie foto/vídeo com comando na legenda');
                    return;
                }

                let mediaData = null;

                // Verificar se há mídia
                let mediaMessage = null;
                if (message.hasMedia) {
                    mediaMessage = message;
                } else if (message.hasQuotedMsg) {
                    const quotedMsg = await message.getQuotedMessage();
                    if (quotedMsg.hasMedia) {
                        mediaMessage = quotedMsg;
                    }
                }

                // Se há mídia, baixar e salvar
                if (mediaMessage) {
                    const media = await mediaMessage.downloadMedia();
                    mediaData = {
                        data: media.data,
                        mimetype: media.mimetype,
                        filename: media.filename || `boasvindas_${groupId}.${media.mimetype.split('/')[1]}`
                    };
                }

                await DataManager.saveConfig(groupId, 'legendaBoasVindas', args);
                if (mediaData) {
                    await DataManager.saveConfig(groupId, 'mediaBoasVindas', mediaData);
                }
                
                const preview = args
                    .replace('@user', '@novoMembro')
                    .replace('@group', 'Nome do Grupo');

                const tipoMidia = mediaData ? `📷 ${mediaData.mimetype.includes('video') ? 'Vídeo' : 'Imagem'}` : '📝 Texto';
                await message.reply(`✅ *Boas-vindas configuradas!*\n\n${tipoMidia}\n📋 *Prévia:*\n${preview}\n\n💡 Pronto para integração web`);
                break;
        }
    }

    // Função para enviar boas-vindas (chamada quando alguém entra)
    static async sendWelcome(client, groupId, newMemberId) {
        try {
            const config = await DataManager.loadConfig(groupId);
            
            if (config.boasVindas !== 1 || !config.legendaBoasVindas) return;

            const chat = await client.getChatById(groupId);
            const newMember = await client.getContactById(newMemberId);
            
            let message = config.legendaBoasVindas
                .replace('@user', `@${newMember.id.user}`)
                .replace('@group', chat.name);

            // Verificar se há mídia configurada
            if (config.mediaBoasVindas) {
                const { MessageMedia } = require('whatsapp-web.js');
                const media = new MessageMedia(
                    config.mediaBoasVindas.mimetype, 
                    config.mediaBoasVindas.data, 
                    config.mediaBoasVindas.filename
                );
                
                await client.sendMessage(groupId, media, { 
                    caption: message,
                    mentions: [newMember.id._serialized]
                });
            } else {
                await client.sendMessage(groupId, message, {
                    mentions: [newMember.id._serialized]
                });
            }
        } catch (error) {
            console.error('Erro ao enviar boas-vindas:', error);
        }
    }
}

module.exports = WelcomeHandler;