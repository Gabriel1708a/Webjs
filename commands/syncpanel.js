const { DataManager, Utils } = require('../index');
const axios = require('axios');

class SyncPanelHandler {
    static async handle(client, message, command, args) {
        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem sincronizar configurações com o painel.');
            return;
        }

        const chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply('❌ Este comando só pode ser usado em grupos.');
        }

        try {
            // Mensagem de espera para o usuário
            await message.reply('🔄 Sincronizando configurações com o painel... Por favor, aguarde.');

            const groupId = chat.id._serialized;
            const localConfig = await DataManager.loadConfig(groupId); // Pega as configs do configs.json

            // Verificar se há configurações locais para sincronizar
            if (!localConfig || Object.keys(localConfig).length === 0) {
                await message.reply('⚠️ Nenhuma configuração local encontrada para sincronizar.');
                return;
            }

            // Carregar anúncios do grupo
            const adsData = await DataManager.loadData('ads.json');
            const groupAds = adsData.anuncios && adsData.anuncios[groupId] ? adsData.anuncios[groupId] : {};

            // URLs e token do painel
            const apiUrl = process.env.PANEL_API_URL || 'https://painel.botwpp.tech/api';
            const apiToken = process.env.PANEL_API_TOKEN || 'teste';

            // URL da nova rota no painel
            const syncUrl = `${apiUrl}/groups/${groupId}/force-sync`;

            // Obter o panel_user_id das configurações locais
            const panelUserId = localConfig.panel_user_id;
            if (!panelUserId) {
                await message.reply('⚠️ *Erro:* ID do usuário do painel não encontrado.\n\n💡 *Dica:* Este grupo precisa ter sido adicionado através do painel web primeiro.');
                return;
            }

            // Preparar dados para envio ao painel
            const syncData = {
                // ID do usuário do painel (obrigatório)
                panel_user_id: panelUserId,
                
                // Configurações de anti-link
                anti_link: localConfig.antiLink === 'antilink' ? 1 : 0,
                anti_link_gp: localConfig.antiLink === 'antilinkgp' ? 1 : 0,
                ban_link_gp: localConfig.antiLink === 'banlinkgp' ? 1 : 0,
                ban_extremo: localConfig.antiLink === 'banextremo' ? 1 : 0,
                
                // Outras configurações
                ban_foto: localConfig.banFoto ? 1 : 0,
                ban_gringo: localConfig.banGringo ? 1 : 0,
                boas_vindas: localConfig.boasVindas ? 1 : 0,
                auto_resposta: localConfig.autoResposta ? 1 : 0,
                soadm: localConfig.soadm === '1' || localConfig.soadm === 1 ? 1 : 0,
                
                // Configurações de horários
                horarios_ativos: localConfig.horariosAtivos ? 1 : 0,
                intervalo_horarios: localConfig.intervaloHorarios || 60,
                horario_abertura: localConfig.horarioAbertura || null,
                horario_fechamento: localConfig.horarioFechamento || null,
                
                // Dados adicionais que podem ser úteis
                ultima_sincronizacao: new Date().toISOString(),
                configuracoes_completas: localConfig,
                
                // [NOVO] Anúncios do grupo - formato simplificado para force-sync
                anuncios: Object.values(groupAds).map(ad => ({
                    id: ad.id,
                    mensagem: ad.mensagem,
                    intervalo: ad.intervalo,
                    ativo: ad.ativo,
                    tipo: ad.tipo,
                    criado: ad.criado,
                    tem_media: ad.media ? true : false,
                    tipo_media: ad.media ? ad.media.mimetype : null
                }))
            };

            // Faz a requisição POST, enviando as configurações locais no corpo
            const response = await axios.post(syncUrl, syncData, {
                headers: { 
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000 // 10 segundos de timeout
            });

            // [NOVO] Sincronizar todos os anúncios com o banco de dados
            await this.syncAllAdsToDatabase(groupId, groupAds, panelUserId, apiUrl, apiToken);

            if (response.status === 200 || response.status === 201) {
                let successMessage = '✅ *Sucesso!* Suas configurações atuais do bot foram enviadas e salvas no painel.\n\n';
                
                successMessage += `👤 *Usuário do painel:* ${panelUserId}\n\n`;
                
                // Mostrar resumo das configurações sincronizadas
                successMessage += '📋 *Configurações sincronizadas:*\n';
                if (localConfig.antiLink) successMessage += `• Anti-Link: ${localConfig.antiLink}\n`;
                if (localConfig.banFoto) successMessage += '• Ban Foto: Ativado\n';
                if (localConfig.banGringo) successMessage += '• Ban Gringo: Ativado\n';
                if (localConfig.boasVindas) successMessage += '• Boas-vindas: Ativado\n';
                if (localConfig.autoResposta) successMessage += '• Auto-resposta: Ativado\n';
                if (localConfig.soadm === '1') successMessage += '• Modo SOADM: Ativado\n';
                if (localConfig.horariosAtivos) successMessage += '• Horários: Ativado\n';
                
                // [NOVO] Mostrar informações dos anúncios
                const activeAds = Object.values(groupAds).filter(ad => ad.ativo);
                if (activeAds.length > 0) {
                    successMessage += `• Anúncios: ${activeAds.length} ativo(s)\n`;
                }
                
                successMessage += '\n💡 *Agora suas configurações e anúncios estão sincronizados entre o bot e o painel web!*';
                
                await message.reply(successMessage);
            } else {
                throw new Error(`Resposta inesperada do servidor: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Erro ao executar !syncpanel:', error.message);
            
            let errorMessage = '❌ *Falha ao sincronizar.*\n\n';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage += '🔌 Não foi possível conectar ao painel. Verifique se o serviço está funcionando.';
            } else if (error.response?.status === 404) {
                errorMessage += '🔍 Grupo não encontrado no painel. Verifique se o grupo está cadastrado.';
            } else if (error.response?.status === 401) {
                errorMessage += '🔐 Token de autenticação inválido. Verifique as credenciais do painel.';
            } else if (error.response?.status === 422) {
                errorMessage += '📝 Dados inválidos enviados. Verifique as configurações locais.';
            } else {
                errorMessage += `⚠️ Erro: ${error.message}`;
            }
            
            errorMessage += '\n\n💡 *Dica:* Verifique se o grupo está cadastrado no painel e tente novamente.';
            
            await message.reply(errorMessage);
        }
    }

    /**
     * Sincroniza todos os anúncios locais com o banco de dados
     * @param {string} groupId - ID do grupo
     * @param {object} groupAds - Anúncios do grupo
     * @param {string} panelUserId - ID do usuário do painel
     * @param {string} apiUrl - URL da API
     * @param {string} apiToken - Token da API
     */
    static async syncAllAdsToDatabase(groupId, groupAds, panelUserId, apiUrl, apiToken) {
        try {
            const activeAds = Object.values(groupAds).filter(ad => ad.ativo);
            
            if (activeAds.length === 0) {
                console.log(`[SYNCPANEL] Nenhum anúncio ativo para sincronizar no grupo ${groupId}`);
                return;
            }

            console.log(`[SYNCPANEL] Sincronizando ${activeAds.length} anúncios com o banco de dados...`);

            // Enviar todos os anúncios para o banco
            for (const ad of activeAds) {
                try {
                    const adData = {
                        user_id: panelUserId,
                        group_id: groupId,
                        content: ad.mensagem,
                        interval: ad.intervalo,
                        unit: 'minutos',
                        media_url: ad.media ? 'local_media' : null,
                        local_ad_id: ad.id
                    };

                    await axios.post(`${apiUrl}/ads`, adData, {
                        headers: {
                            'Authorization': `Bearer ${apiToken}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        timeout: 10000
                    });

                    console.log(`[SYNCPANEL] ✅ Anúncio ID ${ad.id} sincronizado com banco de dados`);

                } catch (adError) {
                    console.error(`[SYNCPANEL] ❌ Erro ao sincronizar anúncio ID ${ad.id}:`, adError.message);
                }
            }

            console.log(`[SYNCPANEL] ✅ Sincronização de anúncios concluída`);

        } catch (error) {
            console.error(`[SYNCPANEL] ❌ Erro geral na sincronização de anúncios:`, error.message);
        }
    }
}

module.exports = SyncPanelHandler;
