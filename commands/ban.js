const { DataManager, Utils } = require('../index');

class BanHandler {
    static async handle(client, message, command, args) {
        const groupId = message.from;

        if (!Utils.isAdmin(message)) {
            await message.reply('🚫 Apenas administradores podem usar comandos de moderação.');
            return;
        }

        switch (command) {
            case 'banextremo':
                await DataManager.saveConfig(groupId, 'antiLink', 'banextremo');
                await message.reply('💣 *Anti-Link Extremo ativado!*\n\n🔥 Qualquer link será removido e o usuário banido');
                break;

            case 'banlinkgp':
                await DataManager.saveConfig(groupId, 'antiLink', 'banlinkgp');
                await message.reply('🔗 *Ban Link de Grupo ativado!*\n\n⚠️ Links de grupos WhatsApp serão removidos e usuário banido');
                break;

            case 'antilinkgp':
                await DataManager.saveConfig(groupId, 'antiLink', 'antilinkgp');
                await message.reply('🧹 *Anti-Link de Grupo ativado!*\n\n🗑️ Links de grupos serão apenas removidos (sem ban)');
                break;

            case 'antilink':
                await DataManager.saveConfig(groupId, 'antiLink', 'antilink');
                await message.reply('🗑️ *Anti-Link ativado!*\n\n📝 Links serão apenas removidos (sem ban)');
                break;

            case 'ban':
                if (!message.hasQuotedMsg) {
                    await message.reply('❌ Responda a uma mensagem para banir o usuário');
                    return;
                }

                try {
                    const quotedMsg = await message.getQuotedMessage();
                    const targetUser = quotedMsg.author || quotedMsg.from;
                    
                    const chat = await message.getChat();
                    await chat.removeParticipants([targetUser]);
                    
                    await message.reply('🔨 *Usuário banido com sucesso!*');
                } catch (error) {
                    await message.reply('❌ Erro ao banir usuário. Verifique se sou administrador.');
                }
                break;
        }
    }

    // Método para verificar mensagens automaticamente
    static async checkMessage(client, message) {
        if (Utils.isAdmin(message)) return; // Admins não são afetados

        const groupId = message.from;
        const config = await DataManager.loadConfig(groupId);
        const antiLinkMode = config.antiLink;

        if (!antiLinkMode) return;

        const text = message.body.toLowerCase();
        const hasLink = text.includes('http') || text.includes('www.') || text.includes('.com');
        const hasGroupLink = text.includes('chat.whatsapp.com');

        let shouldDelete = false;
        let shouldBan = false;

        switch (antiLinkMode) {
            case 'banextremo':
                if (hasLink) {
                    shouldDelete = true;
                    shouldBan = true;
                }
                break;

            case 'banlinkgp':
                if (hasGroupLink) {
                    shouldDelete = true;
                    shouldBan = true;
                }
                break;

            case 'antilinkgp':
                if (hasGroupLink) {
                    shouldDelete = true;
                }
                break;

            case 'antilink':
                if (hasLink) {
                    shouldDelete = true;
                }
                break;
        }

        if (shouldDelete) {
            try {
                await message.delete(true);
                
                if (shouldBan) {
                    const chat = await message.getChat();
                    await chat.removeParticipants([message.author]);
                    await client.sendMessage(groupId, '🔨 *Usuário banido por enviar link proibido!*');
                } else {
                    await client.sendMessage(groupId, '🗑️ *Link removido automaticamente*');
                }
            } catch (error) {
                console.error('Erro no anti-link:', error);
            }
        }
    }
}

module.exports = BanHandler;