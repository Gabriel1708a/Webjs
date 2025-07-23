const axios = require('axios');
const config = require('../config.json');

class TaskHandler {
    constructor(client) {
        this.client = client;
        this.intervalId = null;
    }

    start() {
        console.log('[TAREFAS] Iniciando o verificador de tarefas do painel...');
        this.fetchAndProcessTasks(); 
        this.intervalId = setInterval(() => this.fetchAndProcessTasks(), 60 * 1000);
    }

    stop() {
        clearInterval(this.intervalId);
        console.log('[TAREFAS] Verificador de tarefas parado.');
    }

    async fetchAndProcessTasks() {
        try {
            const response = await axios.get(`${config.laravelApi.baseUrl}/tasks/pending`, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}` }
            });
            const tasks = response.data.tasks;
            if (tasks && tasks.length > 0) {
                console.log(`[TAREFAS] ${tasks.length} nova(s) tarefa(s) encontrada(s).`);
                for (const task of tasks) {
                    await this.processTask(task);
                }
            }
        } catch (error) {
            console.error('[TAREFAS] Erro ao buscar tarefas do painel:', error.response?.data?.message || error.message);
        }
    }

    async processTask(task) {
        await this.updateTaskStatus(task.id, 'processing');

        try {
            const payload = task.payload;

            if (task.task_type === 'join_group') {
                console.log(`[TAREFAS] Processando: Entrar no grupo com identificador ${payload.identifier}`);
                
                // [LÓGICA ATUALIZADA E ROBUSTA]
                let chat;
                
                // Tenta aceitar o convite.
                const inviteResult = await this.client.acceptInvite(payload.identifier);

                if (inviteResult && inviteResult.id) {
                    // Caso 1: O bot entrou no grupo com sucesso.
                    console.log('[TAREFAS] Convite aceito com sucesso.');
                    chat = await this.client.getChatById(inviteResult.id);
                } else {
                    // Caso 2: O bot já está no grupo ou o convite é inválido.
                    // Vamos tentar encontrar o grupo pelo ID do convite.
                    console.log('[TAREFAS] Convite não retornou um chat. Verificando se já estou no grupo...');
                    const allChats = await this.client.getChats();
                    const existingGroup = allChats.find(c => c.isGroup && c.groupMetadata?.inviteCode === payload.identifier);

                    if (existingGroup) {
                        console.log('[TAREFAS] Já estou no grupo. Usando dados existentes.');
                        chat = existingGroup;
                    } else {
                        // Se não encontrou de nenhuma forma, o convite é inválido.
                        throw new Error('Convite inválido ou expirado. Não foi possível entrar ou encontrar o grupo.');
                    }
                }

                // Se chegamos aqui, a variável 'chat' deve ser válida.
                if (!chat || !chat.isGroup) {
                    throw new Error('Não foi possível obter os detalhes do grupo.');
                }

                const realGroupId = chat.id._serialized;
                const groupName = chat.name; 

                console.log(`[TAREFAS] SUCESSO! Dados do grupo "${groupName}" (${realGroupId}) obtidos.`);

                await this.updateTaskStatus(task.id, 'completed', { 
                    real_group_id: realGroupId,
                    group_name: groupName 
                });
            }

        } catch (error) {
            console.error(`[TAREFAS] FALHA ao processar a tarefa ID ${task.id}:`, error.message);
            await this.updateTaskStatus(task.id, 'failed', { error: error.message });
        }
    }

    async updateTaskStatus(taskId, status, result = {}) {
        try {
            await axios.post(`${config.laravelApi.baseUrl}/tasks/update`, {
                task_id: taskId,
                status: status,
                result: result
            }, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}` }
            });
        } catch (error) {
            console.error(`[TAREFAS] Erro CRÍTICO ao ATUALIZAR status da tarefa ${taskId}:`, error.response?.data?.message || error.message);
        }
    }
}

module.exports = TaskHandler;