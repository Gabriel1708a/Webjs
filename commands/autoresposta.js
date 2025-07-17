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
            // Removido: await message.reply('✅ *Mensagem apagada com sucesso!*');
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
            const nomeBot = config.botInfo.nome.toLowerCase();

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
                'dia': [
                    '🌅 Bom dia! Que seu dia seja repleto de conquistas! ✨', 
                    '☀️ Bom dia! A vida sorri para quem sorri primeiro! 😊',
                    '🌞 Bom dia! Comece hoje com energia positiva! 💪',
                    '🌻 Bom dia! Que este dia traga muita alegria! 🎉',
                    '🌈 Bom dia! Novos desafios, novas oportunidades! 🚀',
                    '⭐ Bom dia! Você é capaz de coisas incríveis! 💖',
                    '🌸 Bom dia! Desperte com gratidão no coração! 🙏'
                ],
                'tarde': [
                    '🌞 Boa tarde! Continue brilhando como o sol! ⭐', 
                    '🌤️ Boa tarde! Que a energia positiva te acompanhe! 💪',
                    '🌺 Boa tarde! Mantenha o foco nos seus sonhos! 🎯',
                    '🌟 Boa tarde! Você está indo muito bem! 👏',
                    '🌼 Boa tarde! Cada passo te leva mais longe! 🏃‍♀️',
                    '💫 Boa tarde! Sua determinação é inspiradora! 🔥',
                    '🌷 Boa tarde! Continue sendo essa pessoa incrível! 😍'
                ],
                'noite': [
                    '🌙 Boa noite! Descanse e recarregue suas energias! ✨', 
                    '🌟 Boa noite! Sonhe alto e conquiste amanhã! 💫',
                    '🌃 Boa noite! Você merece um descanso merecido! 😴',
                    '🌛 Boa noite! Que seus sonhos sejam doces! 💤',
                    '⭐ Boa noite! Amanhã será um dia ainda melhor! 🌅',
                    '🌜 Boa noite! Gratidão por mais um dia vivido! 🙏',
                    '💤 Boa noite! Durma bem, guerreiro(a)! 💪'
                ]
            };
            
            let periodo = 'dia';
            if (texto.includes('tarde')) periodo = 'tarde';
            else if (texto.includes('noite')) periodo = 'noite';
            
            const respostas = respostaspadrao[periodo];
            const resposta = respostas[Math.floor(Math.random() * respostas.length)];
            console.log(`🔄 Usando resposta padrão (${periodo}):`, resposta);
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
            if (!config.groqApiKey || config.groqApiKey === 'SUA_CHAVE_GROQ_AQUI') {
                console.log('🔧 API Groq não configurada, usando respostas padrão');
                throw new Error('API Key não configurada');
            }

            // Adicionar randomização no prompt para mais variação
            const randomElements = [
                'energética e inspiradora',
                'carinhosa e motivadora', 
                'alegre e positiva',
                'calorosa e encorajadora',
                'afetuosa e animadora'
            ];
            
            const randomTone = randomElements[Math.floor(Math.random() * randomElements.length)];
            const randomNumber = Math.floor(Math.random() * 1000); // Para evitar cache

            const prompt = `Gere uma frase ${randomTone} para ${periodo === 'dia' ? 'bom dia' : periodo === 'tarde' ? 'boa tarde' : 'boa noite'}. 
            Requisitos:
            - Entre 10-25 palavras
            - Emojis apropriados 
            - Tom ${randomTone}
            - Terminar com "bom ${periodo === 'dia' ? 'dia' : periodo === 'tarde' ? 'tarde' : 'noite'}!"
            - Ser única e criativa (${randomNumber})`;

            console.log('🤖 Consultando API Groq para gerar frase...');

            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 120,
                temperature: 0.9, // Aumentei para mais criatividade
                top_p: 0.9,
                presence_penalty: 0.6, // Evita repetições
                frequency_penalty: 0.5
            }, {
                headers: {
                    'Authorization': `Bearer ${config.groqApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 segundos timeout
            });

            const fraseGerada = response.data.choices[0].message.content.trim();
            console.log('✅ Frase gerada pela API Groq:', fraseGerada);
            return fraseGerada;

        } catch (error) {
            console.error('❌ Erro API Groq:', error.message);
            throw error;
        }
    }
}

module.exports = AutoRespostaHandler;