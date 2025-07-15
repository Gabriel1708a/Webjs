const { DataManager, Utils } = require('../index');

class WelcomeHandler {
    static async handle(client, message, command, args) {
        const groupId = message.from;

        if (!Utils.isAdmin(message)) {
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
                
                if (status === 1) {
                    await message.reply('✅ *Boas-vindas ativadas!*\n\n💡 Configure a mensagem com !legendabv');
                } else {
                    await message.reply('❌ *Boas-vindas desativadas!*');
                }
                break;

            case 'legendabv':
                if (!args) {
                    await message.reply('❌ *Digite a mensagem de boas-vindas!*\n\n📝 Exemplo: !legendabv Bem-vindo @user ao grupo @group!\n\n🔹 @user = novo membro\n🔹 @group = nome do grupo');
                    return;
                }

                await DataManager.saveConfig(groupId, 'legendaBoasVindas', args);
                
                const preview = args
                    .replace('@user', '@novoMembro')
                    .replace('@group', 'Nome do Grupo');

                await message.reply(`✅ *Mensagem de boas-vindas salva!*\n\n📋 *Prévia:*\n${preview}`);
                break;
        }
    }
}

module.exports = WelcomeHandler;