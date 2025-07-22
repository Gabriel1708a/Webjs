# 🔄 SISTEMA HÍBRIDO - PAINEL + LOCAL

## 📋 **VISÃO GERAL**

O sistema híbrido permite que o bot funcione com **duas fontes de configuração**:
1. **🌐 Painel Web** (prioridade)
2. **📁 Arquivo Local** (fallback)

---

## 🎯 **COMO FUNCIONA**

### **📊 Prioridade de Configurações:**
```
1. 🌐 API do Painel → Se disponível
2. 📁 Configuração Local → Se API falhar
```

### **🔄 Sincronização Automática:**
- **Comandos locais** → Salvam local + sincronizam com painel
- **Moderação automática** → Usa painel primeiro, local como backup
- **Status em tempo real** → Comando `!syncstatus`

---

## ⚙️ **CONFIGURAÇÃO**

### **1. Variáveis de Ambiente (.env):**
```env
PANEL_API_URL=https://seupainel.com/api
PANEL_API_TOKEN=seu-token-aqui
```

### **2. Estrutura da API:**
```
GET /api/groups/{groupId}/settings
POST /api/groups/{groupId}/settings
```

### **3. Formato de Resposta:**
```json
{
  "ban_extremo": 1,
  "ban_link_gp": 0, 
  "anti_link_gp": 0,
  "anti_link": 0,
  "ban_foto": 1,
  "ban_gringo": 0
}
```

---

## 🚀 **COMANDOS**

### **📊 Verificar Status:**
```
!syncstatus
```
**Mostra:**
- ✅ Configurações locais
- 🌐 Configurações do painel  
- �� Status de sincronização
- 💡 Modo atual (híbrido/fallback)

### **🔄 Comandos Sincronizados:**
```
!banextremo 1/0    → Ban por qualquer link
!banlinkgp 1/0     → Ban por link de grupo
!antilinkgp 1/0    → Apagar link de grupo
!antilink 1/0      → Apagar qualquer link
!banfoto 1/0       → Remover fotos/vídeos
!bangringo 1/0     → Ban números estrangeiros
```

**🎯 Cada comando:**
1. Salva localmente
2. Sincroniza com painel
3. Confirma "🔄 Sincronizado com painel"

---

## 💡 **CENÁRIOS DE USO**

### **✅ Painel Online:**
```
[HYBRID] 🌐 Usando configurações do painel
[SYNC] ✅ Configuração antiLink sincronizada
```
- **Moderação** usa configurações do painel
- **Comandos** sincronizam local ↔ painel

### **⚠️ Painel Offline:**
```
[HYBRID] 📁 Usando configurações locais
[API] ❌ Erro ao buscar configurações do painel
```
- **Moderação** usa configurações locais
- **Comandos** salvam apenas localmente

### **🔄 Painel Volta Online:**
- Sistema detecta automaticamente
- Volta a priorizar configurações do painel
- Sincronização é retomada

---

## 🛠️ **LOGS DO SISTEMA**

### **📊 Logs de Sincronização:**
```
[API] ✅ Configurações obtidas do painel para grupo 123@g.us
[SYNC] ✅ Configuração antiLink sincronizada com o painel
[HYBRID] 🌐 Usando configurações do painel para grupo 123@g.us
```

### **⚠️ Logs de Fallback:**
```
[API] ❌ Erro ao buscar configurações do painel: timeout
[HYBRID] 📁 Usando configurações locais para grupo 123@g.us
```

---

## 🎯 **VANTAGENS**

### **✅ Confiabilidade:**
- **Nunca para** mesmo se painel sair do ar
- **Fallback automático** para configurações locais
- **Retomada automática** quando painel volta

### **🔄 Sincronização:**
- **Comandos locais** sincronizam com painel
- **Configurações centralizadas** no painel web
- **Backup local** sempre atualizado

### **📊 Transparência:**
- **Logs detalhados** de qual fonte está sendo usada
- **Status em tempo real** via `!syncstatus`
- **Feedback visual** em cada comando

---

## 🚨 **SOLUÇÃO DE PROBLEMAS**

### **❌ "Dessincronizado":**
```
!syncstatus
```
**Mostra diferenças entre local e painel**

### **🔧 Forçar Sincronização:**
```
!antilink 0    # Desativar
!antilink 1    # Reativar
```
**Força sincronização da configuração**

### **�� Apenas Local:**
- Remova as variáveis `PANEL_API_URL` e `PANEL_API_TOKEN`
- Sistema funcionará apenas com configurações locais

### **🌐 Apenas Painel:**
- Configure as variáveis de ambiente
- Sistema priorizará sempre o painel

---

## 🎉 **RESULTADO**

### **🎯 Sistema Robusto:**
- ✅ **Nunca falha** - sempre tem fallback
- 🔄 **Sempre sincronizado** - comandos atualizam ambos
- 📊 **Transparente** - você sabe qual fonte está sendo usada
- 🛠️ **Flexível** - funciona com ou sem painel

### **💡 Melhor dos Dois Mundos:**
- 🌐 **Centralização** do painel web
- 📁 **Confiabilidade** do sistema local
- 🔄 **Sincronização** automática entre ambos

**🚀 Agora você tem um sistema antilink verdadeiramente híbrido e confiável!**
