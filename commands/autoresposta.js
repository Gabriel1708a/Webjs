const { DataManager, Utils } = require('../index');
const axios = require('axios');
const config = require('../config.json');

class AutoRespostaHandler {
    static async handle(client, message, command, args) {
        const groupId = message.from;

        switch (command) {
            case 'autoresposta':
                await this.toggleAutoResposta(client, message, groupId, args);
                break;

            case 'apagar':
                await this.apagarMensagem(client, message);
                break;
        }
    }

    static async toggleAutoResposta(client, message, groupId, args) {
        const status = parseInt(args);
        
        if (status !== 0 && status !== 1) {
            await message.reply('❌ Use: !autoresposta 1 (ativar) ou !autoresposta 0 (desativar)');
            return;
        }

        try {
            await DataManager.saveConfig(groupId, 'autoResposta', status);
            
            if (status === 1) {
                await message.reply('✅ *Auto-resposta ativada!*\n\n🤖 O bot agora responderá a:\n• Bom dia/Boa tarde/Boa noite\n• Quando chamarem o nome do bot\n\n💡 Respostas geradas por IA');
            } else {
                await message.reply('❌ *Auto-resposta desativada!*\n\n🔇 Bot não responderá automaticamente');
            }
        } catch (error) {
            console.error('Erro ao configurar auto-resposta:', error);
            await message.reply('❌ Erro ao configurar auto-resposta.');
        }
    }

    static async apagarMensagem(client, message) {
        if (!message.hasQuotedMsg) {
            await message.reply('❌ Você precisa responder a uma mensagem para usar o comando !apagar');
            return;
        }

        try {
            const quotedMsg = await message.getQuotedMessage();
            await quotedMsg.delete(true); // true para deletar para todos
            await message.reply('✅ *Mensagem apagada com sucesso!*');
        } catch (error) {
            console.error('Erro ao apagar mensagem:', error);
            await message.reply('❌ Erro ao apagar mensagem. Verifique se sou administrador.');
        }
    }

    // Verificar se deve responder automaticamente
    static async checkAutoResposta(client, message) {
        try {
            const groupId = message.from;
            const autoRespostaAtiva = await DataManager.loadConfig(groupId, 'autoResposta');
            
            if (autoRespostaAtiva !== 1) return;

            const texto = message.body.toLowerCase().trim();
            const nomeBot = config.nomeBot.toLowerCase();

            // Verificar cumprimentos
            if (this.isCumprimento(texto)) {
                await this.responderCumprimento(client, message, texto);
                return;
            }

            // Verificar se chamou o bot pelo nome
            if (texto.includes(nomeBot)) {
                await this.responderChamada(client, message);
                return;
            }

        } catch (error) {
            console.error('Erro na auto-resposta:', error);
        }
    }

    static isCumprimento(texto) {
        const cumprimentos = [
            'bom dia', 'bomdia', 'boa tarde', 'boatarde', 
            'boa noite', 'boanoite', 'oi', 'olá', 'ola'
        ];
        
        return cumprimentos.some(cumprimento => texto.includes(cumprimento));
    }

    static async responderCumprimento(client, message, texto) {
        try {
            let periodo = 'dia';
            
            if (texto.includes('tarde')) {
                periodo = 'tarde';
            } else if (texto.includes('noite')) {
                periodo = 'noite';
            }

            const fraseMotivadora = await this.gerarFraseMotivadora(periodo);
            await message.reply(fraseMotivadora);

        } catch (error) {
            // Fallback para respostas padrão se Grok falhar
            const respostaspadrao = {
                'dia': ['🌅 Bom dia! Que seu dia seja repleto de conquistas! ✨', '☀️ Bom dia! A vida sorri para quem sorri primeiro! 😊'],
                'tarde': ['🌞 Boa tarde! Continue brilhando como o sol! ⭐', '🌤️ Boa tarde! Que a energia positiva te acompanhe! 💪'],
                'noite': ['🌙 Boa noite! Descanse e recarregue suas energias! ✨', '🌟 Boa noite! Sonhe alto e conquiste amanhã! 💫']
            };
            
            let periodo = 'dia';
            if (texto.includes('tarde')) periodo = 'tarde';
            else if (texto.includes('noite')) periodo = 'noite';
            
            const respostas = respostaspadrao[periodo];
            const resposta = respostas[Math.floor(Math.random() * respostas.length)];
            await message.reply(resposta);
        }
    }

    static async responderChamada(client, message) {
        try {
            const frasesDebochadas = [
                'No momento estou sem sinal, deixe seu recado após o bip...BIP📞',
                'Estou de folga, atrapalha não 🌴🏖️',
                'Diga pessoa mais linda como posso ajudar? 💖',
                'O que se quer? 🤔',
                'Oi princesa do meu coração! Estou aqui para te servir 👑💕',
                'Oi amor da minha vida 🤎',
                'Oi delícia😏, me chamou?',
                'Eita, me chamaram! O que aconteceu? 😅',
                'Presente! O que você precisa, mozão? 😘',
                'Oi bebê, tô aqui! Como posso ajudar? 🥰',
                'Falou comigo, lindeza? 💅✨',
                'Opa! Chegou o momento de brilhar ⭐',
                'Sim, meu bem? Fala que te escuto 👂💕',
                'Aqui está sua assistente virtual favorita! 🤖💖'
            ];

            const resposta = frasesDebochadas[Math.floor(Math.random() * frasesDebochadas.length)];
            await message.reply(resposta);

        } catch (error) {
            console.error('Erro ao responder chamada:', error);
        }
    }

    static async gerarFraseMotivadora(periodo) {
        try {
            if (!config.grokApiKey || config.grokApiKey === 'SUA_CHAVE_GROK_AQUI') {
                throw new Error('API Key não configurada');
            }

            const prompt = `Gere uma frase motivadora curta e positiva para ${periodo === 'dia' ? 'bom dia' : periodo === 'tarde' ? 'boa tarde' : 'boa noite'}. 
            A frase deve:
            - Ser motivadora e positiva
            - Ter entre 10-30 palavras
            - Incluir emojis apropriados
            - Terminar com "bom ${periodo === 'dia' ? 'dia' : periodo === 'tarde' ? 'tarde' : 'noite'}!"
            - Ser calorosa e amigável`;

            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 100,
                temperature: 0.8
            }, {
                headers: {
                    'Authorization': `Bearer ${config.grokApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content.trim();

        } catch (error) {
            console.error('Erro ao gerar frase motivadora:', error);
            throw error;
        }
    }
}

module.exports = AutoRespostaHandler;