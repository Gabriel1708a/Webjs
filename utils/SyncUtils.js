// utils/SyncUtils.js

const axios = require('axios');

/**
 * Sincroniza TODAS as configurações de um grupo específico com o painel.
 * @param {string} groupId O ID do grupo a ser sincronizado.
 * @param {object} dataManager O objeto DataManager já instanciado.
 */
async function sincronizarGrupoComPainel(groupId, dataManager) { // <-- Recebe o dataManager
    try {
        console.log(`[SYNC-COMMAND] Iniciando sincronização para o grupo ${groupId} após comando.`);
        
        // [CORREÇÃO] Verifica se o dataManager foi passado corretamente
        if (!dataManager) {
            console.error(`[SYNC-COMMAND] Falha crítica: O objeto DataManager não foi fornecido.`);
            return;
        }

        // 1. Pega as configurações usando o objeto dataManager recebido
        const configsDoGrupo = await dataManager.loadConfig(groupId);

        // 2. Garante que o panel_user_id existe, pois é obrigatório pela API
        if (!configsDoGrupo || !configsDoGrupo.panel_user_id) {
            console.error(`[SYNC-COMMAND] Falha: panel_user_id não encontrado para o grupo ${groupId}. Sincronização abortada.`);
            return;
        }

        // 3. Define a URL correta para a sincronização forçada
        const apiUrl = process.env.PANEL_API_URL || 'https://painel.botwpp.tech/api';
        const apiToken = process.env.PANEL_API_TOKEN || 'teste';
        const url = `${apiUrl}/groups/${groupId}/force-sync`;

        // 4. Preparar dados para envio ao painel (mesmo formato do comando syncpanel)
        const syncData = {
            panel_user_id: configsDoGrupo.panel_user_id,
            anti_link: configsDoGrupo.antiLink === 'antilink' ? 1 : 0,
            anti_link_gp: configsDoGrupo.antiLink === 'antilinkgp' ? 1 : 0,
            ban_link_gp: configsDoGrupo.antiLink === 'banlinkgp' ? 1 : 0,
            ban_extremo: configsDoGrupo.antiLink === 'banextremo' ? 1 : 0,
            ban_foto: configsDoGrupo.banFoto ? 1 : 0,
            ban_gringo: configsDoGrupo.banGringo ? 1 : 0,
            boas_vindas: configsDoGrupo.boasVindas ? 1 : 0,
            auto_resposta: configsDoGrupo.autoResposta ? 1 : 0,
            soadm: configsDoGrupo.soadm === '1' || configsDoGrupo.soadm === 1 ? 1 : 0,
            horarios_ativos: configsDoGrupo.horariosAtivos ? 1 : 0,
            intervalo_horarios: configsDoGrupo.intervaloHorarios || 60,
            horario_abertura: configsDoGrupo.horarioAbertura || null,
            horario_fechamento: configsDoGrupo.horarioFechamento || null,
        };

        // 5. Envia os dados usando POST para a rota correta
        await axios.post(url, syncData, {
            headers: { 
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        console.log(`[SYNC-COMMAND] ✅ Grupo ${groupId} sincronizado com o painel com sucesso!`);

    } catch (error) {
        const statusCode = error.response ? error.response.status : 'N/A';
        console.error(`[SYNC-COMMAND] ❌ Erro ao sincronizar grupo ${groupId}. Status: ${statusCode}. Erro: ${error.message}`);
    }
}

module.exports = { sincronizarGrupoComPainel };
