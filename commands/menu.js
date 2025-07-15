const { DataManager, Utils } = require('../index');

class MenuHandler {
    static async handle(client, message, args) {
        const menuText = `📋 *LISTA DE COMANDOS - BOT ADMIN*

🎯 *COMANDOS GERAIS:*
📣 !all [mensagem] – Menciona todos (sem mostrar @)
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
🎰 !horarios – Enviar dicas de apostas
🔛 !horapg 1/0 – Ativar/desativar
⏰ !addhorapg 30m – Agendar próximo
🖼️ !imagem-horarios – Definir imagem padrão

🛡️ *SISTEMA DE PROTEÇÃO:*
💣 !banextremo 1/0 – Ban por qualquer link
🔗 !banlinkgp 1/0 – Ban por link de grupo
🧹 !antilinkgp 1/0 – Só apagar link de grupo
🗑️ !antilink 1/0 – Só apagar qualquer link
📷 !banfoto 1/0 – Remover fotos/vídeos
🇧🇷 !bangringo 1/0 – Ban números estrangeiros
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