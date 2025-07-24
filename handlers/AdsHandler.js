const { DataManager, Utils } = require('../index');
const axios = require('axios');
const config = require('../config.json');

class AdsHandler {
    static intervals = new Map(); // Armazenar intervalos ativos

    static async handle(client, message, command, args) {
        const groupId = message.from;

        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            await message.reply('🚫 Apenas administradores podem gerenciar anúncios.');
            return;
        }

        switch (command) {
            case 'addads':
                await this.addAd(client, message, groupId, args);
                break;

            case 'listads':
                await this.listAds(client, message, groupId);
                break;

            case 'rmads':
                await this.removeAd(client, message, groupId, args);
                break;

            case 'statusads':
                await this.showStatus(client, message, groupId);
                break;
        }
    }

    static async addAd(client, message, groupId, args) {
        if (!args.includes('|')) {
            await message.reply('❌ *Formato incorreto!*\n\n📝 Use: !addads mensagem|intervalo\n\n🔸 Exemplo: !addads Visite nosso site!|60\n🔸 Intervalo em minutos\n\n📷 *Suporte a mídia:*\n• Envie imagem/vídeo com comando na legenda\n• Ou responda mídia com o comando');
            return;
        }

        const [mensagem, intervaloStr] = args.split('|').map(s => s.trim());
        const intervalo = parseInt(intervaloStr);

        if (!mensagem || !intervalo || intervalo < 1) {
            await message.reply('❌ *Dados inválidos!*\n\n✅ Mensagem e intervalo (em minutos) são obrigatórios');
            return;
        }

        try {
            const ads = await DataManager.loadData('ads.json');
            if (!ads.anuncios) ads.anuncios = {};
            if (!ads.anuncios[groupId]) ads.anuncios[groupId] = {};
            if (!ads.counters) ads.counters = {};
            if (!ads.counters[groupId]) ads.counters[groupId] = 0;

            // Incrementar contador sequencial para este grupo
            ads.counters[groupId]++;
            const adId = ads.counters[groupId].toString();
            let mediaData = null;

            // Verificar se há mídia
            let mediaMessage = null;
            if (message.hasMedia) {
                mediaMessage = message;
            } else if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    mediaMessage = quotedMsg;
                }
            }

            // Se há mídia, baixar e salvar
            if (mediaMessage) {
                const media = await mediaMessage.downloadMedia();
                mediaData = {
                    data: media.data,
                    mimetype: media.mimetype,
                    filename: media.filename || `anuncio_${adId}.${media.mimetype.split('/')[1]}`
                };
            }

            const adData = {
                id: adId,
                mensagem: mensagem,
                intervalo: intervalo,
                criado: new Date().toISOString(),
                ativo: true,
                media: mediaData,
                tipo: mediaData ? 'midia' : 'texto'
            };

            ads.anuncios[groupId][adId] = adData;
            await DataManager.saveData('ads.json', ads);

            // Sincronizar com o banco de dados de forma aprimorada
            const syncResult = await this.syncAdWithDatabase(groupId, adData, 'create');
            
            // Iniciar intervalo
            this.startAdInterval(client, groupId, adId, adData);

            const tipoMidia = mediaData ? `📷 ${mediaData.mimetype.includes('video') ? 'Vídeo' : 'Imagem'}` : '📝 Texto';
            const syncStatus = syncResult.success ? '✅ Sincronizado com o painel' : '⚠️ Salvo localmente (painel indisponível)';
            
            await message.reply(`✅ *Anúncio criado!*\n\n📢 ID: ${adId}\n⏰ Intervalo: ${intervalo} minutos\n${tipoMidia}\n📝 Mensagem: ${mensagem.substring(0, 50)}${mensagem.length > 50 ? '...' : ''}\n\n🔄 ${syncStatus}`);

        } catch (error) {
            console.error('Erro ao criar anúncio:', error);
            await message.reply('❌ Erro ao criar anúncio. Tente novamente.');
        }
    }

    static async listAds(client, message, groupId) {
        try {
            // Primeiro, tentar buscar do painel
            const panelAds = await this.fetchAdsFromPanel(groupId);
            const localAds = await this.getLocalAds(groupId);

            console.log(`📊 Debug !listads - Grupo: ${groupId}`);
            console.log(`📊 Anúncios do painel:`, panelAds.length);
            console.log(`📊 Anúncios locais:`, Object.keys(localAds).length);

            let allAds = {};

            // Combinar anúncios do painel e locais
            panelAds.forEach(ad => {
                allAds[`panel_${ad.id}`] = {
                    id: `panel_${ad.id}`,
                    mensagem: ad.content || ad.mensagem,
                    intervalo: ad.interval || ad.intervalo,
                    ativo: ad.active !== undefined ? ad.active : ad.ativo,
                    tipo: ad.media_url ? 'midia' : 'texto',
                    origem: 'painel'
                };
            });

            Object.values(localAds).forEach(ad => {
                allAds[`local_${ad.id}`] = {
                    id: `local_${ad.id}`,
                    mensagem: ad.mensagem,
                    intervalo: ad.intervalo,
                    ativo: ad.ativo,
                    tipo: ad.tipo,
                    origem: 'local'
                };
            });

            if (Object.keys(allAds).length === 0) {
                await message.reply('📭 *Nenhum anúncio cadastrado neste grupo*\n\n💡 Use !addads para criar um anúncio');
                return;
            }

            let listTextAtivos = '';
            let listTextInativos = '';
            let countAtivos = 0;
            let countInativos = 0;

            Object.values(allAds).forEach(ad => {
                const tipoIcon = ad.tipo === 'midia' ? '📷' : '📝';
                const origemIcon = ad.origem === 'painel' ? '☁️' : '💾';
                
                const adInfo = `🆔 *ID:* ${ad.id}\n` +
                              `⏰ *Intervalo:* ${ad.intervalo} min\n` +
                              `${tipoIcon} *Tipo:* ${ad.tipo}\n` +
                              `${origemIcon} *Origem:* ${ad.origem}\n` +
                              `📝 *Mensagem:* ${ad.mensagem.substring(0, 80)}${ad.mensagem.length > 80 ? '...' : ''}\n` +
                              `━━━━━━━━━━━━━━━━━━\n\n`;

                if (ad.ativo) {
                    listTextAtivos += adInfo;
                    countAtivos++;
                } else {
                    listTextInativos += adInfo;
                    countInativos++;
                }
            });

            let finalText = `📢 *ANÚNCIOS DO GRUPO:*\n\n`;
            
            if (countAtivos > 0) {
                finalText += `✅ *ATIVOS (${countAtivos}):*\n\n${listTextAtivos}`;
            }
            
            if (countInativos > 0) {
                finalText += `⏸️ *INATIVOS (${countInativos}):*\n\n${listTextInativos}`;
            }

            finalText += `📊 *Total:* ${countAtivos + countInativos} anúncios\n☁️ Painel | 💾 Local`;

            await message.reply(finalText);

        } catch (error) {
            console.error('Erro ao listar anúncios:', error);
            await message.reply('❌ Erro ao listar anúncios. Verifique os logs.');
        }
    }

    static async removeAd(client, message, groupId, args) {
        const adId = args.trim();

        if (!adId) {
            await message.reply('❌ *Digite o ID do anúncio!*\n\n📝 Use: !rmads ID\n💡 Veja os IDs com !listads');
            return;
        }

        try {
            let removed = false;
            let origin = '';

            // Verificar se é um anúncio do painel (panel_X) ou local (local_X)
            if (adId.startsWith('panel_')) {
                const panelId = adId.replace('panel_', '');
                const result = await this.removeAdFromPanel(panelId);
                if (result.success) {
                    removed = true;
                    origin = 'painel';
                }
            } else if (adId.startsWith('local_')) {
                const localId = adId.replace('local_', '');
                const result = await this.removeLocalAd(groupId, localId);
                if (result.success) {
                    removed = true;
                    origin = 'local';
                }
            } else {
                // Tentar remover como ID local (compatibilidade)
                const result = await this.removeLocalAd(groupId, adId);
                if (result.success) {
                    removed = true;
                    origin = 'local';
                }
            }

            if (removed) {
                await message.reply(`✅ *Anúncio removido!*\n\n🗑️ ID: ${adId}\n📍 Origem: ${origin}\n\n🔄 *Sincronizado automaticamente*`);
            } else {
                await message.reply('❌ *Anúncio não encontrado!*\n\n💡 Verifique o ID com !listads');
            }

        } catch (error) {
            console.error('Erro ao remover anúncio:', error);
            await message.reply('❌ Erro ao remover anúncio.');
        }
    }

    static async showStatus(client, message, groupId) {
        try {
            const panelAds = await this.fetchAdsFromPanel(groupId);
            const localAds = await this.getLocalAds(groupId);
            const activeIntervals = Array.from(this.intervals.keys()).filter(key => key.startsWith(groupId)).length;

            const status = `📊 *STATUS DOS ANÚNCIOS*\n\n` +
                          `🏢 *Painel:* ${panelAds.length} anúncios\n` +
                          `💾 *Local:* ${Object.keys(localAds).length} anúncios\n` +
                          `⏰ *Timers ativos:* ${activeIntervals}\n` +
                          `🔗 *Conexão:* ${panelAds.length > 0 ? '✅ Online' : '❌ Offline'}\n\n` +
                          `🔄 *Última verificação:* ${new Date().toLocaleTimeString()}`;

            await message.reply(status);
        } catch (error) {
            console.error('Erro ao mostrar status:', error);
            await message.reply('❌ Erro ao obter status.');
        }
    }

    // Métodos auxiliares aprimorados

    static async fetchAdsFromPanel(groupId) {
        try {
            const response = await axios.get(`${config.laravelApi.baseUrl}/ads`, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            const ads = response.data.data || response.data || [];
            return Array.isArray(ads) ? ads.filter(ad => ad.group_id === groupId) : [];
        } catch (error) {
            console.error('Erro ao buscar anúncios do painel:', error.message);
            return [];
        }
    }

    static async getLocalAds(groupId) {
        try {
            const ads = await DataManager.loadData('ads.json');
            return ads.anuncios && ads.anuncios[groupId] ? ads.anuncios[groupId] : {};
        } catch (error) {
            console.error('Erro ao buscar anúncios locais:', error.message);
            return {};
        }
    }

    static async removeAdFromPanel(adId) {
        try {
            await axios.delete(`${config.laravelApi.baseUrl}/ads/${adId}`, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            return { success: true };
        } catch (error) {
            console.error('Erro ao remover anúncio do painel:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async removeLocalAd(groupId, adId) {
        try {
            const ads = await DataManager.loadData('ads.json');
            
            if (!ads.anuncios || !ads.anuncios[groupId] || !ads.anuncios[groupId][adId]) {
                return { success: false, error: 'Anúncio não encontrado' };
            }

            // Guardar dados do anúncio antes de remover
            const adData = ads.anuncios[groupId][adId];

            // Parar intervalo
            const intervalKey = `${groupId}_${adId}`;
            if (this.intervals.has(intervalKey)) {
                clearInterval(this.intervals.get(intervalKey));
                this.intervals.delete(intervalKey);
            }

            // Remover do arquivo
            delete ads.anuncios[groupId][adId];
            await DataManager.saveData('ads.json', ads);

            // Tentar sincronizar remoção com o painel
            await this.syncAdWithDatabase(groupId, adData, 'delete');

            return { success: true };
        } catch (error) {
            console.error('Erro ao remover anúncio local:', error.message);
            return { success: false, error: error.message };
        }
    }

    static startAdInterval(client, groupId, adId, adData) {
        const intervalKey = `${groupId}_${adId}`;
        
        // Parar intervalo existente se houver
        if (this.intervals.has(intervalKey)) {
            clearInterval(this.intervals.get(intervalKey));
        }

        // Criar novo intervalo
        const intervalId = setInterval(async () => {
            try {
                if (adData.media) {
                    // Recriar MessageMedia para envio
                    const { MessageMedia } = require('whatsapp-web.js');
                    const media = new MessageMedia(adData.media.mimetype, adData.media.data, adData.media.filename);
                    await client.sendMessage(groupId, media, { caption: adData.mensagem });
                } else {
                    await client.sendMessage(groupId, adData.mensagem);
                }
            } catch (error) {
                console.error('Erro ao enviar anúncio:', error);
                // Parar intervalo em caso de erro
                clearInterval(intervalId);
                this.intervals.delete(intervalKey);
            }
        }, adData.intervalo * 60 * 1000);

        this.intervals.set(intervalKey, intervalId);
    }

    // Carregar anúncios ao iniciar o bot
    static async loadAllAds(client) {
        try {
            const ads = await DataManager.loadData('ads.json');
            
            if (ads.anuncios) {
                Object.keys(ads.anuncios).forEach(groupId => {
                    Object.values(ads.anuncios[groupId]).forEach(ad => {
                        if (ad.ativo) {
                            this.startAdInterval(client, groupId, ad.id, ad);
                        }
                    });
                });
            }

            console.log('📢 Anúncios automáticos carregados');
        } catch (error) {
            console.error('Erro ao carregar anúncios:', error);
        }
    }

    /**
     * Sincroniza um anúncio específico com o banco de dados do Laravel (versão aprimorada)
     */
    static async syncAdWithDatabase(groupId, adData, action = 'create') {
        try {
            // Obter panel_user_id das configurações do grupo
            const groupConfig = await DataManager.loadConfig(groupId);
            if (!groupConfig || !groupConfig.panel_user_id) {
                console.warn(`[ADS-SYNC] panel_user_id não encontrado para grupo ${groupId}. Sincronização ignorada.`);
                return { success: false, error: 'panel_user_id não encontrado' };
            }

            const apiUrl = config.laravelApi?.baseUrl || 'https://painel.botwpp.tech/api';
            const apiToken = config.laravelApi?.token || 'teste';

            let url, method, data;

            switch (action) {
                case 'create':
                    url = `${apiUrl}/ads`;
                    method = 'POST';
                    data = {
                        group_id: groupId,
                        content: adData.mensagem,
                        interval: adData.intervalo,
                        unit: 'minutos',
                        media_url: adData.media ? 'local_media' : null,
                        local_ad_id: adData.id,
                        active: adData.ativo
                    };
                    break;

                case 'delete':
                    url = `${apiUrl}/ads/local/${adData.id}`;
                    method = 'DELETE';
                    data = {
                        group_id: groupId
                    };
                    break;

                default:
                    console.warn(`[ADS-SYNC] Ação '${action}' não suportada`);
                    return { success: false, error: 'Ação não suportada' };
            }

            const response = await axios({
                method,
                url,
                data,
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });

            if (response.status >= 200 && response.status < 300) {
                console.log(`[ADS-SYNC] ✅ Anúncio ID ${adData.id} sincronizado (${action}) com banco de dados`);
                return { success: true, data: response.data };
            }

        } catch (error) {
            const status = error.response?.status || 'N/A';
            const message = error.response?.data?.message || error.message;
            console.error(`[ADS-SYNC] ❌ Erro ao sincronizar anúncio ID ${adData.id} (${action}). Status: ${status}. Erro: ${message}`);
            return { success: false, error: message };
        }
    }
}

module.exports = AdsHandler;