const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bot-admin-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Dados dos usuários (em produção, usar banco de dados)
const users = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123', // Em produção, usar hash
    name: 'Administrador',
    email: 'admin@bot.com'
  }
];

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Função para ler arquivos JSON
const readJsonFile = async (filename) => {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Erro ao ler ${filename}:`, error);
    return {};
  }
};

// Função para escrever arquivos JSON
const writeJsonFile = async (filename, data) => {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Erro ao escrever ${filename}:`, error);
    return false;
  }
};

// Rotas de autenticação
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email
    }
  });
});

app.get('/api/user', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  
  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email
  });
});

// Rotas do dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const grupoAluguel = await readJsonFile('grupoAluguel.json');
    const configs = await readJsonFile('configs.json');
    
    const totalGroups = Object.keys(grupoAluguel.grupos || {}).length;
    const activeGroups = Object.values(grupoAluguel.grupos || {})
      .filter(group => new Date(group.expiry) > new Date()).length;
    
    const stats = {
      totalGroups,
      activeGroups,
      totalMessages: Math.floor(Math.random() * 1000) + 500, // Simulado
      botStatus: 'online' // Simulado
    };
    
    const recentActivity = [
      { type: 'success', message: 'Bot conectado com sucesso', timestamp: '2 min atrás' },
      { type: 'info', message: 'Novo grupo adicionado', timestamp: '5 min atrás' },
      { type: 'warning', message: 'Grupo próximo do vencimento', timestamp: '10 min atrás' }
    ];
    
    res.json({ stats, recentActivity });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Rotas de grupos
app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const grupoAluguel = await readJsonFile('grupoAluguel.json');
    const configs = await readJsonFile('configs.json');
    
    const groups = Object.entries(grupoAluguel.grupos || {}).map(([id, data]) => ({
      id,
      name: `Grupo ${id.split('-')[0]}`,
      active: new Date(data.expiry) > new Date(),
      expiryDate: data.expiry,
      memberCount: Math.floor(Math.random() * 100) + 10,
      activeCommands: Object.keys(configs.grupos?.[id] || {}).length
    }));
    
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar grupos' });
  }
});

app.patch('/api/groups/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    const grupoAluguel = await readJsonFile('grupoAluguel.json');
    
    if (grupoAluguel.grupos && grupoAluguel.grupos[id]) {
      if (active) {
        // Estender por 30 dias se ativando
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 30);
        grupoAluguel.grupos[id].expiry = newExpiry.toISOString();
      } else {
        // Definir como vencido se desativando
        grupoAluguel.grupos[id].expiry = new Date().toISOString();
      }
      
      await writeJsonFile('grupoAluguel.json', grupoAluguel);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status do grupo' });
  }
});

app.patch('/api/groups/:id/extend', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    
    const grupoAluguel = await readJsonFile('grupoAluguel.json');
    
    if (grupoAluguel.grupos && grupoAluguel.grupos[id]) {
      const currentExpiry = new Date(grupoAluguel.grupos[id].expiry);
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + parseInt(days));
      
      grupoAluguel.grupos[id].expiry = newExpiry.toISOString();
      await writeJsonFile('grupoAluguel.json', grupoAluguel);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao estender validade do grupo' });
  }
});

// Rotas de configurações
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const config = require('./config.json');
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const newConfig = req.body;
    await writeJsonFile('../config.json', newConfig);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Rota para reiniciar bot (simulado)
app.post('/api/bot/restart', authenticateToken, (req, res) => {
  console.log('Solicitação de reinicialização do bot recebida');
  res.json({ success: true, message: 'Bot será reiniciado em breve' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 API Server rodando na porta ${PORT}`);
  console.log(`📱 Frontend pode acessar: http://localhost:${PORT}/api`);
});

module.exports = app;
