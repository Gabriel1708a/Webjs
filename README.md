# 🤖 Bot Administrador de Grupos WhatsApp

Bot completo para administração de grupos WhatsApp com sistema de aluguel, desenvolvido com whatsapp-web.js.

## ✨ Funcionalidades

### 🎯 **Comandos Gerais**
- `!menu` - Lista todos os comandos disponíveis
- `!all` - Menciona todos os membros silenciosamente
- `!vergrupo` - Verifica status e validade do grupo

### 🗞️ **Sistema de Anúncios Automáticos**
- `!addads mensagem|intervalo` - Criar anúncio automático
- `!listads` - Listar anúncios ativos
- `!rmads ID` - Remover anúncio por ID

### 👋 **Boas-Vindas Personalizadas**
- `!bv 1/0` - Ativar/desativar boas-vindas
- `!legendabv texto` - Definir mensagem personalizada
- Suporte a `@user` (novo membro) e `@group` (nome do grupo)

### 🔐 **Controle de Grupo**
- `!abrirgrupo` / `!fechargrupo` - Controle manual
- `!abrirgp HH:MM` / `!fechargp HH:MM` - Agendamento automático
- `!afgp 0` - Cancelar agendamentos

### 🎉 **Sorteios por Reação**
- `!sorteio prêmio|tempo` - Criar sorteio interativo
- Participação via reação ✅
- Sorteio automático ao final do tempo

### 🎰 **Horários Pagantes**
- `!horarios` - Enviar dicas de apostas
- `!horapg 1/0` - Ativar/desativar sistema
- `!addhorapg 30m` - Agendar próximos horários

### 🛡️ **Sistema Anti-Link**
- `!banextremo` - Ban por qualquer link
- `!banlinkgp` - Ban por link de grupo WhatsApp
- `!antilinkgp` - Apenas apagar links de grupo
- `!antilink` - Apenas apagar qualquer link
- `!ban` - Banir usuário (responder mensagem)

### 👑 **Administração**
- `!liberargrupo X` - Liberar grupo por X dias
- Sistema de aluguel automático
- Verificação de validade por grupo

## 🚀 Instalação

### 1. **Pré-requisitos**
```bash
# Node.js 16+ e npm
node --version
npm --version
```

### 2. **Clonar e Instalar**
```bash
git clone <seu-repositorio>
cd whatsapp-bot-admin
npm install
```

### 3. **Configuração**
Edite o arquivo `config.json`:
```json
{
  "numeroBot": "5511999999999",      // Número do bot (com código do país)
  "numeroDono": "5511888888888",     // Número do administrador
  "prefix": "!",
  "timezone": "America/Sao_Paulo"
}
```

### 4. **Primeira Execução**
```bash
npm start
```

### 5. **Pareamento**
- O bot gerará um código de 8 dígitos automaticamente
- Código será enviado para o número do dono via WhatsApp
- Insira o código no WhatsApp para conectar

## 📱 Como Usar

### **Conectar o Bot**
1. Execute `npm start`
2. Aguarde o código de pareamento ser enviado
3. Abra WhatsApp > Configurações > Aparelhos conectados
4. Clique em "Conectar um aparelho"
5. Insira o código de 8 dígitos

### **Liberar um Grupo**
```
!liberargrupo 30
```
Libera o grupo atual por 30 dias.

### **Configurar Boas-Vindas**
```
!bv 1
!legendabv Bem-vindo @user ao grupo @group! 🎉
```

### **Criar Anúncio Automático**
```
!addads Visite nosso site: exemplo.com|60
```
Envia o anúncio a cada 60 minutos.

### **Agendar Abertura/Fechamento**
```
!abrirgp 09:00
!fechargp 18:00
```

### **Criar Sorteio**
```
!sorteio Pix R$100|2m
```
Sorteio de R$100 por 2 minutos.

## 🔧 Estrutura do Projeto

```
├── index.js              # Arquivo principal
├── config.json           # Configurações
├── package.json           # Dependências
├── commands/              # Módulos de comandos
│   ├── menu.js
│   ├── welcome.js
│   ├── ban.js
│   ├── sorteio.js
│   ├── ads.js
│   ├── groupControl.js
│   └── horarios.js
└── data/                  # Dados JSON
    ├── grupoAluguel.json  # Controle de aluguel
    ├── configs.json       # Configurações por grupo
    ├── ads.json           # Anúncios automáticos
    ├── sorteios.json      # Histórico de sorteios
    └── horarios.json      # Horários pagantes
```

## 🌐 Integração Laravel (Futuro)

O bot está preparado para integração com API Laravel:

```javascript
// Exemplo de configuração futura
"laravelApi": {
  "enabled": true,
  "baseUrl": "https://seu-site.com/api",
  "token": "seu-token-api"
}
```

### **Endpoints Planejados:**
- `GET /grupos/{id}/status` - Status do grupo
- `POST /grupos/{id}/config` - Salvar configurações
- `GET /grupos/{id}/sorteios` - Histórico de sorteios
- `POST /anuncios` - Criar anúncios via painel

## 🛠️ Manutenção

### **Logs**
O bot exibe logs em tempo real no console:
```
🤖 Bot conectado e pronto!
📱 Número: 5511999999999
📋 Nome: Bot Admin
📢 Anúncios automáticos carregados
⏰ Agendamentos de grupo carregados
🎰 Horários automáticos carregados
```

### **Backup dos Dados**
Faça backup regular da pasta `data/`:
```bash
cp -r data/ backup-$(date +%Y%m%d)/
```

### **Atualização**
```bash
git pull origin main
npm install
npm start
```

## 🔒 Sistema de Aluguel

### **Como Funciona**
- Cada grupo tem uma validade definida
- Bot só funciona em grupos ativos
- Mensagem automática para grupos vencidos
- Controle via arquivo `grupoAluguel.json`

### **Estrutura de Dados**
```json
{
  "grupos": {
    "5511999999999-1234567890@g.us": {
      "activated": "2024-01-15T10:30:00-03:00",
      "expiry": "2024-02-14T10:30:00-03:00",
      "days": 30
    }
  }
}
```

## 💡 Dicas de Uso

1. **Sempre teste em grupo pequeno primeiro**
2. **Configure boas-vindas antes de ativar**
3. **Use horários automáticos com moderação**
4. **Monitore logs para detectar erros**
5. **Faça backup dos dados regularmente**

## 🆘 Solução de Problemas

### **Bot não conecta**
- Verifique se o número no `config.json` está correto
- Certifique-se que o WhatsApp não está aberto no celular
- Delete a pasta `.wwebjs_auth` e tente novamente

### **Comandos não funcionam**
- Verifique se o grupo está liberado (`!vergrupo`)
- Confirme se você é administrador do grupo
- Verifique se o bot é administrador do grupo

### **Erro de permissão**
- Bot precisa ser administrador para banir/controlar grupo
- Verifique configurações de privacidade do grupo

## 📄 Licença

MIT License - Livre para uso e modificação.

---

**🤖 Bot Admin v1.0** - Desenvolvido para facilitar a administração de grupos WhatsApp