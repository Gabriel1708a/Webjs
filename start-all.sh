#!/bin/bash

echo "🚀 Iniciando Sistema Completo - Bot WhatsApp Admin"
echo "================================================="

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências do bot..."
    npm install
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando dependências do frontend..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Dependências verificadas!"
echo ""
echo "🔥 Iniciando serviços..."
echo ""

# Criar diretório de logs se não existir
mkdir -p logs

# Função para limpar processos ao sair
cleanup() {
    echo ""
    echo "🛑 Parando todos os serviços..."
    kill $BOT_PID $API_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar Bot WhatsApp
echo "🤖 Iniciando Bot WhatsApp..."
node index.js > logs/bot.log 2>&1 &
BOT_PID=$!

# Aguardar um pouco
sleep 2

# Iniciar API Server
echo "🔌 Iniciando API Server..."
node api-server.js > logs/api.log 2>&1 &
API_PID=$!

# Aguardar um pouco
sleep 2

# Iniciar Frontend
echo "�� Iniciando Frontend React..."
cd frontend && npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Todos os serviços iniciados!"
echo ""
echo "📱 Acesse a interface web em: http://localhost:3000"
echo "🔐 Login: admin / admin123"
echo ""
echo "📊 Serviços rodando:"
echo "   🤖 Bot WhatsApp: PID $BOT_PID"
echo "   🔌 API Server:   PID $API_PID (http://localhost:3001)"
echo "   🌐 Frontend:     PID $FRONTEND_PID (http://localhost:3000)"
echo ""
echo "📋 Logs disponíveis em:"
echo "   📄 Bot:      logs/bot.log"
echo "   �� API:      logs/api.log"
echo "   📄 Frontend: logs/frontend.log"
echo ""
echo "💡 Pressione Ctrl+C para parar todos os serviços"
echo ""

# Aguardar indefinidamente
wait
