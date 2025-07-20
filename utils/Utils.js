const config = require('../config.json');

class Utils {
    /**
     * Verifica se o usuário é administrador do grupo
     * @param {object} message - Objeto da mensagem
     * @returns {boolean} - True se for admin
     */
    static async isAdmin(message) {
        try {
            const chat = await message.getChat();
            if (!chat.isGroup) return false;

            const participants = chat.participants;
            const sender = message.author || message.from;
            
            const participant = participants.find(p => p.id._serialized === sender);
            return participant && participant.isAdmin;
        } catch (error) {
            console.error('[Utils] Erro ao verificar admin:', error);
            return false;
        }
    }

    /**
     * Verifica se o usuário é o dono do bot
     * @param {object} message - Objeto da mensagem
     * @returns {boolean} - True se for owner
     */
    static isOwner(message) {
        const sender = message.author || message.from;
        const ownerNumber = config.numeroDono + '@c.us';
        return sender === ownerNumber;
    }

    /**
     * Formata um número de telefone para o formato do WhatsApp
     * @param {string} number - Número de telefone
     * @returns {string} - Número formatado
     */
    static formatPhoneNumber(number) {
        // Remove todos os caracteres não numéricos
        const cleaned = number.replace(/\D/g, '');
        
        // Adiciona o sufixo do WhatsApp
        return cleaned + '@c.us';
    }

    /**
     * Converte milissegundos para formato legível
     * @param {number} ms - Milissegundos
     * @returns {string} - Tempo formatado
     */
    static formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

module.exports = { Utils };