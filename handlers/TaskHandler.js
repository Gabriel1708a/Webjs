const axios = require('axios');
const config = require('../config.json');
const chalk = require('chalk');

class TaskHandler {
    constructor(client) {
        this.client = client; // O cliente 'whatsapp-web.js'
        this.intervalId = null; // Para guardar o ID do nosso timer
    }

    /**
     * Inicia o loop que verifica por novas tarefas a cada 5 segundos.
     */
    start() {
        console.log(chalk.blue('[TAREFAS] Iniciando o verificador de tarefas do painel...'));
        // Executa uma vez imediatamente
        this.fetchAndProcessTasks(); 
        // E depois executa a cada 5 segundos (tempo mínimo para evitar sobrecarga)
        this.intervalId = setInterval(() => this.fetchAndProcessTasks(), 5 * 1000);
    }

    /**
     * Para o loop de verificação de tarefas.
     */
    stop() {
        clearInterval(this.intervalId);
        Logger.info('[TAREFAS] Verificador de tarefas parado.');
    }

    /**
     * Busca tarefas pendentes na API do painel e as processa.
     */
    async fetchAndProcessTasks() {
        try {
            const response = await axios.get(`${config.laravelApi.baseUrl}/tasks/pending`, {
                headers: { 'Authorization': `Bearer ${config.laravelApi.token}` }
            });

            const tasks = response.data.tasks;

            if (tasks && tasks.length > 0) {
                Logger.info(`[TAREFAS] ${tasks.length} nova(s) tarefa(s) encontrada(s).`);
                // Processa as tarefas uma por uma em sequência
                for (const task of tasks) {
                    await this.processTask(task);
                }
            }
        } catch (error) {
            Logger.error(`[TAREFAS] Erro ao buscar tarefas do painel: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Executa uma tarefa específica com base no seu tipo.
     * @param {object} task - O objeto da tarefa vindo da API.
     */
    async processTask(task) {
        // Informa ao painel que começamos a processar esta tarefa
        await this.updateTaskStatus(task.id, 'processing');

        try {
            const payload = task.payload; // O payload já vem como objeto JSON

            if (task.task_type === 'join_group') {
                Logger.info(`[TAREFAS] Processando: Entrar no grupo com identificador ${payload.identifier}`);
                
                // Usa a função do cliente para aceitar o convite ou entrar no grupo pelo ID
                const chat = await this.client.acceptInvite(payload.identifier);
                const realGroupId = chat.id._serialized; // Pega o ID real do grupo (ex: ...@g.us)

                Logger.success(`[TAREFAS] SUCESSO! Entrei no grupo: ${realGroupId}`);

                // Informa ao painel que a tarefa foi concluída com sucesso, enviando o ID real do grupo
                await this.updateTaskStatus(task.id, 'completed', { real_group_id: realGroupId });
            }
            // Futuramente, você pode adicionar outros tipos de tarefas aqui
            // else if (task.task_type === 'leave_group') { ... }

        } catch (error) {
            Logger.error(`[TAREFAS] FALHA ao processar a tarefa ID ${task.id}: ${error.message}`);
            // Informa ao painel que a tarefa falhou, enviando a mensagem de erro
            await this.updateTaskStatus(task.id, 'failed', { error: error.message });
        }
    }

    /**
     * Envia uma atualização de status para a API do painel.
     * @param {number} taskId - O ID da tarefa.
     * @param {string} status - O novo status ('processing', 'completed', 'failed').
     * @param {object} result - Um objeto com os resultados (ex: { real_group_id: '...' } ou { error: '...' }).
     */
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
            Logger.error(`[TAREFAS] Erro CRÍTICO ao ATUALIZAR status da tarefa ${taskId}: ${error.response?.data?.message || error.message}`);
        }
    }
}

module.exports = TaskHandler;