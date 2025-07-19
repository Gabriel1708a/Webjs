const { DataManager, Utils } = require('../index');

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
                    await message.reply('💣 *Anti-Link Extremo ativado!*\n\n🔥 Qualquer link será removido e o usuário banido');
                } else if (statusExtremo === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await message.reply('❌ *Anti-Link Extremo desativado!*');
                } else {
                    await message.reply('❌ Use: !banextremo 1 (ativar) ou !banextremo 0 (desativar)');
                }
                break;

            case 'banlinkgp':
                const statusLinkGp = parseInt(args);
                if (statusLinkGp === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'banlinkgp');
                    await message.reply('🔗 *Ban Link de Grupo ativado!*\n\n⚠️ Links de grupos WhatsApp serão removidos e usuário banido');
                } else if (statusLinkGp === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await message.reply('❌ *Ban Link de Grupo desativado!*');
                } else {
                    await message.reply('❌ Use: !banlinkgp 1 (ativar) ou !banlinkgp 0 (desativar)');
                }
                break;

            case 'antilinkgp':
                const statusAntiLinkGp = parseInt(args);
                if (statusAntiLinkGp === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'antilinkgp');
                    await message.reply('🧹 *Anti-Link de Grupo ativado!*\n\n🗑️ Links de grupos serão apenas removidos (sem ban)');
                } else if (statusAntiLinkGp === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await message.reply('❌ *Anti-Link de Grupo desativado!*');
                } else {
                    await message.reply('❌ Use: !antilinkgp 1 (ativar) ou !antilinkgp 0 (desativar)');
                }
                break;

            case 'antilink':
                const statusAntiLink = parseInt(args);
                if (statusAntiLink === 1) {
                    await DataManager.saveConfig(groupId, 'antiLink', 'antilink');
                    await message.reply('🗑️ *Anti-Link ativado!*\n\n📝 Links serão apenas removidos (sem ban)');
                } else if (statusAntiLink === 0) {
                    await DataManager.saveConfig(groupId, 'antiLink', null);
                    await message.reply('❌ *Anti-Link desativado!*');
                } else {
                    await message.reply('❌ Use: !antilink 1 (ativar) ou !antilink 0 (desativar)');
                }
                break;

            case 'banfoto':
                const statusBanFoto = parseInt(args);
                if (statusBanFoto === 1) {
                    await DataManager.saveConfig(groupId, 'banFoto', true);
                    await message.reply('📷 *Ban Foto ativado!*\n\n🚫 Qualquer imagem/vídeo será removida automaticamente');
                } else if (statusBanFoto === 0) {
                    await DataManager.saveConfig(groupId, 'banFoto', false);
                    await message.reply('❌ *Ban Foto desativado!*');
                } else {
                    await message.reply('❌ Use: !banfoto 1 (ativar) ou !banfoto 0 (desativar)');
                }
                break;

            case 'bangringo':
                const statusBanGringo = parseInt(args);
                if (statusBanGringo === 1) {
                    await DataManager.saveConfig(groupId, 'banGringo', true);
                    await message.reply('🇧🇷 *Ban Gringo ativado!*\n\n🚫 Números não brasileiros (+55) serão banidos automaticamente');
                } else if (statusBanGringo === 0) {
                    await DataManager.saveConfig(groupId, 'banGringo', false);
                    await message.reply('❌ *Ban Gringo desativado!*');
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
        const config = await DataManager.loadConfig(groupId);
        
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
        if (config.banGringo && message.from) {
            const userNumber = message.from.replace('@c.us', '');
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
                    await chat.removeParticipants([message.from]);
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