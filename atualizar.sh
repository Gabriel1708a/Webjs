#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🤖 BOT ADMIN UPDATER                      ║"
echo "║                   Sistema de Atualização                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}🚀 Iniciando atualização automática...${NC}"
echo

# Executar o script de atualização
node update.js

echo
echo -e "${GREEN}✅ Processo concluído!${NC}"
echo -e "${BLUE}💡 Para iniciar o bot: npm start${NC}"
echo

read -p "Pressione Enter para continuar..."