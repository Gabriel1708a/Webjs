const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

// Ajuste os caminhos para apontar para os arquivos corretos a partir da pasta 'commands'
// O '../' sobe um nível de diretório.
const { Utils } = require('../utils/Utils'); // Supondo que Utils.js esteja em utils/
const Sender = require('../Sender'); // Supondo que Sender.js esteja na raiz

// --- CONFIGURAÇÃO CENTRALIZADA ---
const config = {
    adsFilePath: path.join(__dirname, '../data/ads.json'), // Caminho para o arquivo ads.json
    syncIntervalSeconds: 15 // Intervalo para sincronizar com o arquivo local (em segundos)
};

class AdManager {
    // Armazena todos os timers ativos, chaveados por um ID único (ex: 'panel_123')
    static activeTimers = new Map();
    static client = null; // Armazena a instância do cliente do WhatsApp

    /**
     * Ponto de entrada principal. Inicia o sistema de anúncios.
     * Começa a sincronização com o painel.
     */
    static async initialize(client) {
        console.log('📢 [AdManager] Iniciando serviço de anúncios (arquivo local)...');
        this.client = client; // Armazena a instância do cliente para uso posterior

        // Verificar se o arquivo ads.json existe
        console.log('🔧 [AdManager] Configuração:', {
            adsFilePath: config.adsFilePath,
            syncInterval: config.syncIntervalSeconds + 's'
        });

        // Criar arquivo ads.json se não existir
        await this.ensureAdsFileExists();

        // Inicia a sincronização periódica com o arquivo local
        setInterval(() => this.syncWithAdsFile(), config.syncIntervalSeconds * 1000);
        
        // Realiza a primeira sincronização imediatamente
        await this.syncWithAdsFile();
    }

    //================================================================================
    // SEÇÃO: MANIPULAÇÃO DE COMANDOS DO WHATSAPP
    //================================================================================

    /**
     * Manipula os comandos (!addads, !listads, !rmads) vindos do WhatsApp.
     */
    static async handleCommand(message, command, args) {
        // A verificação de admin agora usa o Utils.js importado
        if (!(await Utils.isAdmin(message)) && !Utils.isOwner(message)) {
            return message.reply('🚫 Apenas administradores podem gerenciar anúncios.');
        }

        switch (command) {
            case 'addads':
                await this.createAdFromCommand(message, args);
                break;
            case 'listads':
                await this.listAllAds(message);
                break;
            case 'rmads':
                await this.removeAdFromCommand(message, args);
                break;
        }
    }

    /**
     * Cria um novo anúncio a partir do comando !addads e o sincroniza com o painel.
     */
    static async createAdFromCommand(message, args) {
        if (!args.includes('|')) {
            return message.reply('❌ *Formato incorreto!*\n\n📝 Use: `!addads mensagem|intervalo`\n\n🔸 Exemplo: `!addads Visite nosso site!|60`\n🔸 O intervalo é em minutos.');
        }

        const [content, intervalStr] = args.split('|').map(s => s.trim());
        const interval = parseInt(intervalStr);

        if (!content || !interval || isNaN(interval) || interval < 1) {
            return message.reply('❌ *Dados inválidos!*\n\n✅ A mensagem e o intervalo (em minutos, maior que 0) são obrigatórios.');
        }

        try {
            // Carregar anúncios existentes
            const adsData = await this.loadAdsFromFile();
            const groupId = message.from;

            // Gerar ID único para o anúncio
            const adId = Date.now().toString();

            // Criar novo anúncio
            const newAd = {
                id: adId,
                group_id: groupId,
                content: content,
                interval: interval,
                unit: 'minutes',
                created_at: new Date().toISOString(),
                active: true
            };

            // Adicionar ao arquivo
            if (!adsData.anuncios[groupId]) {
                adsData.anuncios[groupId] = {};
            }
            adsData.anuncios[groupId][adId] = newAd;

            // Salvar arquivo
            await this.saveAdsToFile(adsData);

            console.log(`[AdManager] Novo anúncio criado no arquivo local - ID: ${adId}`);
            
            // Força uma sincronização para o anúncio começar a rodar imediatamente
            await this.syncWithAdsFile();

            await message.reply(`✅ *Anúncio criado com sucesso!*\n\n📢 ID: *${adId}*\n⏰ Intervalo: *${interval} minutos*\n🚀 O anúncio começará a ser enviado em breve!`);

        } catch (error) {
            console.error('❌ Erro ao criar anúncio:', error.message);
            await message.reply('❌ Erro ao criar anúncio. Verifique os logs.');
        }
    }

