const { DataManager, Utils, RentalSystem } = require('../index');
const { sincronizarGrupoComPainel } = require('../utils/SyncUtils');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

class HorariosHandler {
    static activeIntervals = new Map(); // Para controlar intervalos ativos

    static async handle(client, message, command, args) {
        const groupId = message.from;

        // Verificar se grupo está ativo para horários pagantes
        const status = await RentalSystem.checkGroupStatus(groupId);
        if (!status.active) {
            await message.reply('⚠️ Horários pagantes disponíveis apenas para grupos ativos');
            return;
        }

        if (!(await Utils.isAdmin(message)) && command !== 'horarios') {
            await message.reply('🚫 Apenas administradores podem gerenciar horários.');
            return;
        }

        switch (command) {
            case 'horarios':
                await this.sendHorario(client, message, groupId);
                break;

            case 'horapg':
                await this.toggleHorarios(client, message, groupId, args);
                break;

            case 'addhorapg':
                await this.scheduleNextHour(client, message, groupId, args);
                break;

            case 'imagem-horarios':
                await this.setImagemHorarios(client, message, groupId, args);
                break;
        }
    }

    static async sendHorario(client, message, groupId) {
        try {
            const now = moment.tz("America/Sao_Paulo");
            const currentHour = now.hours();

            const plataformas = [
                "🐯 FORTUNE TIGER", "🐉 DRAGON LUCK", "🐰 FORTUNE RABBIT", "🐭 FORTUNE MOUSE",
                "🐘 GANESHA GOLD", "👙 BIKINI", "🥊 MUAY THAI", "🎪 CIRCUS", "🐂 FORTUNE OX",
                "💰 DOUBLE FORTUNE", "🐉🐅 DRAGON TIGER LUCK", "🧞 GENIE'S WISHES(GENIO)",
                "🌳🌲 JUNGLE DELIGHT", "🐷 PIGGY GOLD", "👑 MIDAS FORTUNE", "🌞🌛 SUN & MOON",
                "🦹‍♂️ WILD BANDITO", "🔥🕊️ PHOENIX RISES", "🛒 SUPERMARKET SPREE",
                "🚢👨‍✈️ CAPTAIN BOUNTY", "🎃 MISTER HOLLOWEEN", "🍀💰 LEPRECHAUN RICHES"
            ];

            function gerarHorarioAleatorio(horaBase, minIntervalo, maxIntervalo) {
                const minutoAleatorio = Math.floor(Math.random() * (maxIntervalo - minIntervalo + 1)) + minIntervalo;
                return `${horaBase.toString().padStart(2, '0')}:${minutoAleatorio.toString().padStart(2, '0')}`;
            }

            let horariosText = `🍀 *SUGESTÃO DE HORÁRIOS PAGANTES DAS ${currentHour.toString().padStart(2, '0')}h* 💰\n\n`;
            let foundRelevantHorarios = false;

            plataformas.forEach(plataforma => {
                const horariosGerados = Array.from({ length: 7 }, () => {
                    const primeiroHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                    const segundoHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                    return `${primeiroHorario} - ${segundoHorario}`;
                });

                if (horariosGerados.length > 0) {
                    foundRelevantHorarios = true;
                    horariosText += `*${plataforma}*\n`;
                    horariosGerados.forEach(horario => {
                        horariosText += `  └ ${horario}\n`;
                    });
                    horariosText += `\n`;
                }
            });

            if (!foundRelevantHorarios) {
                horariosText += "Não foi possível gerar horários pagantes para a hora atual. Tente novamente mais tarde!\n\n";
            }

            const mensagemFinal = `Dica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!\n🔞NÃO INDICADO PARA MENORES🔞\nLembrando a todos!\nHorários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...\n\nSistema By: Aurora\nCreat: Aurora Bot Oficial`;

            horariosText += mensagemFinal;

            // Verificar se há imagem configurada PARA ESTE GRUPO
            try {
                const savedImage = await DataManager.loadConfig(groupId, 'imagemHorarios');
                if (savedImage && savedImage.data) {
                    const { MessageMedia } = require('whatsapp-web.js');
                    const imagemGrupo = new MessageMedia(savedImage.mimetype, savedImage.data, savedImage.filename);
                    await client.sendMessage(groupId, imagemGrupo, { caption: horariosText });
                } else {
                    // Se não há imagem para este grupo, envia só o texto
                    await message.reply(horariosText);
                }
            } catch (error) {
                // Se houver erro ao carregar imagem, envia só o texto
                await message.reply(horariosText);
            }

            // Salvar último envio
            await DataManager.saveConfig(groupId, 'ultimoHorario', moment().format());

        } catch (error) {
            console.error('Erro ao enviar horários:', error);
            await message.reply('❌ Erro ao enviar horários.');
        }
    }

