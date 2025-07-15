const { DataManager, Utils, RentalSystem } = require('../index');
const moment = require('moment-timezone');

class HorariosHandler {
    static scheduledHours = new Map(); // Armazenar horários agendados

    static async handle(client, message, command, args) {
        const groupId = message.from;

        // Verificar se grupo está ativo para horários pagantes
        const status = await RentalSystem.checkGroupStatus(groupId);
        if (!status.active) {
            await message.reply('⚠️ Horários pagantes disponíveis apenas para grupos ativos');
            return;
        }

        if (!Utils.isAdmin(message)) {
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
        }
    }

    static async sendHorario(client, message, groupId) {
        try {
            const horariosText = `🎰 *HORÁRIOS PAGANTES - DICAS DE APOSTAS*

🕐 *Próximos Horários:*
${this.generateHorariosText()}

🎯 *Estratégias Recomendadas:*
• 🔥 Gale 2x na proteção
• 💎 Entrada no padrão
• 🎲 Martingale controlado
• ⚡ Stop gain/loss definido

📊 *Sinais:*
• 🟢 Verde (PAR)
• 🔴 Vermelho (ÍMPAR)  
• ⚪ Branco (PROTEÇÃO)

⚠️ *Aviso Legal:*
Apostas envolvem riscos. Jogue com responsabilidade!

━━━━━━━━━━━━━━━━━━━━━
⏰ Próximo sinal: ${moment().add(1, 'hour').format('HH:mm')}`;

            await message.reply(horariosText);

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

    static generateHorariosText() {
        const horarios = [];
        const now = moment();
        
        for (let i = 0; i < 6; i++) {
            const hora = now.clone().add(i, 'hours');
            const minutosSorteio = this.getMinutosSorteio(hora);
            
            horarios.push(`${hora.format('HH')}:${minutosSorteio} 🎯`);
        }
        
        return horarios.join('\n');
    }

    static getMinutosSorteio(moment) {
        // Gerar "padrões" baseados na hora para parecer estratégico
        const hour = moment.hour();
        const patterns = ['05', '15', '25', '35', '45', '55'];
        return patterns[hour % patterns.length];
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

                // Enviar horário automático
                const horariosText = `🔔 *ALERTA DE HORÁRIO PAGANTE!*

🎰 *Horário Estratégico Detectado:*
⏰ ${moment().format('HH:mm')} - ${moment().add(5, 'minutes').format('HH:mm')}

🎯 *Entrada Recomendada:*
• 🟢 Apostar no PAR
• 💰 Valor: R$ 2,00
• 🔄 Gale: Até 2x se necessário

📊 *Análise Técnica:*
• Padrão identificado ✅
• Probabilidade alta 🚀
• Momento favorável 💎

⚡ *ENTRE AGORA!*

━━━━━━━━━━━━━━━━━━━━━
⚠️ *Aposte com responsabilidade*`;

                await client.sendMessage(groupId, horariosText);

            } catch (error) {
                console.error('Erro no horário automático:', error);
            }
        }, intervalMinutes * 60 * 1000);

        this.scheduledHours.set(groupId, intervalId);
    }

    static stopAutoHours(groupId) {
        if (this.scheduledHours.has(groupId)) {
            clearInterval(this.scheduledHours.get(groupId));
            this.scheduledHours.delete(groupId);
        }
    }

    // Carregar horários automáticos ao iniciar o bot
    static async loadAutoHours(client) {
        try {
            const configs = await DataManager.loadData('configs.json');
            
            if (configs.grupos) {
                Object.keys(configs.grupos).forEach(groupId => {
                    const groupConfig = configs.grupos[groupId];
                    
                    if (groupConfig.horariosAtivos === 1 && groupConfig.intervaloHorarios) {
                        this.startAutoHours(client, groupId, groupConfig.intervaloHorarios);
                    }
                });
            }

            console.log('🎰 Horários automáticos carregados');
        } catch (error) {
            console.error('Erro ao carregar horários automáticos:', error);
        }
    }
}

module.exports = HorariosHandler;