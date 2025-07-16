const { DataManager, Utils } = require('../index');
const moment = require('moment-timezone');

class SorteioHandler {
    static async handle(client, message, args) {
        const groupId = message.from;

        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem criar sorteios.');
            return;
        }

        if (!args.includes('|')) {
            await message.reply('❌ *Formato incorreto!*\n\n📝 Use: !sorteio prêmio|tempo\n\n🔸 Exemplo: !sorteio Pix R$100|2m\n🔸 Tempo: 30s, 2m, 1h, etc.');
            return;
        }

        const [premio, tempoStr] = args.split('|').map(s => s.trim());

        if (!premio || !tempoStr) {
            await message.reply('❌ *Prêmio e tempo são obrigatórios!*');
            return;
        }

        // Converter tempo para minutos
        const tempo = this.parseTime(tempoStr);
        if (!tempo) {
            await message.reply('❌ *Tempo inválido!*\n\n✅ Formatos válidos: 30s, 2m, 1h');
            return;
        }

        try {
            // Criar mensagem do sorteio
            const sorteioText = `🎉 *SORTEIO INICIADO!*

🏆 *Prêmio:* ${premio}
⏳ *Tempo:* ${tempoStr}
✅ *Para participar:* Reaja com ✅

⏰ *Encerra em:* ${moment().add(tempo, 'minutes').format('HH:mm')}

🍀 *Boa sorte!*`;

            const sentMessage = await client.sendMessage(groupId, sorteioText);
            
            // Reagir com ✅
            await sentMessage.react('✅');

            // Salvar sorteio
            const sorteioData = {
                id: sentMessage.id._serialized,
                groupId: groupId,
                premio: premio,
                tempoMinutos: tempo,
                inicio: moment().format(),
                fim: moment().add(tempo, 'minutes').format(),
                ativo: true,
                messageId: sentMessage.id._serialized
            };

            const sorteios = await DataManager.loadData('sorteios.json');
            if (!sorteios.sorteios) sorteios.sorteios = {};
            sorteios.sorteios[sentMessage.id._serialized] = sorteioData;
            await DataManager.saveData('sorteios.json', sorteios);

            // Agendar finalização
            setTimeout(async () => {
                await this.finalizarSorteio(client, sentMessage.id._serialized);
            }, tempo * 60 * 1000);

            await message.reply('✅ *Sorteio criado com sucesso!*');

        } catch (error) {
            console.error('Erro ao criar sorteio:', error);
            await message.reply('❌ Erro ao criar sorteio. Tente novamente.');
        }
    }

    static parseTime(timeStr) {
        const regex = /^(\d+)(s|m|h)$/i;
        const match = timeStr.match(regex);
        
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        switch (unit) {
            case 's': return value / 60; // segundos para minutos
            case 'm': return value;      // minutos
            case 'h': return value * 60; // horas para minutos
            default: return null;
        }
    }

    static async finalizarSorteio(client, sorteioId) {
        try {
            const sorteios = await DataManager.loadData('sorteios.json');
            const sorteio = sorteios.sorteios[sorteioId];

            if (!sorteio || !sorteio.ativo) return;

            // Buscar mensagem original
            const message = await client.getMessageById(sorteioId);
            if (!message) return;

            // Buscar reações
            const reactions = await message.getReactions();
            const checkReaction = reactions.find(r => r.emoji === '✅');

            if (!checkReaction || checkReaction.senders.length <= 1) {
                await client.sendMessage(sorteio.groupId, '😔 *Sorteio cancelado!*\n\n❌ Nenhum participante válido');
                
                // Marcar como inativo
                sorteio.ativo = false;
                await DataManager.saveData('sorteios.json', sorteios);
                return;
            }

            // Filtrar participantes (remover bot)
            const botNumber = client.info.wid.user;
            const participantes = checkReaction.senders.filter(sender => 
                sender.id.user !== botNumber
            );

            if (participantes.length === 0) {
                await client.sendMessage(sorteio.groupId, '😔 *Sorteio cancelado!*\n\n❌ Nenhum participante válido');
                return;
            }

            // Sortear vencedor
            const vencedor = participantes[Math.floor(Math.random() * participantes.length)];
            const contato = await client.getContactById(vencedor.id._serialized);

            const resultadoText = `🎉 *SORTEIO FINALIZADO!*

🏆 *Prêmio:* ${sorteio.premio}
🎊 *Vencedor:* @${vencedor.id.user}
👥 *Participantes:* ${participantes.length}

🎁 *Parabéns ${contato.pushname || vencedor.id.user}!*
Entre em contato com os admins para retirar seu prêmio!`;

            await client.sendMessage(sorteio.groupId, resultadoText, {
                mentions: [vencedor.id._serialized]
            });

            // Salvar resultado
            sorteio.ativo = false;
            sorteio.vencedor = vencedor.id._serialized;
            sorteio.participantes = participantes.length;
            sorteio.finalizado = moment().format();

            await DataManager.saveData('sorteios.json', sorteios);

        } catch (error) {
            console.error('Erro ao finalizar sorteio:', error);
        }
    }
}

module.exports = SorteioHandler;