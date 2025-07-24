# 🤖 Bot WhatsApp Admin - Sistema Híbrido Laravel

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green)](https://nodejs.org/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Web.js-25D366)](https://github.com/pedroslopez/whatsapp-web.js)
[![Laravel](https://img.shields.io/badge/Laravel-Integration-FF2D20)](https://laravel.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Bot administrador de grupos WhatsApp com **sistema híbrido** de integração Laravel, oferecendo sincronização bidirecional e fallback local automático.

## 🚀 **Funcionalidades Principais**

### 📢 **Sistema de Anúncios Híbrido**
- ✅ **Integração Laravel:** Sincronização automática com painel web
- ✅ **Fallback Local:** Sistema local quando painel indisponível  
- ✅ **Mídia Suportada:** Imagens, vídeos e texto
- ✅ **Indicadores Visuais:** ☁️ Painel | 💾 Local
- ✅ **Sincronização Bidirecional:** Criação/remoção automática

### 🎯 **Comandos de Anúncios**
```bash
!addads mensagem|intervalo    # Criar anúncio (suporte a mídia)
!listads                      # Listar todos os anúncios
!rmads ID                     # Remover anúncio específico
!statusads                    # Status completo do sistema
```

### 🔧 **Administração de Grupos**
- ✅ Controle de membros (ban/unban)
- ✅ Configurações de grupo (abrir/fechar)
- ✅ Sistema de boas-vindas personalizado
- ✅ Anti-link e anti-spam
- ✅ Sorteios automáticos
- ✅ Horários programados
- ✅ Auto-respostas inteligentes

### 🌐 **Integração Laravel**
- ✅ **API REST:** Comunicação com painel web
- ✅ **Token Seguro:** Autenticação Bearer
- ✅ **Retry Logic:** Tentativas automáticas
- ✅ **Health Check:** Monitoramento de conexão
- ✅ **Task Handler:** Processamento de tarefas

## 📦 **Instalação Rápida**

### 1. **Clone o Repositório**
```bash
git clone https://github.com/seu-usuario/bot-whatsapp-admin.git
cd bot-whatsapp-admin
```

### 2. **Instale as Dependências**
```bash
npm install
```

### 3. **Configure o Bot**
Edite o arquivo `config.json`:

```json
{
  "laravelApi": {
    "baseUrl": "https://painel.botwpp.tech/api",
    "token": "seu-token-aqui",
    "timeout": 10000
  },
  "sync": {
    "enableFallback": true,
    "sendNewImmediately": true
  },
  "localAds": {
    "enabled": true
  }
}
```

### 4. **Inicie o Bot**
```bash
npm start
```

## 🎮 **Guia de Uso**

### **Criando Anúncios**

#### **Anúncio de Texto:**
```
!addads Visite nosso site: exemplo.com|60
```

#### **Anúncio com Mídia:**
1. Envie uma imagem/vídeo
2. Na legenda digite: `!addads Promoção especial!|30`

#### **Resposta com Mídia:**
1. Responda uma mídia existente
2. Digite: `!addads Oferta limitada!|45`

### **Gerenciando Anúncios**

#### **Listar Anúncios:**
```
!listads
```
**Saída exemplo:**
```
📢 ANÚNCIOS DO GRUPO:

✅ ATIVOS (2):

🆔 ID: panel_123
⏰ Intervalo: 60 min
📝 Tipo: texto
☁️ Origem: painel
📝 Mensagem: Visite nosso site...
━━━━━━━━━━━━━━━━━━

🆔 ID: local_456
⏰ Intervalo: 30 min
📷 Tipo: midia
💾 Origem: local
📝 Mensagem: Promoção especial...
━━━━━━━━━━━━━━━━━━

📊 Total: 2 anúncios
☁️ Painel | 💾 Local
```

#### **Status do Sistema:**
```
!statusads
```
**Saída exemplo:**
```
📊 STATUS DOS ANÚNCIOS

🏢 Painel: 5 anúncios
💾 Local: 3 anúncios
⏰ Timers ativos: 8
🔗 Conexão: ✅ Online

🔄 Última verificação: 14:30:25
```

#### **Remover Anúncios:**
```
!rmads panel_123    # Remove do painel
!rmads local_456    # Remove local
!rmads 789          # Compatibilidade (local)
```

## 🔧 **Configuração Avançada**

### **Arquivo config.json Completo:**
```json
{
  "numeroBot": "5543996191225",
  "numeroDono": "554191236158",
  "prefix": "!",
  "timezone": "America/Sao_Paulo",
  "autoReconnect": true,
  "sessaoPersistente": true,
  
  "laravelApi": {
    "enabled": true,
    "baseUrl": "https://painel.botwpp.tech/api",
    "token": "teste",
    "timeout": 10000,
    "retryAttempts": 3,
    "retryDelay": 2000
  },
  
  "sync": {
    "adsInterval": 30000,
    "messagesInterval": 30000,
    "enableFallback": true,
    "sendNewImmediately": true,
    "logLevel": "info"
  },
  
  "localAds": {
    "enabled": true,
    "dataFile": "data/ads.json",
    "maxAdsPerGroup": 10,
    "defaultInterval": 60
  },
  
  "logging": {
    "enableApiLogs": true,
    "enableSyncLogs": true,
    "enableErrorLogs": true,
    "logFile": "bot.log"
  },
  
  "botInfo": {
    "nome": "Bot Admin",
    "versao": "2.0.0",
    "descricao": "Bot Administrador de Grupos WhatsApp com Integração Laravel Híbrida"
  }
}
```

### **Estrutura de Arquivos:**
```
bot-whatsapp-admin/
├── handlers/
│   ├── AdsHandler.js          # Sistema híbrido de anúncios
│   ├── AutoMessageHandler.js  # Mensagens automáticas
│   ├── SyncHandler.js         # Sincronização com Laravel
│   ├── PanelHandler.js        # Handler do painel
│   └── TaskHandler.js         # Processamento de tarefas
├── utils/
│   └── Sender.js              # Módulo de envio centralizado
├── commands/
│   ├── menu.js                # Sistema de menus
│   ├── welcome.js             # Boas-vindas
│   ├── ban.js                 # Sistema de banimento
│   └── ...                    # Outros comandos
├── data/
│   ├── ads.json               # Anúncios locais (fallback)
│   ├── configs.json           # Configurações de grupos
│   └── ...                    # Outros dados
├── config.json                # Configuração principal
├── index.js                   # Arquivo principal
└── package.json               # Dependências
```

## 🔄 **Sistema Híbrido**

### **Como Funciona:**
1. **Prioridade:** Sempre busca anúncios do painel Laravel primeiro
2. **Fallback:** Se painel indisponível, usa anúncios locais automaticamente
3. **Sincronização:** Novos anúncios locais são enviados para o painel
4. **Indicadores:** Interface mostra origem de cada anúncio
5. **Recuperação:** Quando painel volta, para anúncios locais e usa painel

### **Vantagens:**
- ✅ **Alta Disponibilidade:** Nunca para de funcionar
- ✅ **Sincronização Inteligente:** Dados sempre atualizados
- ✅ **Interface Unificada:** Gerencia tudo em um lugar
- ✅ **Recuperação Automática:** Volta ao painel quando disponível

## 📊 **Monitoramento**

### **Logs do Sistema:**
```bash
# Logs de API
[API] 📡 Buscando mensagens do painel Laravel...
[API] ✅ 5 mensagens do painel encontradas

# Logs de Sincronização  
[SYNC] Iniciando sincronização. Mensagens ativas: 3, Painel: 5
[SYNC] Nova mensagem detectada ID: 123. Agendando...

# Logs de Anúncios
[ADS-SYNC] ✅ Anúncio ID 456 sincronizado (create) com banco de dados
[ADS-SYNC] ❌ Erro ao sincronizar anúncio ID 789 (delete). Status: 404
```

### **Status em Tempo Real:**
```bash
[STATUS] Painel: ✅ | Mensagens painel: 5 | Anúncios locais: 2
```

## 🛠️ **Solução de Problemas**

### **Painel Laravel Indisponível:**
- ✅ Sistema continua funcionando com anúncios locais
- ✅ Sincronização automática quando painel voltar
- ✅ Logs mostram status da conexão

### **Anúncios Não Enviando:**
1. Verifique `!statusads` 
2. Confirme se timers estão ativos
3. Verifique logs de erro
4. Teste conectividade com painel

### **Problemas de Sincronização:**
1. Verifique token da API
2. Confirme URL do painel
3. Teste timeout da rede
4. Verifique logs de sincronização

## 🚀 **Scripts Úteis**

### **Desenvolvimento:**
```bash
npm run dev          # Modo desenvolvimento
npm run test         # Testes automatizados
npm run logs         # Ver logs em tempo real
```

### **Produção:**
```bash
npm start            # Iniciar bot
npm run restart      # Reiniciar bot
npm run status       # Status do sistema
```

## 📝 **Comandos Completos**

### **Anúncios:**
- `!addads texto|minutos` - Criar anúncio
- `!listads` - Listar anúncios
- `!rmads ID` - Remover anúncio
- `!statusads` - Status do sistema

### **Administração:**
- `!all texto` - Mencionar todos
- `!ban @usuario` - Banir membro
- `!unban @usuario` - Desbanir membro
- `!abrirgp` - Abrir grupo
- `!fechargp` - Fechar grupo

### **Utilitários:**
- `!menu` - Menu principal
- `!ping` - Testar bot
- `!status` - Status geral
- `!help` - Ajuda completa

## 🤝 **Contribuição**

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 **Suporte**

- 📧 **Email:** suporte@exemplo.com
- 💬 **WhatsApp:** +55 41 99999-9999
- 🐛 **Issues:** [GitHub Issues](https://github.com/seu-usuario/bot-whatsapp-admin/issues)
- 📖 **Documentação:** [Wiki do Projeto](https://github.com/seu-usuario/bot-whatsapp-admin/wiki)

---

**Desenvolvido com ❤️ para a comunidade WhatsApp**

> ⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!