    static async toggleHorarios(client, message, groupId, args) {
        const status = parseInt(args);
        
        if (status !== 0 && status !== 1) {
            await message.reply('❌ Use: !horapg 1 (ativar) ou !horapg 0 (desativar)');
            return;
        }

        try {
            await DataManager.saveConfig(groupId, 'horariosAtivos', status);
            
            // Sincronizar com o painel
            // [CORREÇÃO] Passa o objeto DataManager para a função de sincronização
            await sincronizarGrupoComPainel(groupId, DataManager);
            
            if (status === 1) {
                await message.reply('✅ *Horários pagantes ativados!*\n\n🎰 Dicas automáticas habilitadas\n💡 Use !addhorapg para agendar');
                
                // Iniciar envios automáticos se configurado
                const config = await DataManager.loadConfig(groupId);
                if (config.intervaloHorarios) {
                    this.startAutoHours(client, groupId, config.intervaloHorarios);
                }
            } else {
                await message.reply('❌ *Horários pagantes desativados!*');
                
                // Parar envios automáticos
                this.stopAutoHours(groupId);
            }

        } catch (error) {
            await message.reply('❌ Erro ao configurar horários.');
        }
    }

    static async scheduleNextHour(client, message, groupId, args) {
        const intervalo = this.parseInterval(args);
        
        if (!intervalo) {
            await message.reply('❌ *Intervalo inválido!*\n\n📝 Use: !addhorapg 30m\n🔸 Formatos: 30m, 1h, 2h');
            return;
        }

        try {
            await DataManager.saveConfig(groupId, 'intervaloHorarios', intervalo);
            
            // Verificar se horários estão ativos
            const config = await DataManager.loadConfig(groupId);
            if (config.horariosAtivos === 1) {
                this.startAutoHours(client, groupId, intervalo);
            }

            await message.reply(`⏰ *Próximo horário agendado!*\n\n🎰 Próxima dica em: ${args}\n✅ Envios automáticos configurados`);

        } catch (error) {
            await message.reply('❌ Erro ao agendar horário.');
        }
    }

    static async setImagemHorarios(client, message, groupId, args) {
        try {
            let imageMessage = null;

            // Verificar se há imagem na mensagem atual
            if (message.hasMedia) {
                imageMessage = message;
            } 
            // Verificar se é resposta a uma mensagem com imagem
            else if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    imageMessage = quotedMsg;
                }
            }

            if (!imageMessage) {
                await message.reply('❌ *Nenhuma imagem encontrada!*\n\n📝 *Como usar:*\n• Envie uma imagem com !imagem-horarios na legenda\n• Ou responda uma imagem com !imagem-horarios\n\n💡 Esta imagem será usada nos horários automáticos e manuais APENAS NESTE GRUPO');
                return;
            }

            // Baixar e salvar a imagem
            const media = await imageMessage.downloadMedia();

            // Salvar no sistema para persistência POR GRUPO
            await DataManager.saveConfig(groupId, 'imagemHorarios', {
                data: media.data,
                mimetype: media.mimetype,
                filename: media.filename || 'horarios.jpg',
                savedAt: moment().format()
            });

