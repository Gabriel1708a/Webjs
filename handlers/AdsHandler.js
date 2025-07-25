const axios = require('axios');
const config = require('../config.json');
const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const Utils = require('../utils/Utils');
const Sender = require('../utils/Sender'); // Importar Sender para envios seguros

class AdsHandler {
    static intervals = new Map(); // Armazenar intervalos ativos
    static panelCache = new Map(); // Cache para dados do painel
    static cacheExpiry = new Map(); // Controle de expiração do cache
    static CACHE_DURATION = 30000; // 30 segundos de cache

    // Utils locais para evitar dependência circular
    static async loadData(filename) {
        try {
            const filePath = path.join(__dirname, '../data', filename);
            if (!fs.existsSync(filePath)) {
                const defaultData = filename === 'ads.json' ? { anuncios: {} } : {};
                await this.saveData(filename, defaultData);
                return defaultData;
            }
            return await fs.readJson(filePath);
        } catch (error) {
            console.error(`Erro ao carregar ${filename}: ${error.message}`);
            return filename === 'ads.json' ? { anuncios: {} } : {};
        }
    }

    static async saveData(filename, data) {
        try {
            const filePath = path.join(__dirname, '../data', filename);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeJson(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error(`Erro ao salvar ${filename}: ${error.message}`);
            return false;
        }
    }

    static async loadConfig(groupId) {
        try {
            const configs = await this.loadData('configs.json');
            return configs.grupos?.[groupId] || {};
        } catch (error) {
            console.error(`Erro ao carregar config para ${groupId}: ${error.message}`);
            return {};
        }
    }

    static async handleAdsCommand(client, message, command, args) {
        console.log(`[ADS] 📢 Comando: ${command} | Grupo: ${message.from}`);
        
        try {
            const groupId = message.from;
            
            // Verificar se é grupo e se usuário é admin
            const chat = await message.getChat();
            let isAuthorized = false;

            if (chat.isGroup) {
                const participant = chat.participants.find(p => p.id._serialized === message.author);
                isAuthorized = participant && (participant.isAdmin || participant.isSuperAdmin);
            } else {
                isAuthorized = true; // PV sempre autorizado
            }

            if (!isAuthorized) {
                await Sender.sendMessage(client, message.from, '🚫 Apenas administradores podem gerenciar anúncios.');
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
        } catch (error) {
            console.error(`[ADS] Erro no comando ${command}:`, error);
            await Sender.sendMessage(client, message.from, '❌ Erro interno no sistema de anúncios. Tente novamente.');
        }
    }

    static async addAd(client, message, groupId, args) {
        if (!args.includes('|')) {
            await Sender.sendMessage(client, message.from, '❌ *Formato incorreto!*\n\n📝 Use: !addads mensagem|intervalo\n\n🔸 Exemplo: !addads Visite nosso site!|60\n🔸 Intervalo em minutos\n\n📷 *Suporte a mídia:*\n• Envie imagem/vídeo com comando na legenda\n• Ou responda mídia com o comando');
            return;
        }

        const [mensagem, intervaloStr] = args.split('|').map(s => s.trim());
        const intervalo = parseInt(intervaloStr);

        if (!mensagem || !intervalo || intervalo < 1) {
            await Sender.sendMessage(client, message.from, '❌ *Dados inválidos!*\n\n✅ Mensagem e intervalo (em minutos) são obrigatórios');
            return;
        }

        try {
            const ads = await this.loadData('ads.json');
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
            await this.saveData('ads.json', ads);

            // Limpar cache do painel para este grupo
            this.clearCacheForGroup(groupId);

            // Sincronizar com o banco de dados de forma aprimorada
            const syncResult = await this.syncAdWithDatabase(groupId, adData, 'create');
            
            // Iniciar intervalo
            this.startAdInterval(client, groupId, adId, adData);

            const tipoMidia = mediaData ? `📷 ${mediaData.mimetype.includes('video') ? 'Vídeo' : 'Imagem'}` : '📝 Texto';
            const syncStatus = syncResult.success ? '✅ Sincronizado com o painel' : '⚠️ Salvo localmente (painel indisponível)';
            
            await Sender.sendMessage(client, message.from, `✅ *Anúncio criado!*\n\n📢 ID: ${adId}\n⏰ Intervalo: ${intervalo} minutos\n${tipoMidia}\n📝 Mensagem: ${mensagem.substring(0, 50)}${mensagem.length > 50 ? '...' : ''}\n\n🔄 ${syncStatus}`);

        } catch (error) {
            console.error('Erro ao criar anúncio:', error);
            await Sender.sendMessage(client, message.from, '❌ Erro ao criar anúncio. Tente novamente.');
        }
    }

    static async listAds(client, message, groupId) {
        console.log(`📋 [LISTADS] Iniciando listagem para grupo: ${groupId}`);
        
        try {
            // Buscar anúncios em paralelo
            const [panelAds, localAds] = await Promise.all([
                this.fetchAdsFromPanelCached(groupId),
                this.getLocalAds(groupId)
            ]);

            console.log(`📡 [LISTADS] Painel: ${panelAds.length} anúncios`);
            console.log(`💾 [LISTADS] Local: ${Object.keys(localAds).length} anúncios`);

            // Combinar anúncios
            const allAds = {};

            // Processar anúncios do painel
            if (Array.isArray(panelAds)) {
                panelAds.forEach(ad => {
                    try {
                        if (ad && ad.id) {
                            const adId = `panel_${ad.id}`;
                            allAds[adId] = {
                                id: adId,
                                mensagem: ad.mensagem || ad.message || 'Sem mensagem',
                                intervalo: ad.intervalo || ad.interval || 60,
                                ativo: ad.ativo !== undefined ? ad.ativo : (ad.active !== undefined ? ad.active : true),
                                tipo: ad.tipo || ad.type || (ad.media ? 'midia' : 'texto'),
                                origem: 'painel',
                                criado: ad.criado || ad.created_at || new Date().toISOString()
                            };
                        }
                    } catch (err) {
                        console.error(`[LISTADS] Erro ao processar anúncio do painel:`, err);
                    }
                });
            }

            // Processar anúncios locais
            if (localAds && typeof localAds === 'object') {
                Object.values(localAds).forEach(ad => {
                    try {
                        if (ad && ad.id) {
                            const adId = `local_${ad.id}`;
                            allAds[adId] = {
                                id: adId,
                                mensagem: ad.mensagem || 'Sem mensagem',
                                intervalo: ad.intervalo || 60,
                                ativo: ad.ativo !== undefined ? ad.ativo : true,
                                tipo: ad.tipo || (ad.media ? 'midia' : 'texto'),
                                origem: 'local',
                                criado: ad.criado || new Date().toISOString()
                            };
                        }
                    } catch (err) {
                        console.error(`[LISTADS] Erro ao processar anúncio local:`, err);
                    }
                });
            }

            const totalAds = Object.keys(allAds).length;
            console.log(`📊 [LISTADS] Total de anúncios combinados: ${totalAds}`);

            if (totalAds === 0) {
                await Sender.sendMessage(client, message.from, '📭 *Nenhum anúncio cadastrado neste grupo*\n\n💡 Use !addads para criar um anúncio\n\n🔍 *Fontes verificadas:*\n☁️ Painel Laravel\n💾 Arquivo local');
                return;
            }

            let listTextAtivos = '';
            let listTextInativos = '';
            let countAtivos = 0;
            let countInativos = 0;

            Object.values(allAds).forEach(ad => {
                try {
                    const tipoIcon = ad.tipo === 'midia' ? '🖼️' : '📝';
                    const origemIcon = ad.origem === 'painel' ? '☁️' : '💾';
                    const statusIcon = ad.ativo ? '🟢' : '🔴';
                    
                    const adInfo = `${statusIcon} *ID:* ${ad.id}\n` +
                                  `⏰ *Intervalo:* ${ad.intervalo} min\n` +
                                  `${tipoIcon} *Tipo:* ${ad.tipo} ${origemIcon}\n` +
                                  `📝 *Mensagem:* ${ad.mensagem.substring(0, 60)}${ad.mensagem.length > 60 ? '...' : ''}\n` +
                                  `📅 *Criado:* ${new Date(ad.criado).toLocaleDateString('pt-BR')}\n` +
                                  `━━━━━━━━━━━━━━━━━━\n\n`;

                    if (ad.ativo) {
                        listTextAtivos += adInfo;
                        countAtivos++;
                    } else {
                        listTextInativos += adInfo;
                        countInativos++;
                    }
                } catch (err) {
                    console.error(`[LISTADS] Erro ao formatar anúncio:`, err);
                }
            });

            let finalText = `📢 *ANÚNCIOS DO GRUPO*\n\n`;
            
            if (countAtivos > 0) {
                finalText += `✅ *ATIVOS (${countAtivos}):*\n\n${listTextAtivos}`;
            }
            
            if (countInativos > 0) {
                finalText += `⏸️ *INATIVOS (${countInativos}):*\n\n${listTextInativos}`;
            }

            finalText += `📊 *Total:* ${totalAds} anúncios\n`;
            finalText += `🔍 *Fontes:* ☁️ Painel (${panelAds.length}) | 💾 Local (${Object.keys(localAds).length})`;

            // Usar Sender para envio seguro e evitar validateAndGetParts
            await Sender.sendMessage(client, message.from, finalText);
            console.log(`📊 [LISTADS] Listagem enviada com sucesso - ${totalAds} anúncios`);

        } catch (error) {
            console.error('[LISTADS] Erro crítico ao listar anúncios:', error);
            await Sender.sendMessage(client, message.from, '❌ *Erro ao listar anúncios*\n\n🔍 Verifique os logs para mais detalhes.\n💡 Tente novamente em alguns segundos.');
        }
    }

    static async removeAd(client, message, groupId, args) {
        const adId = args.trim();

        if (!adId) {
            await Sender.sendMessage(client, message.from, '❌ *Digite o ID do anúncio!*\n\n📝 Use: !rmads ID\n💡 Veja os IDs com !listads');
            return;
        }

        try {
            console.log(`[RMADS] Iniciando remoção do anúncio: ${adId} no grupo: ${groupId}`);
            
            // Limpar cache antes da remoção
            this.clearCacheForGroup(groupId);
            
            let removed = false;
            let origin = '';
            let errorMessage = '';

            // Tentar remover do painel se for anúncio do painel
            if (adId.startsWith('panel_')) {
                try {
                    const panelId = adId.replace('panel_', '');
                    await this.removeFromPanel(groupId, panelId);
                    removed = true;
                    origin = 'Painel Laravel';
                } catch (panelError) {
                    console.error('[RMADS] Erro ao remover do painel:', panelError);
                    errorMessage = `Erro no painel: ${panelError.message}`;
                }
            }

            // Tentar remover local
            if (adId.startsWith('local_') || !removed) {
                try {
                    const localAds = await this.getLocalAds(groupId);
                    const localId = adId.startsWith('local_') ? adId : `local_${adId}`;
                    
                    if (localAds[localId]) {
                        delete localAds[localId];
                        await this.saveLocalAds(groupId, localAds);
                        removed = true;
                        origin = origin ? `${origin} + Local` : 'Local';
                    } else if (!removed) {
                        errorMessage = 'ID não encontrado nos arquivos locais';
                    }
                } catch (localError) {
                    console.error('[RMADS] Erro ao remover local:', localError);
                    if (!removed) {
                        errorMessage = `Erro local: ${localError.message}`;
                    }
                }
            }

            if (removed) {
                await Sender.sendMessage(client, message.from, `✅ *Anúncio removido com sucesso!*\n\n🗑️ *ID:* ${adId}\n📍 *Origem:* ${origin}\n🔄 *Status:* Sincronizado automaticamente`);
                console.log(`[RMADS] ✅ Anúncio removido: ${adId} - Origem: ${origin}`);
            } else {
                await Sender.sendMessage(client, message.from, `❌ *Anúncio não encontrado!*\n\n🔍 *ID:* ${adId}\n📝 *Erro:* ${errorMessage}\n\n💡 Use !listads para ver anúncios disponíveis\n🔧 Use o ID completo (ex: local_1 ou panel_2)`);
                console.log(`[RMADS] ❌ Falha na remoção: ${adId} - ${errorMessage}`);
            }

        } catch (error) {
            console.error('[RMADS] Erro crítico:', error);
            await Sender.sendMessage(client, message.from, '❌ *Erro interno ao remover anúncio*\n\n🔍 Verifique os logs do sistema\n💡 Tente novamente em alguns segundos');
        }
    }

    static async showStatus(client, message, groupId) {
        try {
            const [panelAds, localAds] = await Promise.all([
                this.fetchAdsFromPanelCached(groupId),
                this.getLocalAds(groupId)
            ]);

            const panelCount = Array.isArray(panelAds) ? panelAds.length : 0;
            const localCount = Object.keys(localAds).length;
            const totalCount = panelCount + localCount;

            const status = `📊 *STATUS DOS ANÚNCIOS*\n\n` +
                          `☁️ *Painel Laravel:* ${panelCount} anúncios\n` +
                          `💾 *Arquivo Local:* ${localCount} anúncios\n` +
                          `📈 *Total:* ${totalCount} anúncios\n\n` +
                          `🔄 *Cache:* ${this.panelCache.has(groupId) ? 'Ativo' : 'Vazio'}\n` +
                          `⏰ *Última atualização:* ${new Date().toLocaleString('pt-BR')}`;

            await Sender.sendMessage(client, message.from, status);
        } catch (error) {
            console.error('[STATUSADS] Erro:', error);
            await Sender.sendMessage(client, message.from, '❌ Erro ao obter status.');
        }
    }

    // Métodos auxiliares otimizados

    static async fetchAdsFromPanelCached(groupId) {
        const cacheKey = `panel_ads_${groupId}`;
        const now = Date.now();
        
        // Verificar se existe cache válido
        if (this.panelCache.has(cacheKey) && this.cacheExpiry.has(cacheKey)) {
            const expiry = this.cacheExpiry.get(cacheKey);
            if (now < expiry) {
                console.log(`[CACHE] Usando cache para grupo ${groupId}`);
                return this.panelCache.get(cacheKey);
            }
        }

        // Buscar dados atualizados
        const ads = await this.fetchAdsFromPanel(groupId);
        
        // Salvar no cache
        this.panelCache.set(cacheKey, ads);
        this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
        
        return ads;
    }

    static async fetchAdsFromPanel(groupId) {
        try {
            console.log(`[API] Buscando anúncios do painel para grupo: ${groupId}`);
            
            if (!config.laravelApi?.enabled) {
                console.log(`[API] API do painel desabilitada`);
                return [];
            }

            const response = await axios.get(`${config.laravelApi.baseUrl}/ads`, {
                headers: {
                    'Authorization': `Bearer ${config.laravelApi.token}`,
                    'Accept': 'application/json',
                    'User-Agent': 'WhatsApp-Bot/2.0'
                },
                timeout: 15000, // Aumentado para 15 segundos
                maxRedirects: 3,
                validateStatus: function (status) {
                    return status >= 200 && status < 300;
                }
            });

            let ads = [];
            
            // Tratamento robusto da resposta
            if (response.data) {
                if (Array.isArray(response.data)) {
                    ads = response.data;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    ads = response.data.data;
                } else if (response.data.ads && Array.isArray(response.data.ads)) {
                    ads = response.data.ads;
                }
            }

            // Filtrar por grupo com tratamento de erro
            const filteredAds = ads.filter(ad => {
                try {
                    return ad && (ad.group_id === groupId || ad.groupId === groupId);
                } catch (err) {
                    console.warn(`[API] Erro ao filtrar anúncio:`, err);
                    return false;
                }
            });

            console.log(`[API] Encontrados ${filteredAds.length} anúncios do painel para grupo ${groupId}`);
            return filteredAds;

        } catch (error) {
            const status = error.response?.status || 'N/A';
            const statusText = error.response?.statusText || 'N/A';
            console.error(`[API] Erro ao buscar anúncios do painel - Status: ${status} (${statusText}), Erro: ${error.message}`);
            
            // Em caso de erro, retornar array vazio mas logar detalhes
            if (error.code === 'ECONNREFUSED') {
                console.error(`[API] Conexão recusada - Painel pode estar offline`);
            } else if (error.code === 'ETIMEDOUT') {
                console.error(`[API] Timeout - Painel demorou para responder`);
            }
            
            return [];
        }
    }

    static async getLocalAds(groupId) {
        try {
            console.log(`[LOCAL] Buscando anúncios locais para grupo: ${groupId}`);
            
            const ads = await this.loadData('ads.json');
            const localAds = ads.anuncios && ads.anuncios[groupId] ? ads.anuncios[groupId] : {};
            
            console.log(`[LOCAL] Encontrados ${Object.keys(localAds).length} anúncios locais para grupo ${groupId}`);
            return localAds;
            
        } catch (error) {
            console.error('[LOCAL] Erro ao buscar anúncios locais:', error.message);
            return {};
        }
    }

    static async removeFromPanel(groupId, adId) {
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
            console.log(`[REMOVE-LOCAL] Tentando remover anúncio local ${adId} do grupo ${groupId}`);
            
            const ads = await this.loadData('ads.json');
            
            if (!ads.anuncios || !ads.anuncios[groupId] || !ads.anuncios[groupId][adId]) {
                console.log(`[REMOVE-LOCAL] Anúncio ${adId} não encontrado no grupo ${groupId}`);
                console.log(`[REMOVE-LOCAL] Anúncios disponíveis no grupo:`, Object.keys(ads.anuncios?.[groupId] || {}));
                return { success: false, error: 'Anúncio não encontrado' };
            }

            // Guardar dados do anúncio antes de remover
            const adData = ads.anuncios[groupId][adId];
            console.log(`[REMOVE-LOCAL] Anúncio encontrado:`, { id: adData.id, mensagem: adData.mensagem?.substring(0, 50) });

            // Parar intervalo
            const intervalKey = `${groupId}_${adId}`;
            if (this.intervals.has(intervalKey)) {
                clearInterval(this.intervals.get(intervalKey));
                this.intervals.delete(intervalKey);
                console.log(`[REMOVE-LOCAL] Timer ${intervalKey} parado`);
            } else {
                console.log(`[REMOVE-LOCAL] Timer ${intervalKey} não estava ativo`);
            }

            // Remover do arquivo
            delete ads.anuncios[groupId][adId];
            await this.saveData('ads.json', ads);
            console.log(`[REMOVE-LOCAL] Anúncio ${adId} removido do arquivo`);

            // Tentar sincronizar remoção com o painel
            try {
                const syncResult = await this.syncAdWithDatabase(groupId, adData, 'delete');
                if (syncResult.success) {
                    console.log(`[REMOVE-LOCAL] Sincronização com painel bem-sucedida`);
                } else {
                    console.log(`[REMOVE-LOCAL] Falha na sincronização com painel:`, syncResult.error);
                }
            } catch (syncError) {
                console.log(`[REMOVE-LOCAL] Erro na sincronização com painel:`, syncError.message);
            }

            return { success: true };
        } catch (error) {
            console.error('[REMOVE-LOCAL] Erro crítico ao remover anúncio local:', error);
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

    // Carregar anúncios ao iniciar o bot (otimizado)
    static async loadAllAds(client) {
        try {
            console.log('📢 [INIT] Iniciando carregamento de anúncios...');
            
            const ads = await this.loadData('ads.json');
            let totalLoaded = 0;
            let activeLoaded = 0;
            
            if (ads.anuncios) {
                // Processar grupos em paralelo para melhor performance
                const groupPromises = Object.keys(ads.anuncios).map(async (groupId) => {
                    const groupAds = ads.anuncios[groupId];
                    let groupActive = 0;
                    
                    Object.values(groupAds).forEach(ad => {
                        totalLoaded++;
                        if (ad && ad.ativo && ad.id && ad.intervalo) {
                            try {
                                this.startAdInterval(client, groupId, ad.id, ad);
                                activeLoaded++;
                                groupActive++;
                            } catch (err) {
                                console.error(`[INIT] Erro ao iniciar anúncio ${ad.id}:`, err);
                            }
                        }
                    });
                    
                    if (groupActive > 0) {
                        console.log(`[INIT] Grupo ${groupId}: ${groupActive} anúncios ativos carregados`);
                    }
                });
                
                await Promise.all(groupPromises);
            }

            console.log(`📢 [INIT] Anúncios carregados: ${activeLoaded}/${totalLoaded} ativos`);
            
            // Limpar cache na inicialização
            this.clearAllCache();
            
        } catch (error) {
            console.error('❌ [INIT] Erro ao carregar anúncios:', error);
        }
    }

    /**
     * Sincroniza um anúncio específico com o banco de dados do Laravel (versão aprimorada)
     */
    static async syncAdWithDatabase(groupId, adData, action = 'create') {
        try {
            // Obter panel_user_id das configurações do grupo
            const groupConfig = await this.loadConfig(groupId);
            console.log(`[ADS-SYNC] 🔍 Configuração do grupo ${groupId}:`, JSON.stringify(groupConfig, null, 2));
            
            if (!groupConfig || !groupConfig.panel_user_id) {
                console.warn(`[ADS-SYNC] ❌ panel_user_id não encontrado para grupo ${groupId}. Sincronização ignorada.`);
                console.warn(`[ADS-SYNC] 💡 Dica: Certifique-se de que o grupo foi confirmado via painel primeiro.`);
                return { success: false, error: 'panel_user_id não encontrado' };
            }
            
            console.log(`[ADS-SYNC] ✅ panel_user_id encontrado: ${groupConfig.panel_user_id}`);

            const apiUrl = config.laravelApi?.baseUrl || 'https://painel.botwpp.tech/api';
            const apiToken = config.laravelApi?.token || 'teste';

            let url, method, data;

            switch (action) {
                case 'create':
                    url = `${apiUrl}/ads`;
                    method = 'POST';
                    data = {
                        user_id: groupConfig.panel_user_id, // [CORREÇÃO CRÍTICA] - Incluir user_id do painel
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

    static clearCacheForGroup(groupId) {
        const cacheKey = `panel_ads_${groupId}`;
        this.panelCache.delete(cacheKey);
        this.cacheExpiry.delete(cacheKey);
        console.log(`[CACHE] Cache limpo para grupo ${groupId}`);
    }

    static clearAllCache() {
        this.panelCache.clear();
        this.cacheExpiry.clear();
        console.log(`[CACHE] Todo cache limpo`);
    }
}

module.exports = AdsHandler;