    /**
     * Lista TODOS os anúncios ativos para o grupo atual.
     */
    static async listAllAds(message) {
        const groupId = message.from;
        let listText = '📢 *ANÚNCIOS ATIVOS (Arquivo Local):*\n\n';
        let foundAds = false;

        try {
            // Carregar anúncios do arquivo
            const adsData = await this.loadAdsFromFile();
            
            if (adsData.anuncios[groupId]) {
                Object.keys(adsData.anuncios[groupId]).forEach(adId => {
                    const ad = adsData.anuncios[groupId][adId];
                    if (ad.active) {
                        foundAds = true;
                        const tipoIcon = ad.full_media_url ? '🖼️ Mídia' : '📝 Texto';
                        const status = this.activeTimers.has(`local_${adId}`) ? '🟢 Ativo' : '🔴 Parado';
                        
                        listText += `🆔 *ID:* ${adId}\n`;
                        listText += `⏰ *Intervalo:* ${ad.interval} ${ad.unit}\n`;
                        listText += `${tipoIcon} ${status}\n`;
                        listText += `💬 *Mensagem:* ${ad.content.substring(0, 50)}${ad.content.length > 50 ? '...' : ''}\n`;
                        listText += `📅 *Criado:* ${new Date(ad.created_at).toLocaleString('pt-BR')}\n`;
                        listText += `━━━━━━━━━━━━━━━━━━\n\n`;
                    }
                });
            }

            if (!foundAds) {
                listText = `📭 *Nenhum anúncio ativo para este grupo.*\n\n💡 Use \`!addads mensagem|intervalo\` para criar um anúncio.`;
            }

            await message.reply(listText);
        } catch (error) {
            console.error('[AdManager] Erro ao listar anúncios:', error.message);
            await message.reply('❌ Erro ao carregar lista de anúncios. Verifique os logs.');
        }
    }

    /**
     * Remove um anúncio (seja local ou do painel) a partir do comando !rmads.
     */
    static async removeAdFromCommand(message, args) {
        const adIdToRemove = args.trim();
        if (!adIdToRemove) {
            return message.reply('❌ *Digite o ID do anúncio!*\n\n📝 Use: `!rmads ID`\n💡 Veja os IDs com `!listads`');
        }

        try {
            // Carregar anúncios existentes
            const adsData = await this.loadAdsFromFile();
            const groupId = message.from;

            // Verificar se o anúncio existe neste grupo
            if (!adsData.anuncios[groupId] || !adsData.anuncios[groupId][adIdToRemove]) {
                return message.reply(`❌ *Anúncio ID ${adIdToRemove} não encontrado neste grupo!*\n\n💡 Use \`!listads\` para ver os anúncios disponíveis.`);
            }

            // Remover do arquivo
            delete adsData.anuncios[groupId][adIdToRemove];

            // Se não há mais anúncios no grupo, remover o grupo também
            if (Object.keys(adsData.anuncios[groupId]).length === 0) {
                delete adsData.anuncios[groupId];
            }

            // Salvar arquivo
            await this.saveAdsToFile(adsData);

            // Para o timer local imediatamente
            const timerKey = `local_${adIdToRemove}`;
            if (this.activeTimers.has(timerKey)) {
                clearInterval(this.activeTimers.get(timerKey).timerId);
                this.activeTimers.delete(timerKey);
                console.log(`[AdManager] Timer do anúncio ID ${adIdToRemove} removido.`);
            }

            await message.reply(`✅ *Anúncio ID ${adIdToRemove} removido com sucesso!*`);

        } catch (error) {
            console.error(`❌ Erro ao remover anúncio ID ${adIdToRemove}:`, error.message);
            await message.reply(`❌ Falha ao remover o anúncio. Verifique os logs.`);
        }
    }


    //================================================================================
    // SEÇÃO: SINCRONIZAÇÃO COM ARQUIVO LOCAL
    //================================================================================

    static async syncWithAdsFile() {
        try {
            console.log('📡 [AdManager] Sincronizando com arquivo ads.json...');
            
            // Carregar anúncios do arquivo local
            const adsData = await this.loadAdsFromFile();
            const localMessages = [];

            // Converter estrutura do arquivo para array
            Object.keys(adsData.anuncios).forEach(groupId => {
                Object.keys(adsData.anuncios[groupId]).forEach(adId => {
                    const ad = adsData.anuncios[groupId][adId];
                    if (ad.active) {
                        localMessages.push(ad);
                    }
                });
            });

            console.log(`[AdManager] ${localMessages.length} anúncios ativos encontrados no arquivo.`);

            const localMessageIds = new Set(localMessages.map(m => `local_${m.id}`));

            // 1. Remove timers de anúncios que não existem mais no arquivo
            this.activeTimers.forEach((timerData, uniqueId) => {
                if (timerData.source === 'local' && !localMessageIds.has(uniqueId)) {
                    console.log(`[AdManager] Anúncio local (ID: ${timerData.id}) removido. Parando timer.`);
                    clearInterval(timerData.timerId);
                    this.activeTimers.delete(uniqueId);
                }
            });

            // 2. Adiciona ou atualiza anúncios vindos do arquivo
            for (const ad of localMessages) {
                this.scheduleAd(ad, 'local');
            }
            
            console.log(`✅ [AdManager] Sincronização concluída. Total de timers ativos: ${this.activeTimers.size}`);

        } catch (error) {
            console.error('❌ [AdManager] Erro ao sincronizar com arquivo ads.json:', error.message);
        }
    }

