// commands/sorteio.js - Sistema de Sorteios
const Sender = require('../utils/Sender'); // Importar Sender para envios seguros

class SorteioCommand {
    static async execute(client, message, args) {
        const chat = await message.getChat();
        
        if (chat.isGroup && !message.author.endsWith('@c.us')) {
            const participant = chat.participants.find(p => p.id._serialized === message.author);
            if (!participant || (!participant.isAdmin && !participant.isSuperAdmin)) {
                await Sender.sendMessage(client, message.from, '🚫 Apenas administradores podem criar sorteios.');
                return;
            }
        }

        if (!args.includes('|')) {
            await Sender.sendMessage(client, message.from, '❌ *Formato incorreto!*\n\n📝 Use: !sorteio prêmio|tempo\n\n🔸 Exemplo: !sorteio Pix R$100|2m\n🔸 Tempo: 30s, 2m, 1h, etc.');
            return;
        }

        const [premio, tempoStr] = args.split('|').map(s => s.trim());
        
        if (!premio || !tempoStr) {
            await Sender.sendMessage(client, message.from, '❌ *Prêmio e tempo são obrigatórios!*');
            return;
        }

        // Converter tempo para milissegundos
        const tempo = this.parseTime(tempoStr);
        if (!tempo) {
            await Sender.sendMessage(client, message.from, '❌ *Tempo inválido!*\n\n✅ Formatos válidos: 30s, 2m, 1h');
            return;
        }

        try {
            // Criar mensagem do sorteio
            const sorteioMsg = `🎉 *SORTEIO INICIADO!*\n\n` +
                              `🎁 *Prêmio:* ${premio}\n` +
                              `⏰ *Tempo:* ${tempoStr}\n\n` +
                              `📝 *Como participar:*\n` +
                              `• Reaja com 🎉 nesta mensagem\n` +
                              `• Aguarde o resultado!\n\n` +
                              `⏳ *Sorteio encerra em ${tempoStr}*`;

            // Enviar mensagem do sorteio
            const sentMessage = await client.sendMessage(message.from, sorteioMsg);
            
            // Adicionar reação inicial
            await sentMessage.react('🎉');

            // Agendar finalização do sorteio
            setTimeout(async () => {
                try {
                    // Buscar reações da mensagem
                    const updatedMessage = await client.getMessageById(sentMessage.id._serialized);
                    const reactions = await updatedMessage.getReactions();
                    
                    let participants = [];
                    for (const reaction of reactions) {
                        if (reaction.emoji === '🎉') {
                            participants = participants.concat(reaction.reactors);
                        }
                    }

                    // Filtrar participantes únicos e remover o bot
                    participants = [...new Set(participants)].filter(p => p !== client.info.wid._serialized);

                    let resultMsg;
                    if (participants.length === 0) {
                        resultMsg = `🎉 *SORTEIO FINALIZADO!*\n\n🎁 *Prêmio:* ${premio}\n\n😢 *Nenhum participante!*\nO sorteio foi cancelado.`;
                    } else {
                        const winner = participants[Math.floor(Math.random() * participants.length)];
                        const contact = await client.getContactById(winner);
                        
                        resultMsg = `🎉 *SORTEIO FINALIZADO!*\n\n` +
                                   `🎁 *Prêmio:* ${premio}\n` +
                                   `🏆 *Ganhador:* @${contact.number}\n\n` +
                                   `🎊 Parabéns! Entre em contato com o administrador para retirar seu prêmio.`;
                    }

                    await client.sendMessage(message.from, resultMsg, {
                        mentions: participants.length > 0 ? [participants[Math.floor(Math.random() * participants.length)]] : []
                    });

                } catch (error) {
                    console.error('Erro ao finalizar sorteio:', error);
                    await Sender.sendMessage(client, message.from, '❌ Erro ao finalizar sorteio.');
                }
            }, tempo);

            await Sender.sendMessage(client, message.from, '✅ *Sorteio criado com sucesso!*');

        } catch (error) {
            console.error('Erro ao criar sorteio:', error);
            await Sender.sendMessage(client, message.from, '❌ Erro ao criar sorteio. Tente novamente.');
        }
    }

    static parseTime(timeStr) {
        const match = timeStr.match(/^(\d+)([smh])$/);
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            default: return null;
        }
    }
}

module.exports = SorteioCommand;