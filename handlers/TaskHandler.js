const axios = require('axios');
const config = require('../config.json');

class TaskHandler {
    constructor(client) {
        this.client = client;
        this.intervalId = null;
    }

    start() {
        console.log('[TAREFAS] Iniciando o verificador de tarefas do painel (rota /api/tasks)...');
        this.fetchAndProcessTasks(); 
        this.intervalId = setInterval(() => this.fetchAndProcessTasks(), 60 * 1000);
    }

    stop() {
        clearInterval(this.intervalId);
        console.log('[TAREFAS] Verificador de tarefas parado.');
    }

    async fetchAndProcessTasks() {
        try {
            const response = await axios.get(`${config.laravelApi.baseUrl}/tasks`, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}` }
            });
            // Suportar diferentes formatos de resposta
            let tasks = response.data.tasks || response.data.data || response.data;
            if (!Array.isArray(tasks)) {
                tasks = [];
            }
            
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
                const identifier = payload.identifier;
                console.log(`[TAREFAS] Processando: Entrar no grupo com identificador limpo: ${identifier}`);
                
                // A função acceptInvite retorna o ID do grupo (ex: ...@g.us)
                const groupId = await this.client.acceptInvite(identifier);

                if (!groupId || typeof groupId !== 'string') {
                    throw new Error('acceptInvite falhou. O convite pode ser inválido, expirado, ou o bot já está no grupo.');
                }

                console.log(`[TAREFAS] Convite aceito. ID do grupo: ${groupId}. Buscando detalhes...`);
                const chat = await this.client.getChatById(groupId);

                if (!chat || !chat.isGroup) {
                    throw new Error(`Não foi possível obter os detalhes do chat para o ID: ${groupId}`);
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
            const response = await axios.post(
                `${config.laravelApi.baseUrl}/tasks/update`, 
                { task_id: taskId, status: status, result: result },
                { headers: { 'Authorization': `Bearer ${config.laravelApi.token}` } }
            );
            console.log(`[TAREFAS] Status da tarefa ${taskId} atualizado para '${status}' no painel.`);
            return response.data;
        } catch (error) {
            console.error(`[TAREFAS] Erro CRÍTICO ao ATUALIZAR status da tarefa ${taskId}:`, error.response?.data || error.message);
        }
    }
}

module.exports = TaskHandler;