    static scheduleAd(adData, source) {
        const uniqueId = `${source}_${adData.id}`;
        const existingTimerData = this.activeTimers.get(uniqueId);

        if (existingTimerData) {
            const hasChanged =
                existingTimerData.content !== adData.content ||
                existingTimerData.interval !== adData.interval ||
                existingTimerData.unit !== adData.unit ||
                existingTimerData.full_media_url !== adData.full_media_url;

            if (!hasChanged) return;

            console.log(`[AdManager] Anúncio ${uniqueId} foi atualizado. Reagendando...`);
            clearInterval(existingTimerData.timerId);
        }

        const intervalMs = this.convertIntervalToMs(adData.interval, adData.unit);
        if (intervalMs <= 0) {
            console.warn(`[AdManager] Anúncio ${uniqueId} com intervalo inválido. Não será agendado.`);
            return;
        }

        const timerId = setInterval(() => this.sendAd(adData), intervalMs);
        this.activeTimers.set(uniqueId, { ...adData, timerId, source });
        console.log(`[AdManager] Anúncio ${uniqueId} agendado para o grupo ${adData.group_id} a cada ${intervalMs}ms.`);
    }

    static async sendAd(adData) {
        if (!adData.group_id) {
            console.error(`❌ [AdManager] ERRO CRÍTICO: Tentativa de enviar anúncio ID ${adData.id} sem um group_id.`);
            return;
        }

        try {
            console.log(`🚀 [AdManager] Enviando anúncio ID ${adData.id} para o grupo ${adData.group_id}...`);
            
            // Enviar mensagem usando o Sender
            const success = await Sender.sendMessage(
                this.client,
                adData.group_id,
                adData.content,
                adData.full_media_url || null // URL da mídia se existir
            );

            if (success) {
                console.log(`✅ [AdManager] Anúncio ID ${adData.id} enviado com sucesso!`);
            } else {
                console.error(`❌ [AdManager] Falha ao enviar anúncio ID ${adData.id}`);
            }
        } catch (error) {
            console.error(`❌ [AdManager] Erro ao enviar anúncio ID ${adData.id}:`, error);
        }
    }

    //================================================================================
    // SEÇÃO: FUNÇÕES DE ARQUIVO
    //================================================================================

    /**
     * Garante que o arquivo ads.json existe
     */
    static async ensureAdsFileExists() {
        try {
            if (!await fs.pathExists(config.adsFilePath)) {
                const initialData = { anuncios: {} };
                await fs.writeJson(config.adsFilePath, initialData, { spaces: 2 });
                console.log(`[AdManager] Arquivo ads.json criado em: ${config.adsFilePath}`);
            }
        } catch (error) {
            console.error('[AdManager] Erro ao criar arquivo ads.json:', error.message);
        }
    }

    /**
     * Carrega anúncios do arquivo JSON
     */
    static async loadAdsFromFile() {
        try {
            await this.ensureAdsFileExists();
            const data = await fs.readJson(config.adsFilePath);
            return data;
        } catch (error) {
            console.error('[AdManager] Erro ao carregar ads.json:', error.message);
            return { anuncios: {} };
        }
    }

    /**
     * Salva anúncios no arquivo JSON
     */
    static async saveAdsToFile(data) {
        try {
            await fs.writeJson(config.adsFilePath, data, { spaces: 2 });
        } catch (error) {
            console.error('[AdManager] Erro ao salvar ads.json:', error.message);
            throw error;
        }
    }

    //================================================================================
    // SEÇÃO: FUNÇÕES UTILITÁRIAS
    //================================================================================

    static convertIntervalToMs(interval, unit) {
        const value = parseInt(interval, 10);
        if (isNaN(value)) return 0;

        switch (String(unit).toLowerCase()) {
            case 'minuto': case 'minutos': case 'minute': case 'minutes': case 'm':
                return value * 60 * 1000;
            case 'hora': case 'horas': case 'hour': case 'hours': case 'h':
                return value * 60 * 60 * 1000;
            case 'dia': case 'dias': case 'day': case 'days': case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                console.warn(`[AVISO] Unidade de tempo não reconhecida: "${unit}".`);
                return 0;
        }
    }
}

module.exports = AdManager;