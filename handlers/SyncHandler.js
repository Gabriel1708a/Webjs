// handlers/SyncHandler.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('../config.json'); // Ajuste do caminho para o config.json correto

// Caminho para o seu arquivo de configurações local
const CONFIG_PATH = path.join(__dirname, '../data/configs.json'); // Ajuste do caminho para o arquivo configs.json

class SyncHandler {
    constructor(interval) {
        this.interval = interval; // O intervalo será passado pelo index.js
        this.timer = null;
    }

    /**
     * Inicia o loop de sincronização periódica.
     */
    start() {
        console.log(chalk.blue(`[SYNC HANDLER] Sincronização automática iniciada. Verificando a cada ${this.interval / 1000} segundos.`));
        // Executa a primeira vez imediatamente para uma sincronização rápida na inicialização
        this.runSync(); 
        // Inicia o loop com o intervalo definido
        this.timer = setInterval(() => this.runSync(), this.interval);
    }

    /**
     * Para o loop de sincronização (útil para manutenções futuras).
     */
    stop() {
        clearInterval(this.timer);
        console.log(chalk.yellow('[SYNC HANDLER] Sincronização automática parada.'));
    }

    /**
     * A lógica principal que busca, compara e salva as configurações.
     */
    async runSync() {
        console.log(chalk.cyan('[SYNC] Verificando atualizações no painel...'));

        if (!fs.existsSync(CONFIG_PATH)) {
            console.log(chalk.yellow('[SYNC] Arquivo de configuração local não encontrado. Pulando sincronização.'));
            return;
        }

        let configsLocais;
        try {
            configsLocais = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        } catch (error) {
            console.error(chalk.red('[SYNC] Erro ao ler arquivo de configuração local:', error.message));
            return;
        }

        // Verificar se existe a estrutura de grupos
        if (!configsLocais.grupos) {
            console.log(chalk.gray('[SYNC] Nenhuma estrutura de grupos encontrada.'));
            return;
        }

        const gruposGerenciados = Object.keys(configsLocais.grupos);

        if (gruposGerenciados.length === 0) {
            console.log(chalk.gray('[SYNC] Nenhum grupo para sincronizar.'));
            return;
        }

        let algumaMudancaGeral = false;

        for (const groupId of gruposGerenciados) {
            try {
                // Usar as configurações do config.json para API
                const apiUrl = config.laravelApi?.baseUrl || process.env.PANEL_API_URL || 'https://painel.botwpp.tech/api';
                const apiToken = config.laravelApi?.token || process.env.PANEL_API_TOKEN || 'teste';
                
                const url = `${apiUrl}/groups/${groupId}/settings`;
                const response = await axios.get(url, {
                    headers: { 
                        'Authorization': `Bearer ${apiToken}`,
                        'Accept': 'application/json'
                    },
                    timeout: 5000
                });

                const configsDoPainel = response.data;
                const configsDoBot = configsLocais.grupos[groupId];

                // Mapear as configurações do painel para o formato local
                const mapeamento = {
                    'anti_link': 'antiLink',
                    'anti_link_gp': 'antiLinkGp', 
                    'ban_link_gp': 'banLinkGp',
                    'ban_extremo': 'banExtremo',
                    'ban_foto': 'banFoto',
                    'ban_gringo': 'banGringo',
                    'boas_vindas': 'boasVindas',
                    'auto_resposta': 'autoResposta',
                    'soadm': 'soadm',
                    'horarios_ativos': 'horariosAtivos',
                    'intervalo_horarios': 'intervaloHorarios',
                    'horario_abertura': 'horarioAbertura',
                    'horario_fechamento': 'horarioFechamento'
                };

                let mudancaNestGrupo = false;

                for (const [keyPainel, keyLocal] of Object.entries(mapeamento)) {
                    if (configsDoPainel.hasOwnProperty(keyPainel)) {
                        let valorPainel = configsDoPainel[keyPainel];
                        let valorLocal = configsDoBot[keyLocal];

                        // Conversões especiais
                        if (keyLocal === 'antiLink') {
                            // Determinar qual tipo de anti-link está ativo
                            if (configsDoPainel.ban_extremo == 1) valorPainel = 'banextremo';
                            else if (configsDoPainel.ban_link_gp == 1) valorPainel = 'banlinkgp';
                            else if (configsDoPainel.anti_link_gp == 1) valorPainel = 'antilinkgp';
                            else if (configsDoPainel.anti_link == 1) valorPainel = 'antilink';
                            else valorPainel = null;
                        } else if (keyLocal === 'banFoto' || keyLocal === 'banGringo' || keyLocal === 'boasVindas' || keyLocal === 'autoResposta' || keyLocal === 'horariosAtivos') {
                            // Converter 1/0 para boolean
                            valorPainel = valorPainel == 1;
                        } else if (keyLocal === 'soadm') {
                            // Manter como string para compatibilidade
                            valorPainel = String(valorPainel);
                        }

                        // Comparar valores
                        if (String(valorLocal) !== String(valorPainel)) {
                            console.log(chalk.magenta(`[SYNC] Mudança detectada em ${groupId}: '${keyLocal}' de '${valorLocal}' para '${valorPainel}'`));
                            configsDoBot[keyLocal] = valorPainel;
                            mudancaNestGrupo = true;
                            algumaMudancaGeral = true;
                        }
                    }
                }

                if (mudancaNestGrupo) {
                    console.log(chalk.green(`[SYNC] Grupo ${groupId} atualizado com configurações do painel`));
                }

            } catch (error) {
                // Ignora erros 404 (grupo não encontrado no painel), mas loga outros erros.
                if (!error.response || error.response.status !== 404) {
                    console.error(chalk.red(`[SYNC] Erro ao sincronizar o grupo ${groupId}: ${error.message}`));
                }
            }
        }

        if (algumaMudancaGeral) {
            try {
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(configsLocais, null, 2));
                console.log(chalk.blue.bold('[SYNC] Arquivo de configuração local foi atualizado com as mudanças do painel!'));
            } catch (error) {
                console.error(chalk.red('[SYNC] Erro ao salvar configurações atualizadas:', error.message));
            }
        } else {
            console.log(chalk.gray('[SYNC] Nenhuma mudança detectada. Tudo sincronizado.'));
        }
    }
}

module.exports = SyncHandler;
