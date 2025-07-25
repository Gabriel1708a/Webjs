// commands/menu.js - Menu Principal do Bot
const moment = require('moment-timezone');
const Sender = require('../utils/Sender'); // Importar Sender para envios seguros

class MenuCommand {
    static async execute(client, message, args) {
        try {
            const now = moment().tz('America/Sao_Paulo');
            const greeting = this.getGreeting(now.hour());
            
            const menuText = `${greeting} *Seja bem-vindo!*\n\n` +
                `🤖 *BOT ADMINISTRADOR DE GRUPOS*\n` +
                `⏰ ${now.format('DD/MM/YYYY HH:mm')}\n\n` +
                
                `📢 *ANÚNCIOS:*\n` +
                `• !addads mensagem|intervalo - Criar anúncio\n` +
                `• !listads - Listar anúncios\n` +
                `• !rmads ID - Remover anúncio\n` +
                `• !statusads - Status dos anúncios\n\n` +
                
                `🛡️ *MODERAÇÃO:*\n` +
                `• !ban - Banir usuário (responda msg)\n` +
                `• !antilink 1/0 - Anti-link\n` +
                `• !banfoto 1/0 - Banir fotos\n` +
                `• !bangringo 1/0 - Banir gringos\n\n` +
                
                `🎰 *HORÁRIOS:*\n` +
                `• !horarios - Mostrar horários\n` +
                `• !horapg 1/0 - Ativar horários pagantes\n` +
                `• !imagem-horarios - Definir imagem\n\n` +
                
                `🎉 *INTERAÇÃO:*\n` +
                `• !sorteio prêmio|tempo - Criar sorteio\n` +
                `• !bv 1/0 - Boas-vindas\n` +
                `• !legendabv texto - Msg boas-vindas\n` +
                `• !autoresposta 1/0 - Auto-resposta\n\n` +
                
                `⚙️ *CONTROLE:*\n` +
                `• !abrir / !fechar - Controlar grupo\n` +
                `• !allg - Marcar todos\n` +
                `• !ping - Testar bot\n` +
                `• !status - Status do sistema\n\n` +
                
                `🔧 *SISTEMA:*\n` +
                `• !debug - Verificar configurações\n` +
                `• !syncpanel - Sincronizar painel\n` +
                `• !syncstatus - Status sincronização\n\n` +
                
                `💡 *Dica:* Use os comandos apenas se for administrador do grupo!\n\n` +
                `📱 *Suporte:* Entre em contato com o desenvolvedor`;

            await Sender.sendMessage(client, message.from, menuText);
            
        } catch (error) {
            console.error('Erro no comando menu:', error);
            await Sender.sendMessage(client, message.from, '❌ Erro ao exibir menu. Tente novamente.');
        }
    }

    static getGreeting(hour) {
        if (hour >= 5 && hour < 12) return '🌅';
        if (hour >= 12 && hour < 18) return '☀️';
        if (hour >= 18 && hour < 22) return '🌆';
        return '🌙';
    }
}

module.exports = MenuCommand;
