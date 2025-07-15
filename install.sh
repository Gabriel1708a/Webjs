#!/bin/bash

echo "🤖 INSTALAÇÃO DO BOT ADMINISTRADOR WHATSAPP"
echo "==========================================="
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo "   Instale Node.js 16+ antes de continuar"
    echo "   Download: https://nodejs.org/"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js versão muito antiga!"
    echo "   Versão atual: $(node -v)"
    echo "   Versão mínima: v16.0.0"
    exit 1
fi

echo "✅ Node.js $(node -v) encontrado"

# Instalar dependências
echo ""
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas com sucesso"

# Criar pasta data se não existir
if [ ! -d "data" ]; then
    echo ""
    echo "📁 Criando pasta data..."
    mkdir data
    
    # Copiar templates
    if [ -d "data-template" ]; then
        cp data-template/*.json data/
        echo "✅ Templates de dados copiados"
    fi
fi

# Verificar se config.json existe
if [ ! -f "config.json" ]; then
    echo ""
    echo "⚠️  Arquivo config.json não encontrado!"
    echo "   Criando configuração padrão..."
    
    cat > config.json << EOF
{
  "numeroBot": "5511999999999",
  "numeroDono": "5511888888888",
  "prefix": "!",
  "timezone": "America/Sao_Paulo",
  "autoReconnect": true,
  "sessaoPersistente": true,
  "laravelApi": {
    "enabled": false,
    "baseUrl": "https://seu-site.com/api",
    "token": ""
  },
  "botInfo": {
    "nome": "Bot Admin",
    "versao": "1.0.0",
    "descricao": "Bot Administrador de Grupos WhatsApp"
  }
}
EOF
fi

echo ""
echo "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "1️⃣  Edite o arquivo config.json:"
echo "   - numeroBot: Seu número do bot (com código do país)"
echo "   - numeroDono: Seu número de WhatsApp"
echo ""
echo "2️⃣  Inicie o bot:"
echo "   npm start"
echo ""
echo "3️⃣  Conecte o bot:"
echo "   - Aguarde o código de pareamento ser enviado"
echo "   - Insira o código no WhatsApp"
echo ""
echo "4️⃣  Libere seus grupos:"
echo "   !liberargrupo 30"
echo ""
echo "📚 Comandos disponíveis: !menu"
echo "📖 Documentação completa: README.md"
echo ""
echo "🚀 Pronto para usar!"