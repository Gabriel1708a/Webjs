const { DataManager, Utils } = require('../index');

class MenuHandler {
    static async handle(client, message, args) {
        const menuText = `📋 *LISTA DE COMANDOS - BOT ADMIN*

🎯 *COMANDOS GERAIS:*
📣 !all – Menciona todos silenciosamente
📋 !menu – Mostra esta lista
✅ !vergrupo – Status do grupo

🗞️ *ANÚNCIOS:*
📢 !addads mensagem|intervalo – Criar anúncio
📋 !listads – Listar anúncios
🗑️ !rmads ID – Remover anúncio

👋 *BOAS-VINDAS:*
🔛 !bv 1/0 – Ativar/desativar
✏️ !legendabv texto – Definir mensagem
📝 Use @user e @group na mensagem

🔐 *CONTROLE DE GRUPO:*
🔓 !abrirgrupo – Abrir grupo agora
🔒 !fechargrupo – Fechar grupo agora
⏰ !abrirgp HH:MM – Agendar abertura
⏰ !fechargp HH:MM – Agendar fechamento
🚫 !afgp 0 – Cancelar agendamentos

🎉 *SORTEIOS:*
🎁 !sorteio prêmio|tempo – Criar sorteio
⏱️ Tempo: 1m, 30s, 2h, etc.

🕐 *HORÁRIOS PAGANTES:*
🎰 !horarios – Enviar dica de aposta
🔛 !horapg 1/0 – Ativar/desativar
⏰ !addhorapg 30m – Agendar próximo

🛡️ *ANTI-LINK:*
💣 !banextremo – Ban por qualquer link
🔗 !banlinkgp – Ban por link de grupo
🧹 !antilinkgp – Só apagar link de grupo
🗑️ !antilink – Só apagar qualquer link
🔨 !ban – Banir (responder mensagem)

👑 *ADMINISTRAÇÃO:*
🔓 !liberargrupo 30 – Liberar grupo X dias
⏰ !vergrupo – Ver status do grupo

━━━━━━━━━━━━━━━━━━━━━
🤖 *Bot Admin v1.0*
✨ Gerencie seu grupo com facilidade!`;

        await message.reply(menuText);
    }
}

module.exports = MenuHandler;