#!/bin/bash

# Script para sincronizar repositório sem conflitos
echo "🔄 Sincronizando repositório..."

# Abortar qualquer merge em andamento
git merge --abort 2>/dev/null || true

# Limpar arquivos não rastreados
git clean -fd

# Reset para HEAD atual
git reset --hard HEAD

# Buscar alterações do remoto
echo "📡 Buscando alterações do remoto..."
git fetch origin main

# Reset para o estado remoto (força sincronização)
echo "🔄 Sincronizando com o remoto..."
git reset --hard origin/main

# Confirmar que está sincronizado
echo "✅ Repositório sincronizado com sucesso!"
git status

echo ""
echo "🎉 Agora você pode trabalhar sem conflitos!"
echo "💡 Para usar: chmod +x sync-repo.sh && ./sync-repo.sh"