# 🛠️ Guia de Solução de Conflitos - WhatsApp Bot

## 🚨 **Problemas Comuns e Soluções**

### **1. Conflito de Merge no package.json**

**Erro:**
```
npm ERR! Merge conflict detected in your package.json.
npm ERR! Please resolve the package.json conflict and retry.
```

**Solução Rápida:**
```bash
# 1. Use o script de sincronização
./sync-repo.sh

# 2. Se ainda houver problema, recrie o package.json
rm package.json package-lock.json
rm -rf node_modules

# 3. Recrie o arquivo (use o conteúdo limpo)
# 4. Reinstale as dependências
npm install
```

### **2. Branches Divergentes**

**Erro:**
```
hint: You have divergent branches and need to specify how to reconcile them.
fatal: Need to specify how to reconcile divergent branches.
```

**Solução:**
```bash
# Use o script automático
./sync-repo.sh

# OU manualmente:
git merge --abort 2>/dev/null || true
git reset --hard origin/main
git pull origin main
```

### **3. Conflitos de Pull**

**Erro:**
```
error: Pulling is not possible because you have unmerged files.
fatal: Exiting because of an unresolved conflict.
```

**Solução:**
```bash
# Script automático (RECOMENDADO)
./sync-repo.sh

# OU passo a passo:
git merge --abort
git clean -fd
git reset --hard HEAD
git fetch origin main
git reset --hard origin/main
```

## 🔧 **Script de Sincronização Automática**

O arquivo `sync-repo.sh` resolve automaticamente todos os conflitos:

```bash
# Dar permissão (só precisa fazer uma vez)
chmod +x sync-repo.sh

# Usar sempre que houver conflitos
./sync-repo.sh
```

**O que o script faz:**
- ✅ Aborta merges em andamento
- ✅ Limpa arquivos não rastreados
- ✅ Reset para estado remoto
- ✅ Sincronização forçada
- ✅ Feedback detalhado

## 📦 **Problemas com NPM**

### **Dependências Corrompidas**
```bash
# Limpeza completa
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### **Conflitos no package-lock.json**
```bash
# Remover e recriar
rm package-lock.json
npm install
```

### **Versões Incompatíveis**
```bash
# Instalar versões específicas
npm install express@^4.18.2
npm install whatsapp-web.js@^1.23.0
```

## 🎯 **Comandos de Emergência**

### **Reset Completo do Repositório**
```bash
git stash
git clean -fd
git reset --hard origin/main
git pull origin main
```

### **Limpeza Total de NPM**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### **Verificar Estado do Git**
```bash
git status
git log --oneline -5
git remote -v
```

## 🔄 **Fluxo de Trabalho Recomendado**

### **Antes de Começar a Trabalhar:**
```bash
./sync-repo.sh
npm install  # Se necessário
```

### **Antes de Fazer Push:**
```bash
git add .
git commit -m "sua mensagem"
git pull origin main  # Se der conflito, use ./sync-repo.sh
git push origin main
```

### **Se Algo Der Errado:**
```bash
./sync-repo.sh  # Resolve 99% dos problemas
```

## 📋 **Configurações Recomendadas**

### **Configurar Git para Evitar Conflitos:**
```bash
git config pull.rebase false
git config push.default simple
git config merge.tool vimdiff  # Opcional
```

### **Configurar NPM:**
```bash
npm config set save-exact true
npm config set audit-level moderate
```

## 🚨 **Sinais de Alerta**

**Quando usar o script de sincronização:**
- ❌ `error: Pulling is not possible`
- ❌ `You have divergent branches`
- ❌ `Merge conflict detected`
- ❌ `fatal: Need to specify how to reconcile`
- ❌ `npm ERR! Merge conflict detected`

**Comando mágico para todos os casos:**
```bash
./sync-repo.sh && npm install
```

## ✅ **Verificação Final**

Após resolver qualquer conflito, sempre teste:

```bash
# 1. Verificar git
git status
git pull origin main

# 2. Verificar npm
npm install
node -e "console.log('✅ Dependências OK')"

# 3. Testar bot (opcional)
node index.js  # Ctrl+C para parar
```

## 🎉 **Resumo**

**Para 99% dos problemas:**
```bash
./sync-repo.sh
npm install
```

**Este comando resolve:**
- ✅ Conflitos de merge
- ✅ Branches divergentes
- ✅ Arquivos não rastreados
- ✅ Estados inconsistentes
- ✅ Problemas de sincronização

**Mantenha sempre o repositório limpo e sincronizado!** 🚀