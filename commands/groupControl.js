const { DataManager, Utils } = require('../index');
const { sincronizarGrupoComPainel } = require('../utils/SyncUtils');
const moment = require('moment-timezone');

class GroupControlHandler {
    static scheduledTasks = new Map(); // Armazenar tarefas agendadas

    static async handle(client, message, command, args) {
        const groupId = message.from;

        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem controlar o grupo.');
            return;
        }

        switch (command) {
            case 'abrirgrupo':
                await this.openGroup(client, message, groupId);
                break;

            case 'fechargrupo':
                await this.closeGroup(client, message, groupId);
                break;

            case 'abrirgp':
                await this.scheduleOpen(client, message, groupId, args);
                break;

            case 'fechargp':
                await this.scheduleClose(client, message, groupId, args);
                break;

            case 'afgp':
                if (args === '0') {
                    await this.cancelSchedules(client, message, groupId);
                }
                break;
        }
    }

    static async openGroup(client, message, groupId) {
        try {
            const chat = await message.getChat();
            await chat.setMessagesAdminsOnly(false);
            
            await message.reply('🔓 *Grupo aberto!*\n\n✅ Todos os membros podem enviar mensagens');
        } catch (error) {
            console.error('Erro ao abrir grupo:', error);
            await message.reply('❌ Erro ao abrir grupo. Verifique se sou administrador.');
        }
    }

    static async closeGroup(client, message, groupId) {
        try {
            const chat = await message.getChat();
            await chat.setMessagesAdminsOnly(true);
            
            await message.reply('🔒 *Grupo fechado!*\n\n⚠️ Apenas administradores podem enviar mensagens');
        } catch (error) {
            console.error('Erro ao fechar grupo:', error);
            await message.reply('❌ Erro ao fechar grupo. Verifique se sou administrador.');
        }
    }

    static async scheduleOpen(client, message, groupId, args) {
        const horario = this.parseTime(args);
        
        if (!horario) {
            await message.reply('❌ *Horário inválido!*\n\n📝 Use: !abrirgp HH:MM\n🔸 Exemplo: !abrirgp 09:00');
            return;
        }

        try {
            // Salvar configuração
            await DataManager.saveConfig(groupId, 'horarioAbertura', horario);
            
            // Sincronizar com o painel
            await sincronizarGrupoComPainel(groupId);
            
            // Agendar tarefa
            this.scheduleTask(client, groupId, horario, 'open');
            
            await message.reply(`⏰ *Abertura agendada!*\n\n🔓 Grupo abrirá às ${horario} automaticamente`);
        } catch (error) {
            await message.reply('❌ Erro ao agendar abertura.');
        }
    }

    static async scheduleClose(client, message, groupId, args) {
        const horario = this.parseTime(args);
        
        if (!horario) {
            await message.reply('❌ *Horário inválido!*\n\n📝 Use: !fechargp HH:MM\n🔸 Exemplo: !fechargp 18:00');
            return;
        }

        try {
            // Salvar configuração
            await DataManager.saveConfig(groupId, 'horarioFechamento', horario);
            
            // Sincronizar com o painel
            await sincronizarGrupoComPainel(groupId);
            
            // Agendar tarefa
            this.scheduleTask(client, groupId, horario, 'close');
            
            await message.reply(`⏰ *Fechamento agendado!*\n\n🔒 Grupo fechará às ${horario} automaticamente`);
        } catch (error) {
            await message.reply('❌ Erro ao agendar fechamento.');
        }
    }

    static async cancelSchedules(client, message, groupId) {
        // Cancelar tarefas agendadas
        const openKey = `${groupId}_open`;
        const closeKey = `${groupId}_close`;
        
        if (this.scheduledTasks.has(openKey)) {
            clearTimeout(this.scheduledTasks.get(openKey));
            this.scheduledTasks.delete(openKey);
        }
        
        if (this.scheduledTasks.has(closeKey)) {
            clearTimeout(this.scheduledTasks.get(closeKey));
            this.scheduledTasks.delete(closeKey);
        }

        // Remover configurações
        await DataManager.saveConfig(groupId, 'horarioAbertura', null);
        await DataManager.saveConfig(groupId, 'horarioFechamento', null);

        await message.reply('❌ *Agendamentos cancelados!*\n\n🔄 Controle do grupo voltou ao modo manual');
    }

    static parseTime(timeStr) {
        if (!timeStr) return null;
        
        const regex = /^(\d{1,2}):(\d{2})$/;
        const match = timeStr.match(regex);
        
        if (!match) return null;
        
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    static scheduleTask(client, groupId, time, action) {
        const [hours, minutes] = time.split(':').map(Number);
        
        // Cancelar tarefa existente
        const taskKey = `${groupId}_${action}`;
        if (this.scheduledTasks.has(taskKey)) {
            clearTimeout(this.scheduledTasks.get(taskKey));
        }

        const scheduleNext = () => {
            const now = moment();
            const targetTime = moment().hours(hours).minutes(minutes).seconds(0);
            
            // Se o horário já passou hoje, agendar para amanhã
            if (targetTime.isBefore(now)) {
                targetTime.add(1, 'day');
            }
            
            const delay = targetTime.diff(now);
            
            const timeoutId = setTimeout(async () => {
                try {
                    const chat = await client.getChatById(groupId);
                    
                    if (action === 'open') {
                        await chat.setMessagesAdminsOnly(false);
                        await client.sendMessage(groupId, '🔓 *Grupo aberto automaticamente!*\n\n✅ Horário programado atingido');
                    } else if (action === 'close') {
                        await chat.setMessagesAdminsOnly(true);
                        await client.sendMessage(groupId, '🔒 *Grupo fechado automaticamente!*\n\n⏰ Horário programado atingido');
                    }
                    
                    // Pequeno delay antes de reagendar para evitar múltiplas execuções
                    setTimeout(() => {
                        scheduleNext();
                    }, 5000);
                } catch (error) {
                    console.error(`Erro ao executar ${action} automático:`, error);
                    // Reagendar mesmo com erro após delay
                    setTimeout(() => {
                        scheduleNext();
                    }, 10000);
                }
            }, delay);
            
            this.scheduledTasks.set(taskKey, timeoutId);
        };

        scheduleNext();
    }

    // Carregar agendamentos ao iniciar o bot
    static async loadSchedules(client) {
        try {
            const configs = await DataManager.loadData('configs.json');
            
            if (configs.grupos) {
                Object.keys(configs.grupos).forEach(groupId => {
                    const groupConfig = configs.grupos[groupId];
                    
                    if (groupConfig.horarioAbertura) {
                        this.scheduleTask(client, groupId, groupConfig.horarioAbertura, 'open');
                    }
                    
                    if (groupConfig.horarioFechamento) {
                        this.scheduleTask(client, groupId, groupConfig.horarioFechamento, 'close');
                    }
                });
            }

            console.log('⏰ Agendamentos de grupo carregados');
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
        }
    }
}

module.exports = GroupControlHandler;