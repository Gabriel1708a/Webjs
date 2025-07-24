#!/bin/bash

echo "🔧 Aplicando correção das rotas da API Laravel..."
echo "=================================="

# Verificar se estamos no diretório correto
if [ ! -f "index.js" ]; then
    echo "❌ Erro: Execute este script no diretório raiz do bot"
    exit 1
fi

# Fazer backup dos arquivos originais
echo "📂 Criando backup dos arquivos originais..."
cp handlers/AutoMessageHandler.js handlers/AutoMessageHandler-BACKUP.js
cp config.json config-BACKUP.json

# Baixar arquivo corrigido
echo "📥 Baixando AutoMessageHandler corrigido..."
if command -v wget &> /dev/null; then
    wget -q https://raw.githubusercontent.com/Gabriel1708a/Webjs/main/handlers/AutoMessageHandler-FIXED.js -O handlers/AutoMessageHandler-TEMP.js
elif command -v curl &> /dev/null; then
    curl -s https://raw.githubusercontent.com/Gabriel1708a/Webjs/main/handlers/AutoMessageHandler-FIXED.js -o handlers/AutoMessageHandler-TEMP.js
else
    echo "❌ Erro: wget ou curl não encontrados"
    exit 1
fi

# Verificar se o download foi bem-sucedido
if [ -f "handlers/AutoMessageHandler-TEMP.js" ] && [ -s "handlers/AutoMessageHandler-TEMP.js" ]; then
    mv handlers/AutoMessageHandler-TEMP.js handlers/AutoMessageHandler.js
    echo "✅ AutoMessageHandler atualizado com sucesso!"
else
    echo "❌ Erro ao baixar arquivo corrigido"
    exit 1
fi

# Baixar configuração atualizada
echo "📥 Baixando configuração atualizada..."
if command -v wget &> /dev/null; then
    wget -q https://raw.githubusercontent.com/Gabriel1708a/Webjs/main/config-botwpp.json -O config-NEW.json
elif command -v curl &> /dev/null; then
    curl -s https://raw.githubusercontent.com/Gabriel1708a/Webjs/main/config-botwpp.json -o config-NEW.json
else
    echo "❌ Erro: wget ou curl não encontrados"
    exit 1
fi

# Verificar se já existe token configurado
if grep -q "SEU_TOKEN_AQUI" config.json 2>/dev/null; then
    echo "⚠️  Token não configurado no config.json atual"
    NEED_TOKEN=true
else
    # Extrair token atual
    CURRENT_TOKEN=$(grep -o '"token": "[^"]*"' config.json | cut -d'"' -f4)
    if [ ! -z "$CURRENT_TOKEN" ] && [ "$CURRENT_TOKEN" != "SEU_TOKEN_AQUI" ]; then
        echo "🔑 Token atual encontrado: $CURRENT_TOKEN"
        # Substituir no novo arquivo
        sed -i "s/SEU_TOKEN_AQUI/$CURRENT_TOKEN/g" config-NEW.json
        NEED_TOKEN=false
    else
        NEED_TOKEN=true
    fi
fi

# Substituir configuração
mv config-NEW.json config.json
echo "✅ Configuração atualizada!"

# Avisar sobre token se necessário
if [ "$NEED_TOKEN" = true ]; then
    echo ""
    echo "⚠️  ATENÇÃO: Você precisa configurar seu token!"
    echo "   Edite o arquivo config.json e substitua 'SEU_TOKEN_AQUI' pelo seu token real"
    echo ""
fi

echo ""
echo "🎯 Correções aplicadas:"
echo "  ✅ /api/messages/pending → /api/ads"
echo "  ✅ /api/messages/{id}/sent → /api/ads/{id}/sent"
echo "  ✅ Configuração para painel.botwpp.tech"
echo "  ✅ Sistema de fallback mantido"
echo ""
echo "🔄 Para aplicar as mudanças:"
echo "  pm2 restart sofia"
echo ""
echo "📋 Logs esperados após correção:"
echo "  📡 Buscando mensagens do painel Laravel (nova rota /api/ads)..."
echo "  ✅ X mensagens do painel encontradas."
echo ""
echo "🎉 Correção concluída! O erro de rota deve estar resolvido."