            await message.reply('✅ *Imagem de horários definida para este grupo!*\n\n🖼️ Esta imagem será usada em:\n• Comando !horarios manual\n• Horários automáticos\n\n📌 *Importante:* A imagem é específica para este grupo');

        } catch (error) {
            console.error('Erro ao definir imagem:', error);
            await message.reply('❌ Erro ao processar imagem. Tente novamente.');
        }
    }

    static parseInterval(intervalStr) {
        if (!intervalStr) return null;
        
        const regex = /^(\d+)(m|h)$/i;
        const match = intervalStr.match(regex);
        
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        switch (unit) {
            case 'm': return value; // minutos
            case 'h': return value * 60; // horas para minutos
            default: return null;
        }
    }

    static startAutoHours(client, groupId, intervalMinutes) {
        // Parar horário existente
        this.stopAutoHours(groupId);
        
        const intervalId = setInterval(async () => {
            try {
                const config = await DataManager.loadConfig(groupId);
                
                // Verificar se ainda está ativo
                if (config.horariosAtivos !== 1) {
                    this.stopAutoHours(groupId);
                    return;
                }

                // Verificar se grupo ainda está ativo
                const status = await RentalSystem.checkGroupStatus(groupId);
                if (!status.active) {
                    this.stopAutoHours(groupId);
                    return;
                }

                // Gerar horários automaticamente (mesmo sistema do manual)
                const now = moment.tz("America/Sao_Paulo");
                const currentHour = now.hours();

                const plataformas = [
                    "🐯 FORTUNE TIGER", "🐉 DRAGON LUCK", "🐰 FORTUNE RABBIT", "🐭 FORTUNE MOUSE",
                    "🐘 GANESHA GOLD", "👙 BIKINI", "🥊 MUAY THAI", "🎪 CIRCUS", "🐂 FORTUNE OX",
                    "💰 DOUBLE FORTUNE", "🐉🐅 DRAGON TIGER LUCK", "🧞 GENIE'S WISHES(GENIO)",
                    "🌳🌲 JUNGLE DELIGHT", "🐷 PIGGY GOLD", "👑 MIDAS FORTUNE", "🌞🌛 SUN & MOON",
                    "🦹‍♂️ WILD BANDITO", "🔥🕊️ PHOENIX RISES", "🛒 SUPERMARKET SPREE",
                    "🚢👨‍✈️ CAPTAIN BOUNTY", "🎃 MISTER HOLLOWEEN", "🍀💰 LEPRECHAUN RICHES"
                ];

                function gerarHorarioAleatorio(horaBase, minIntervalo, maxIntervalo) {
                    const minutoAleatorio = Math.floor(Math.random() * (maxIntervalo - minIntervalo + 1)) + minIntervalo;
                    return `${horaBase.toString().padStart(2, '0')}:${minutoAleatorio.toString().padStart(2, '0')}`;
                }

                let horariosText = `🍀 *SUGESTÃO DE HORÁRIOS PAGANTES DAS ${currentHour.toString().padStart(2, '0')}h* 💰\n\n`;

                plataformas.forEach(plataforma => {
                    const horariosGerados = Array.from({ length: 7 }, () => {
                        const primeiroHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                        const segundoHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                        return `${primeiroHorario} - ${segundoHorario}`;
                    });

                    horariosText += `*${plataforma}*\n`;
                    horariosGerados.forEach(horario => {
                        horariosText += `  └ ${horario}\n`;
                    });
                    horariosText += `\n`;
                });

                const mensagemFinal = `Dica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!\n🔞NÃO INDICADO PARA MENORES🔞\nLembrando a todos!\nHorários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...\n\nSistema By: Aurora\nCreat: Aurora Bot Oficial`;

                horariosText += mensagemFinal;

                // Enviar com imagem se configurada PARA ESTE GRUPO
                try {
                    const savedImage = await DataManager.loadConfig(groupId, 'imagemHorarios');
                    if (savedImage && savedImage.data) {
                        const { MessageMedia } = require('whatsapp-web.js');
                        const imagemGrupo = new MessageMedia(savedImage.mimetype, savedImage.data, savedImage.filename);
                        await client.sendMessage(groupId, imagemGrupo, { caption: horariosText });
                    } else {
                        // Se não há imagem para este grupo, envia só o texto
                        await client.sendMessage(groupId, horariosText);
                    }
                } catch (error) {
                    // Se houver erro ao carregar imagem, envia só o texto
                    await client.sendMessage(groupId, horariosText);
                }

            } catch (error) {
                console.error('Erro no horário automático:', error);
            }
        }, intervalMinutes * 60 * 1000);

        this.activeIntervals.set(groupId, intervalId);
    }

    static stopAutoHours(groupId) {
        if (this.activeIntervals.has(groupId)) {
            clearInterval(this.activeIntervals.get(groupId));
            this.activeIntervals.delete(groupId);
        }
    }

    // Carregar horários automáticos ao iniciar o bot
    static async loadAutoHours(client) {
        try {
            // Não precisamos mais carregar imagem global - cada grupo terá sua própria imagem
            console.log('🎰 Carregando horários automáticos...');

            const configs = await DataManager.loadData('configs.json');
            
            if (configs && configs.grupos) {
                Object.keys(configs.grupos).forEach(groupId => {
                    const groupConfig = configs.grupos[groupId];
                    
                    if (groupConfig.horariosAtivos === 1 && groupConfig.intervaloHorarios) {
                        this.startAutoHours(client, groupId, groupConfig.intervaloHorarios);
                        console.log(`🎰 Horários automáticos ativados para grupo: ${groupId}`);
                    }
                });
            }

            console.log('✅ Horários automáticos carregados');
        } catch (error) {
            console.error('Erro ao carregar horários automáticos:', error);
        }
    }
}

module.exports = HorariosHandler;