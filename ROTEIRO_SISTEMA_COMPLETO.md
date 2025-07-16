# 🚀 ROTEIRO COMPLETO - SISTEMA WEB INTEGRADO COM BOT WEBJS

## 📋 VISÃO GERAL DO PROJETO

Sistema web completo para gerenciamento do bot WhatsApp com interface administrativa e área do cliente, totalmente sincronizado com as funcionalidades existentes do bot WebJS.

---

## 🎨 DESIGN SYSTEM - TEMA FUTURISTA

### 🌈 Paleta de Cores
```css
:root {
  --bg-primary: #000000;           /* Fundo principal */
  --bg-secondary: #0a0a0a;         /* Fundo secundário */
  --bg-card: #111111;              /* Cards */
  --neon-green: #00ff41;           /* Verde neon */
  --neon-blue: #00d4ff;            /* Azul ciano */
  --neon-purple: #b400ff;          /* Roxo neon */
  --neon-red: #ff0040;             /* Vermelho neon */
  --text-primary: #ffffff;         /* Texto principal */
  --text-secondary: #888888;       /* Texto secundário */
  --border-neon: #00ff41;          /* Bordas com glow */
}
```

### 🎯 Componentes Visuais
- **Botões**: Bordas com glow neon, hover com animação pulsante
- **Inputs**: Background escuro, bordas neon, placeholder com opacidade
- **Cards**: Background #111111, bordas sutis, shadow com glow
- **Switches**: Estilo iOS com cores neon
- **Tabelas**: Zebra striping sutil, headers com gradient
- **Modais**: Backdrop blur, animações suaves de entrada/saída

### 📱 Responsividade
- **Mobile First**: Design otimizado para celular
- **Breakpoints**: 320px, 768px, 1024px, 1440px
- **Componentes**: Flexbox e CSS Grid para layouts fluidos

---

## 🏗️ ARQUITETURA DO SISTEMA

### 📁 Estrutura de Pastas
```
projeto/
├── frontend/                    # Interface web
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/
│   ├── src/
│   │   ├── components/          # Componentes reutilizáveis
│   │   ├── pages/              # Páginas do sistema
│   │   ├── services/           # Serviços de API
│   │   ├── utils/              # Utilitários
│   │   ├── styles/             # Estilos globais
│   │   └── App.js
│   └── package.json
├── backend/                     # API Laravel
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   ├── Middleware/
│   │   └── Services/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php
│   └── .env
├── bot/                         # Bot WebJS (existente)
│   ├── index.js
│   ├── commands/
│   ├── data/
│   └── config.json
└── README.md
```

---

## 🗄️ BANCO DE DADOS - ESTRUTURA COMPLETA

### 👥 Tabela: users (Clientes)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    expiry_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 👑 Tabela: admins (Administradores)
```sql
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 📱 Tabela: whatsapp_groups (Grupos WhatsApp)
```sql
CREATE TABLE whatsapp_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    group_id VARCHAR(255) NOT NULL,        -- ID do grupo (ex: 123456789@g.us)
    group_name VARCHAR(255),
    group_link TEXT,                       -- Link de convite
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_group_user (group_id, user_id)
);
```

### ⚙️ Tabela: group_configs (Configurações por Grupo)
```sql
CREATE TABLE group_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id VARCHAR(255) NOT NULL,
    config_key VARCHAR(100) NOT NULL,      -- Ex: 'soadm', 'banFoto', 'antiLink'
    config_value TEXT,                     -- Ex: '1', 'banextremo', 'true'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_config (group_id, config_key)
);
```

### 📊 Tabela: bot_logs (Logs do Bot)
```sql
CREATE TABLE bot_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id VARCHAR(255),
    user_phone VARCHAR(20),
    action VARCHAR(100),                   -- Ex: 'ban', 'delete_message', 'command'
    details TEXT,                          -- JSON com detalhes da ação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 SISTEMA DE AUTENTICAÇÃO

### 🎫 JWT Token Structure
```javascript
{
  "user_id": 123,
  "username": "cliente01",
  "type": "client", // ou "admin"
  "exp": 1234567890,
  "iat": 1234567890
}
```

### 🛡️ Middleware de Autenticação
```php
// AuthMiddleware.php
public function handle($request, Closure $next, $userType = null)
{
    $token = $request->bearerToken();
    
    if (!$token) {
        return response()->json(['error' => 'Token não fornecido'], 401);
    }
    
    try {
        $decoded = JWT::decode($token, $this->key, ['HS256']);
        
        // Verificar se o usuário ainda está ativo
        if ($decoded->type === 'client') {
            $user = User::find($decoded->user_id);
            if (!$user || !$user->is_active || $user->expiry_date < now()) {
                return response()->json(['error' => 'Usuário inativo ou expirado'], 401);
            }
        }
        
        $request->merge(['auth_user' => $decoded]);
        return $next($request);
        
    } catch (Exception $e) {
        return response()->json(['error' => 'Token inválido'], 401);
    }
}
```

---

## 🌐 FRONTEND - PÁGINAS E COMPONENTES

### 🏠 1. Página Inicial (/login)
```javascript
// LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            if (isLogin) {
                const response = await authService.login(formData.username, formData.password);
                localStorage.setItem('token', response.token);
                navigate('/dashboard');
            } else {
                await authService.register(formData);
                setIsLogin(true);
                alert('Conta criada com sucesso! Faça login.');
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Erro na operação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="bg-gray-900 p-8 rounded-lg border border-neon-green shadow-neon max-w-md w-full">
                <h1 className="text-3xl font-bold text-center text-neon-green mb-8">
                    🤖 Bot Admin System
                </h1>
                
                <div className="flex mb-6">
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 px-4 rounded-l-lg ${
                            isLogin ? 'bg-neon-green text-black' : 'bg-gray-800 text-white'
                        }`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 px-4 rounded-r-lg ${
                            !isLogin ? 'bg-neon-green text-black' : 'bg-gray-800 text-white'
                        }`}
                    >
                        Criar Conta
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <input
                                type="text"
                                placeholder="Nome completo"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                                required
                            />
                            <input
                                type="email"
                                placeholder="E-mail"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                                required
                            />
                        </>
                    )}
                    
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                        required
                    />
                    
                    <input
                        type="password"
                        placeholder="Senha"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                        required
                    />
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-blue transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
```

### 📊 2. Dashboard do Cliente (/dashboard)
```javascript
// Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/userService';

const Dashboard = () => {
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserInfo();
    }, []);

    const loadUserInfo = async () => {
        try {
            const response = await userService.getUserInfo();
            setUserInfo(response.data);
        } catch (error) {
            console.error('Erro ao carregar informações:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-neon-green text-xl">Carregando...</div>
            </div>
        );
    }

    const daysLeft = Math.ceil((new Date(userInfo.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft <= 0;

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-neon-green mb-2">
                        🤖 Dashboard - {userInfo.name}
                    </h1>
                    <div className={`text-lg ${isExpired ? 'text-neon-red' : 'text-neon-blue'}`}>
                        📅 Plano {isExpired ? 'EXPIRADO' : 'ativo'} até: {new Date(userInfo.expiry_date).toLocaleDateString('pt-BR')}
                        {!isExpired && (
                            <span className="ml-2 text-neon-green">
                                ({daysLeft} dias restantes)
                            </span>
                        )}
                    </div>
                </header>

                {isExpired && (
                    <div className="bg-red-900 border border-neon-red p-4 rounded-lg mb-6">
                        <h3 className="text-neon-red font-bold mb-2">⚠️ Plano Expirado</h3>
                        <p className="text-white">
                            Seu plano expirou. Entre em contato com o administrador para renovar.
                        </p>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <Link
                        to="/dashboard/grupos"
                        className={`bg-gray-900 border-2 border-neon-blue p-6 rounded-lg hover:bg-gray-800 transition-colors ${
                            isExpired ? 'opacity-50 pointer-events-none' : ''
                        }`}
                    >
                        <div className="text-4xl mb-4">📋</div>
                        <h3 className="text-xl font-bold text-neon-blue mb-2">Meus Grupos</h3>
                        <p className="text-gray-300">
                            Gerencie os grupos conectados ao bot
                        </p>
                    </Link>

                    <Link
                        to="/dashboard/ativacoes"
                        className={`bg-gray-900 border-2 border-neon-purple p-6 rounded-lg hover:bg-gray-800 transition-colors ${
                            isExpired ? 'opacity-50 pointer-events-none' : ''
                        }`}
                    >
                        <div className="text-4xl mb-4">🔘</div>
                        <h3 className="text-xl font-bold text-neon-purple mb-2">Ativações</h3>
                        <p className="text-gray-300">
                            Configure comandos por grupo
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
```

### 📱 3. Gerenciamento de Grupos (/dashboard/grupos)
```javascript
// GroupsPage.js
import React, { useState, useEffect } from 'react';
import { groupService } from '../services/groupService';

const GroupsPage = () => {
    const [groups, setGroups] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: '', link: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const response = await groupService.getGroups();
            setGroups(response.data);
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
        } finally {
            setLoading(false);
        }
    };

    const addGroup = async (e) => {
        e.preventDefault();
        try {
            await groupService.addGroup(newGroup);
            setNewGroup({ name: '', link: '' });
            setShowModal(false);
            loadGroups();
            alert('Grupo adicionado com sucesso!');
        } catch (error) {
            alert(error.response?.data?.message || 'Erro ao adicionar grupo');
        }
    };

    const removeGroup = async (groupId) => {
        if (confirm('Tem certeza que deseja remover este grupo?')) {
            try {
                await groupService.removeGroup(groupId);
                loadGroups();
                alert('Grupo removido com sucesso!');
            } catch (error) {
                alert('Erro ao remover grupo');
            }
        }
    };

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-neon-green mb-4">📋 Meus Grupos</h1>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-neon-green text-black px-6 py-2 rounded-lg font-bold hover:bg-neon-blue transition-colors"
                    >
                        ➕ Adicionar Grupo
                    </button>
                </header>

                {loading ? (
                    <div className="text-center text-neon-green">Carregando grupos...</div>
                ) : (
                    <div className="grid gap-4">
                        {groups.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                Nenhum grupo cadastrado
                            </div>
                        ) : (
                            groups.map((group) => (
                                <div key={group.id} className="bg-gray-900 border border-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {group.group_name || 'Grupo sem nome'}
                                            </h3>
                                            <p className="text-gray-400 text-sm mb-2">
                                                ID: {group.group_id}
                                            </p>
                                            <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                                                group.is_active 
                                                    ? 'bg-green-900 text-neon-green' 
                                                    : 'bg-red-900 text-neon-red'
                                            }`}>
                                                {group.is_active ? '✅ Ativo' : '❌ Inativo'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeGroup(group.id)}
                                            className="text-neon-red hover:text-red-400 transition-colors"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Modal Adicionar Grupo */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-gray-900 p-6 rounded-lg border border-neon-green max-w-md w-full mx-4">
                            <h3 className="text-xl font-bold text-neon-green mb-4">Adicionar Grupo</h3>
                            <form onSubmit={addGroup} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Nome do grupo (opcional)"
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                                    className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Link do grupo ou ID (123456789@g.us)"
                                    value={newGroup.link}
                                    onChange={(e) => setNewGroup({...newGroup, link: e.target.value})}
                                    className="w-full p-3 bg-black border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                                    required
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-neon-green text-black font-bold rounded-lg hover:bg-neon-blue transition-colors"
                                    >
                                        Salvar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupsPage;
```

### ⚙️ 4. Configurações de Comandos (/dashboard/ativacoes)
```javascript
// ConfigsPage.js
import React, { useState, useEffect } from 'react';
import { groupService } from '../services/groupService';

const ConfigsPage = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [configs, setConfigs] = useState({});
    const [loading, setLoading] = useState(true);

    const commandsList = [
        {
            key: 'soadm',
            icon: '👑',
            name: 'Modo Só Admin',
            description: 'Somente admins podem usar comandos interativos'
        },
        {
            key: 'banextremo',
            icon: '💣',
            name: 'Ban Extremo',
            description: 'Banir automaticamente qualquer pessoa que enviar qualquer link'
        },
        {
            key: 'banlinkgp',
            icon: '🔗',
            name: 'Ban Link de Grupo',
            description: 'Banir usuários que enviarem links de grupo'
        },
        {
            key: 'antilinkgp',
            icon: '🧹',
            name: 'Anti-Link de Grupo',
            description: 'Apenas apaga links de grupo, sem banir'
        },
        {
            key: 'antilink',
            icon: '🗑️',
            name: 'Anti-Link',
            description: 'Apenas apaga qualquer link, sem banir'
        },
        {
            key: 'banFoto',
            icon: '📷',
            name: 'Ban Foto/Vídeo',
            description: 'Remove mensagens com imagens, vídeos e mídias'
        },
        {
            key: 'banGringo',
            icon: '🇧🇷',
            name: 'Ban Gringo',
            description: 'Remove contatos com números estrangeiros (fora do +55)'
        }
    ];

    useEffect(() => {
        loadGroups();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            loadGroupConfigs();
        }
    }, [selectedGroup]);

    const loadGroups = async () => {
        try {
            const response = await groupService.getGroups();
            setGroups(response.data);
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadGroupConfigs = async () => {
        try {
            const response = await groupService.getGroupConfigs(selectedGroup);
            setConfigs(response.data);
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    };

    const toggleConfig = async (configKey) => {
        try {
            const currentValue = configs[configKey];
            let newValue;
            
            if (configKey === 'antiLink') {
                // Ciclo para antiLink: null -> banextremo -> banlinkgp -> antilinkgp -> antilink -> null
                const cycle = [null, 'banextremo', 'banlinkgp', 'antilinkgp', 'antilink'];
                const currentIndex = cycle.indexOf(currentValue);
                newValue = cycle[(currentIndex + 1) % cycle.length];
            } else {
                // Toggle simples para outros configs
                newValue = currentValue ? null : (configKey === 'soadm' ? '1' : true);
            }
            
            await groupService.updateGroupConfig(selectedGroup, configKey, newValue);
            setConfigs({ ...configs, [configKey]: newValue });
        } catch (error) {
            alert('Erro ao atualizar configuração');
        }
    };

    const getConfigStatus = (configKey) => {
        const value = configs[configKey];
        
        if (configKey === 'antiLink') {
            switch (value) {
                case 'banextremo': return { active: true, label: 'Ban Extremo' };
                case 'banlinkgp': return { active: true, label: 'Ban Link GP' };
                case 'antilinkgp': return { active: true, label: 'Anti-Link GP' };
                case 'antilink': return { active: true, label: 'Anti-Link' };
                default: return { active: false, label: 'Desativado' };
            }
        }
        
        return {
            active: value === '1' || value === true,
            label: (value === '1' || value === true) ? 'Ativado' : 'Desativado'
        };
    };

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-neon-green mb-4">🔘 Ativações de Comandos</h1>
                    
                    <div className="mb-6">
                        <label className="block text-white mb-2">🧩 Selecione um grupo:</label>
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-neon-green focus:outline-none"
                        >
                            <option value="">Selecione um grupo</option>
                            {groups.map((group) => (
                                <option key={group.id} value={group.group_id}>
                                    {group.group_name || `Grupo ${group.group_id.substring(0, 15)}...`}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {selectedGroup ? (
                    <div className="space-y-4">
                        {commandsList.map((command) => {
                            const status = getConfigStatus(command.key);
                            
                            return (
                                <div key={command.key} className="bg-gray-900 border border-gray-700 p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="text-3xl">{command.icon}</div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">
                                                    {command.name}
                                                </h3>
                                                <p className="text-gray-400 text-sm">
                                                    {command.description}
                                                </p>
                                                <div className={`mt-2 text-sm ${
                                                    status.active ? 'text-neon-green' : 'text-gray-500'
                                                }`}>
                                                    Status: {status.label}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => toggleConfig(command.key)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                status.active ? 'bg-neon-green' : 'bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    status.active ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-8">
                        Selecione um grupo para configurar os comandos
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfigsPage;
```

---

## 🔧 BACKEND - API LARAVEL

### 🎯 Controllers Principais

#### 👤 AuthController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthController extends Controller
{
    private $jwtSecret;

    public function __construct()
    {
        $this->jwtSecret = env('JWT_SECRET', 'your-secret-key');
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Dados inválidos'], 400);
        }

        // Tentar login como cliente
        $user = User::where('username', $request->username)->first();
        
        if ($user && Hash::check($request->password, $user->password)) {
            // Verificar se o usuário está ativo e não expirado
            if (!$user->is_active || $user->expiry_date < now()) {
                return response()->json(['error' => 'Usuário inativo ou expirado'], 401);
            }

            $token = $this->generateToken($user->id, $user->username, 'client');
            
            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'expiry_date' => $user->expiry_date,
                    'type' => 'client'
                ]
            ]);
        }

        // Tentar login como admin
        $admin = Admin::where('email', $request->username)->first();
        
        if ($admin && Hash::check($request->password, $admin->password)) {
            $token = $this->generateToken($admin->id, $admin->email, 'admin');
            
            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'type' => 'admin'
                ]
            ]);
        }

        return response()->json(['error' => 'Credenciais inválidas'], 401);
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'username' => 'required|string|max:100|unique:users',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'expiry_date' => now()->addDays(7), // 7 dias de teste
            'is_active' => true,
        ]);

        return response()->json(['message' => 'Usuário criado com sucesso'], 201);
    }

    private function generateToken($userId, $username, $type)
    {
        $payload = [
            'user_id' => $userId,
            'username' => $username,
            'type' => $type,
            'exp' => time() + (24 * 60 * 60), // 24 horas
            'iat' => time()
        ];

        return JWT::encode($payload, $this->jwtSecret, 'HS256');
    }

    public function me(Request $request)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type === 'client') {
            $user = User::find($authUser->user_id);
            return response()->json([
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'expiry_date' => $user->expiry_date,
                'type' => 'client'
            ]);
        } else {
            $admin = Admin::find($authUser->user_id);
            return response()->json([
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'type' => 'admin'
            ]);
        }
    }
}
```

#### 📱 GroupController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\WhatsappGroup;
use App\Models\GroupConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GroupController extends Controller
{
    public function index(Request $request)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'client') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $groups = WhatsappGroup::where('user_id', $authUser->user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'client') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'link' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        // Extrair ID do grupo do link
        $groupId = $this->extractGroupId($request->link);
        
        if (!$groupId) {
            return response()->json(['error' => 'Link ou ID do grupo inválido'], 400);
        }

        // Verificar se o grupo já existe para este usuário
        $existingGroup = WhatsappGroup::where('user_id', $authUser->user_id)
            ->where('group_id', $groupId)
            ->first();

        if ($existingGroup) {
            return response()->json(['error' => 'Grupo já cadastrado'], 400);
        }

        $group = WhatsappGroup::create([
            'user_id' => $authUser->user_id,
            'group_id' => $groupId,
            'group_name' => $request->name,
            'group_link' => $request->link,
            'is_active' => true,
        ]);

        return response()->json($group, 201);
    }

    public function destroy(Request $request, $id)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'client') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $group = WhatsappGroup::where('id', $id)
            ->where('user_id', $authUser->user_id)
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Grupo não encontrado'], 404);
        }

        // Remover configurações do grupo
        GroupConfig::where('group_id', $group->group_id)->delete();
        
        $group->delete();

        return response()->json(['message' => 'Grupo removido com sucesso']);
    }

    public function getConfigs(Request $request, $groupId)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'client') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Verificar se o grupo pertence ao usuário
        $group = WhatsappGroup::where('group_id', $groupId)
            ->where('user_id', $authUser->user_id)
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Grupo não encontrado'], 404);
        }

        $configs = GroupConfig::where('group_id', $groupId)->get();
        
        $configsArray = [];
        foreach ($configs as $config) {
            $configsArray[$config->config_key] = $config->config_value;
        }

        return response()->json($configsArray);
    }

    public function updateConfig(Request $request, $groupId)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'client') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'config_key' => 'required|string',
            'config_value' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        // Verificar se o grupo pertence ao usuário
        $group = WhatsappGroup::where('group_id', $groupId)
            ->where('user_id', $authUser->user_id)
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Grupo não encontrado'], 404);
        }

        // Atualizar ou criar configuração
        GroupConfig::updateOrCreate(
            [
                'group_id' => $groupId,
                'config_key' => $request->config_key,
            ],
            [
                'config_value' => $request->config_value,
            ]
        );

        return response()->json(['message' => 'Configuração atualizada com sucesso']);
    }

    private function extractGroupId($input)
    {
        // Se já é um ID do grupo (termina com @g.us)
        if (preg_match('/^(\d+)@g\.us$/', $input)) {
            return $input;
        }

        // Se é um link do WhatsApp
        if (preg_match('/chat\.whatsapp\.com\/([A-Za-z0-9]+)/', $input, $matches)) {
            // Aqui você precisaria de uma função para converter o código do link em group_id
            // Por enquanto, vamos retornar o código como se fosse o ID
            return $matches[1] . '@g.us';
        }

        // Se é só o número
        if (preg_match('/^\d+$/', $input)) {
            return $input . '@g.us';
        }

        return null;
    }
}
```

#### 👑 AdminController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WhatsappGroup;
use App\Models\GroupConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'admin') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $stats = [
            'total_clients' => User::count(),
            'active_clients' => User::where('is_active', true)->where('expiry_date', '>', now())->count(),
            'expired_clients' => User::where('expiry_date', '<', now())->count(),
            'total_groups' => WhatsappGroup::count(),
        ];

        return response()->json($stats);
    }

    public function getClients(Request $request)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'admin') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $clients = User::with('groups')->orderBy('created_at', 'desc')->get();

        return response()->json($clients);
    }

    public function createClient(Request $request)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'admin') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'username' => 'required|string|max:100|unique:users',
            'password' => 'required|string|min:6',
            'expiry_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'expiry_date' => $request->expiry_date,
            'is_active' => true,
        ]);

        return response()->json($user, 201);
    }

    public function updateClient(Request $request, $id)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'admin') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $user = User::find($id);
        
        if (!$user) {
            return response()->json(['error' => 'Usuário não encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'email' => 'string|email|max:255|unique:users,email,' . $id,
            'username' => 'string|max:100|unique:users,username,' . $id,
            'password' => 'nullable|string|min:6',
            'expiry_date' => 'date',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $updateData = $request->only(['name', 'email', 'username', 'expiry_date', 'is_active']);
        
        if ($request->password) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return response()->json($user);
    }

    public function deleteClient(Request $request, $id)
    {
        $authUser = $request->auth_user;
        
        if ($authUser->type !== 'admin') {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $user = User::find($id);
        
        if (!$user) {
            return response()->json(['error' => 'Usuário não encontrado'], 404);
        }

        // Remover grupos e configurações relacionadas
        $groups = WhatsappGroup::where('user_id', $id)->get();
        foreach ($groups as $group) {
            GroupConfig::where('group_id', $group->group_id)->delete();
        }
        WhatsappGroup::where('user_id', $id)->delete();

        $user->delete();

        return response()->json(['message' => 'Usuário removido com sucesso']);
    }
}
```

---

## 🤖 INTEGRAÇÃO BOT - MODIFICAÇÕES NECESSÁRIAS

### 🔧 Modificações no config.json
```json
{
  "numeroBot": "5543996191351",
  "numeroDono": "554191236158",
  "prefix": "!",
  "timezone": "America/Sao_Paulo",
  "autoReconnect": true,
  "sessaoPersistente": true,
  "laravelApi": {
    "enabled": true,
    "baseUrl": "https://seu-site.com/api",
    "token": "seu-token-api-aqui"
  },
  "botInfo": {
    "nome": "Bot Admin",
    "versao": "2.0.0",
    "descricao": "Bot Administrador de Grupos WhatsApp - Integrado com Web"
  },
  "groqApiKey": "SUA_CHAVE_GROQ_AQUI"
}
```

### 🔌 Novo Módulo: apiIntegration.js
```javascript
// apiIntegration.js
const axios = require('axios');
const config = require('./config.json');

class ApiIntegration {
    constructor() {
        this.baseUrl = config.laravelApi.baseUrl;
        this.token = config.laravelApi.token;
        this.enabled = config.laravelApi.enabled;
    }

    async makeRequest(method, endpoint, data = null) {
        if (!this.enabled) {
            return null;
        }

        try {
            const response = await axios({
                method,
                url: `${this.baseUrl}${endpoint}`,
                data,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error(`Erro na API (${method} ${endpoint}):`, error.message);
            return null;
        }
    }

    async getGroupConfig(groupId) {
        const response = await this.makeRequest('GET', `/bot/group-config/${groupId}`);
        return response || {};
    }

    async updateGroupConfig(groupId, configKey, configValue) {
        return await this.makeRequest('POST', `/bot/group-config/${groupId}`, {
            config_key: configKey,
            config_value: configValue
        });
    }

    async checkGroupOwner(groupId) {
        const response = await this.makeRequest('GET', `/bot/group-owner/${groupId}`);
        return response;
    }

    async logBotAction(groupId, userPhone, action, details) {
        return await this.makeRequest('POST', '/bot/log', {
            group_id: groupId,
            user_phone: userPhone,
            action,
            details: JSON.stringify(details)
        });
    }

    async getExpiredGroups() {
        const response = await this.makeRequest('GET', '/bot/expired-groups');
        return response || [];
    }
}

module.exports = new ApiIntegration();
```

### 🔄 Modificações no DataManager (index.js)
```javascript
// Adicionar no index.js, na classe DataManager
const apiIntegration = require('./apiIntegration');

class DataManager {
    // ... código existente ...

    static async loadConfig(groupId, key = null) {
        // Primeiro tentar carregar da API
        if (apiIntegration.enabled) {
            const apiConfig = await apiIntegration.getGroupConfig(groupId);
            if (apiConfig && Object.keys(apiConfig).length > 0) {
                return key ? apiConfig[key] : apiConfig;
            }
        }

        // Fallback para arquivo local
        const configs = await this.loadData('configs.json');
        if (!configs.grupos || !configs.grupos[groupId]) return key ? null : {};
        return key ? configs.grupos[groupId][key] : configs.grupos[groupId];
    }

    static async saveConfig(groupId, key, value) {
        // Salvar na API se habilitada
        if (apiIntegration.enabled) {
            await apiIntegration.updateGroupConfig(groupId, key, value);
        }

        // Salvar localmente como backup
        const configs = await this.loadData('configs.json');
        if (!configs.grupos) configs.grupos = {};
        if (!configs.grupos[groupId]) configs.grupos[groupId] = {};
        configs.grupos[groupId][key] = value;
        return await this.saveData('configs.json', configs);
    }
}

// Adicionar sistema de verificação de expiração
class ExpirationChecker {
    static async checkExpiredGroups(client) {
        if (!apiIntegration.enabled) return;

        const expiredGroups = await apiIntegration.getExpiredGroups();
        
        for (const group of expiredGroups) {
            try {
                const chat = await client.getChatById(group.group_id);
                
                // Enviar mensagem de aviso
                await client.sendMessage(group.group_id, 
                    '⚠️ *LICENÇA EXPIRADA* ⚠️\n\n' +
                    '🔒 A licença deste grupo expirou.\n' +
                    '📞 Entre em contato para renovar o serviço.\n\n' +
                    '👋 O bot será removido em alguns instantes.'
                );

                // Aguardar 30 segundos e sair do grupo
                setTimeout(async () => {
                    try {
                        await chat.leave();
                        console.log(`Bot saiu do grupo expirado: ${group.group_id}`);
                    } catch (error) {
                        console.error(`Erro ao sair do grupo ${group.group_id}:`, error);
                    }
                }, 30000);

            } catch (error) {
                console.error(`Erro ao processar grupo expirado ${group.group_id}:`, error);
            }
        }
    }

    static startExpirationChecker(client) {
        // Verificar grupos expirados às 21h todos os dias
        const checkTime = () => {
            const now = new Date();
            const target = new Date();
            target.setHours(21, 0, 0, 0);
            
            if (now > target) {
                target.setDate(target.getDate() + 1);
            }
            
            const timeUntilCheck = target - now;
            
            setTimeout(() => {
                this.checkExpiredGroups(client);
                // Reagendar para o próximo dia
                setInterval(() => {
                    this.checkExpiredGroups(client);
                }, 24 * 60 * 60 * 1000); // 24 horas
            }, timeUntilCheck);
        };

        checkTime();
    }
}
```

### 🔄 Modificações no Sistema de Aluguel
```javascript
// Modificar a classe RentalSystem no index.js
class RentalSystem {
    static async checkGroupStatus(groupId) {
        // Verificar via API primeiro
        if (apiIntegration.enabled) {
            const ownerInfo = await apiIntegration.checkGroupOwner(groupId);
            if (ownerInfo) {
                const now = new Date();
                const expiry = new Date(ownerInfo.expiry_date);
                
                if (now > expiry) {
                    return { 
                        active: false, 
                        message: '⚠️ A licença deste grupo expirou. Renove o serviço para continuar usando.' 
                    };
                }
                
                const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                return { 
                    active: true, 
                    daysLeft,
                    expiry: expiry.toLocaleDateString('pt-BR')
                };
            }
        }

        // Fallback para sistema local
        const rentals = await DataManager.loadData('grupoAluguel.json');
        
        if (!rentals.grupos || !rentals.grupos[groupId]) {
            return { active: false, message: '⚠️ Este grupo não está autorizado a usar o bot. Contrate o serviço para ativar.' };
        }

        const groupData = rentals.grupos[groupId];
        const now = moment();
        const expiry = moment(groupData.expiry);

        if (now.isAfter(expiry)) {
            return { active: false, message: '⚠️ A licença deste grupo expirou. Renove o serviço para continuar usando.' };
        }

        const daysLeft = expiry.diff(now, 'days');
        return { 
            active: true, 
            daysLeft,
            expiry: expiry.format('DD/MM/YYYY HH:mm')
        };
    }
}
```

---

## 🌐 ROTAS DA API

### 📋 Rotas de Autenticação
```php
// routes/api.php

// Autenticação
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Rotas protegidas
Route::middleware(['auth.jwt'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    
    // Rotas do cliente
    Route::middleware(['auth.jwt:client'])->group(function () {
        Route::get('/groups', [GroupController::class, 'index']);
        Route::post('/groups', [GroupController::class, 'store']);
        Route::delete('/groups/{id}', [GroupController::class, 'destroy']);
        Route::get('/groups/{groupId}/configs', [GroupController::class, 'getConfigs']);
        Route::post('/groups/{groupId}/configs', [GroupController::class, 'updateConfig']);
    });
    
    // Rotas do admin
    Route::middleware(['auth.jwt:admin'])->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/clients', [AdminController::class, 'getClients']);
        Route::post('/admin/clients', [AdminController::class, 'createClient']);
        Route::put('/admin/clients/{id}', [AdminController::class, 'updateClient']);
        Route::delete('/admin/clients/{id}', [AdminController::class, 'deleteClient']);
    });
});

// Rotas específicas para o bot
Route::middleware(['auth.bot'])->group(function () {
    Route::get('/bot/group-config/{groupId}', [BotController::class, 'getGroupConfig']);
    Route::post('/bot/group-config/{groupId}', [BotController::class, 'updateGroupConfig']);
    Route::get('/bot/group-owner/{groupId}', [BotController::class, 'getGroupOwner']);
    Route::post('/bot/log', [BotController::class, 'logAction']);
    Route::get('/bot/expired-groups', [BotController::class, 'getExpiredGroups']);
});
```

### 🤖 BotController.php
```php
<?php

namespace App\Http\Controllers;

use App\Models\WhatsappGroup;
use App\Models\GroupConfig;
use App\Models\User;
use App\Models\BotLog;
use Illuminate\Http\Request;

class BotController extends Controller
{
    public function getGroupConfig($groupId)
    {
        $configs = GroupConfig::where('group_id', $groupId)->get();
        
        $configsArray = [];
        foreach ($configs as $config) {
            $configsArray[$config->config_key] = $config->config_value;
        }

        return response()->json($configsArray);
    }

    public function updateGroupConfig(Request $request, $groupId)
    {
        GroupConfig::updateOrCreate(
            [
                'group_id' => $groupId,
                'config_key' => $request->config_key,
            ],
            [
                'config_value' => $request->config_value,
            ]
        );

        return response()->json(['message' => 'Configuração atualizada']);
    }

    public function getGroupOwner($groupId)
    {
        $group = WhatsappGroup::where('group_id', $groupId)->first();
        
        if (!$group) {
            return response()->json(['error' => 'Grupo não encontrado'], 404);
        }

        $user = User::find($group->user_id);
        
        return response()->json([
            'user_id' => $user->id,
            'username' => $user->username,
            'expiry_date' => $user->expiry_date,
            'is_active' => $user->is_active && $user->expiry_date > now()
        ]);
    }

    public function logAction(Request $request)
    {
        BotLog::create([
            'group_id' => $request->group_id,
            'user_phone' => $request->user_phone,
            'action' => $request->action,
            'details' => $request->details,
        ]);

        return response()->json(['message' => 'Log registrado']);
    }

    public function getExpiredGroups()
    {
        $expiredGroups = WhatsappGroup::whereHas('user', function ($query) {
            $query->where('expiry_date', '<', now())
                  ->orWhere('is_active', false);
        })->get();

        return response()->json($expiredGroups);
    }
}
```

---

## 🚀 PROCESSO DE INSTALAÇÃO

### 1. 📦 Configuração do Backend (Laravel)
```bash
# Criar projeto Laravel
composer create-project laravel/laravel bot-admin-backend
cd bot-admin-backend

# Instalar dependências
composer require firebase/php-jwt
composer require laravel/sanctum

# Configurar banco de dados (.env)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=bot_admin
DB_USERNAME=root
DB_PASSWORD=

# Configurar JWT
JWT_SECRET=sua-chave-secreta-super-segura-aqui

# Executar migrações
php artisan migrate

# Criar admin padrão
php artisan db:seed --class=AdminSeeder

# Iniciar servidor
php artisan serve
```

### 2. 🎨 Configuração do Frontend (React)
```bash
# Criar projeto React
npx create-react-app bot-admin-frontend
cd bot-admin-frontend

# Instalar dependências
npm install axios react-router-dom

# Configurar variáveis de ambiente (.env)
REACT_APP_API_URL=http://localhost:8000/api

# Iniciar desenvolvimento
npm start
```

### 3. 🤖 Configuração do Bot
```bash
# No diretório do bot existente
npm install axios

# Atualizar config.json
{
  "laravelApi": {
    "enabled": true,
    "baseUrl": "http://localhost:8000/api",
    "token": "seu-token-api-bot"
  }
}

# Executar bot
npm start
```

---

## 🔄 SINCRONIZAÇÃO EM TEMPO REAL

### 📡 WebSocket para Atualizações Instantâneas
```javascript
// websocket.js (Frontend)
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('WebSocket conectado');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('WebSocket desconectado');
            this.reconnect();
        };

        this.ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
        };
    }

    handleMessage(data) {
        switch (data.type) {
            case 'config_updated':
                // Atualizar configurações na interface
                window.dispatchEvent(new CustomEvent('configUpdated', { detail: data }));
                break;
            case 'group_added':
                // Atualizar lista de grupos
                window.dispatchEvent(new CustomEvent('groupAdded', { detail: data }));
                break;
            case 'bot_action':
                // Mostrar ação do bot em tempo real
                window.dispatchEvent(new CustomEvent('botAction', { detail: data }));
                break;
        }
    }

    reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connect();
            }, this.reconnectInterval);
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
}

export default new WebSocketManager();
```

---

## 📊 MONITORAMENTO E LOGS

### 📈 Dashboard de Estatísticas
```javascript
// StatsPage.js
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

const StatsPage = () => {
    const [stats, setStats] = useState({
        totalClients: 0,
        activeClients: 0,
        expiredClients: 0,
        totalGroups: 0,
        botActions: []
    });

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 30000); // Atualizar a cada 30s
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            const response = await adminService.getStats();
            setStats(response.data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-neon-green mb-8">📊 Estatísticas do Sistema</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-900 border border-neon-blue p-6 rounded-lg">
                        <div className="text-3xl text-neon-blue mb-2">{stats.totalClients}</div>
                        <div className="text-white">Total de Clientes</div>
                    </div>
                    
                    <div className="bg-gray-900 border border-neon-green p-6 rounded-lg">
                        <div className="text-3xl text-neon-green mb-2">{stats.activeClients}</div>
                        <div className="text-white">Clientes Ativos</div>
                    </div>
                    
                    <div className="bg-gray-900 border border-neon-red p-6 rounded-lg">
                        <div className="text-3xl text-neon-red mb-2">{stats.expiredClients}</div>
                        <div className="text-white">Clientes Expirados</div>
                    </div>
                    
                    <div className="bg-gray-900 border border-neon-purple p-6 rounded-lg">
                        <div className="text-3xl text-neon-purple mb-2">{stats.totalGroups}</div>
                        <div className="text-white">Total de Grupos</div>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
                    <h2 className="text-xl font-bold text-white mb-4">📝 Logs Recentes do Bot</h2>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {stats.botActions.map((action, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-black rounded border border-gray-800">
                                <div>
                                    <span className="text-neon-green">{action.action}</span>
                                    <span className="text-gray-400 ml-2">em {action.group_name}</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {new Date(action.created_at).toLocaleString('pt-BR')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsPage;
```

---

## 🔒 SEGURANÇA E VALIDAÇÕES

### 🛡️ Middleware de Segurança
```php
// app/Http/Middleware/BotAuthMiddleware.php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class BotAuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->header('Authorization');
        
        if (!$token || $token !== 'Bearer ' . env('BOT_API_TOKEN')) {
            return response()->json(['error' => 'Token inválido'], 401);
        }

        return $next($request);
    }
}
```

### 🔐 Rate Limiting
```php
// config/rate-limiting.php
Route::middleware(['throttle:60,1'])->group(function () {
    // Rotas da API com limite de 60 requisições por minuto
});
```

---

## 📱 RESPONSIVIDADE E PWA

### 📲 Configuração PWA
```json
// public/manifest.json
{
  "name": "Bot Admin System",
  "short_name": "BotAdmin",
  "description": "Sistema de gerenciamento para bot WhatsApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#00ff41",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 🚀 DEPLOY E PRODUÇÃO

### 🌐 Deploy do Backend
```bash
# Configurar servidor (Ubuntu)
sudo apt update
sudo apt install nginx mysql-server php8.1-fpm php8.1-mysql composer

# Configurar banco de dados
sudo mysql -u root -p
CREATE DATABASE bot_admin;
CREATE USER 'bot_admin'@'localhost' IDENTIFIED BY 'senha_segura';
GRANT ALL PRIVILEGES ON bot_admin.* TO 'bot_admin'@'localhost';

# Deploy da aplicação
git clone https://github.com/seu-usuario/bot-admin-backend.git
cd bot-admin-backend
composer install --no-dev
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan config:cache
php artisan route:cache
```

### 🎨 Deploy do Frontend
```bash
# Build para produção
npm run build

# Configurar Nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /var/www/html/bot-admin-frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔄 MANUTENÇÃO E ATUALIZAÇÕES

### 🔧 Sistema de Backup Automático
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u bot_admin -p bot_admin > /backups/db_backup_$DATE.sql
tar -czf /backups/files_backup_$DATE.tar.gz /var/www/html/bot-admin-backend
```

### 📊 Monitoramento de Performance
```javascript
// performance-monitor.js
const performanceMonitor = {
    startTime: Date.now(),
    
    logApiCall: (endpoint, duration) => {
        console.log(`API Call: ${endpoint} - ${duration}ms`);
        
        if (duration > 5000) {
            console.warn(`Slow API call detected: ${endpoint}`);
        }
    },
    
    trackUserAction: (action) => {
        const timestamp = Date.now();
        localStorage.setItem('lastAction', JSON.stringify({
            action,
            timestamp
        }));
    }
};
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### ✅ Fase 1: Estrutura Base
- [ ] Configurar ambiente de desenvolvimento
- [ ] Criar banco de dados e migrações
- [ ] Implementar sistema de autenticação
- [ ] Criar páginas básicas do frontend
- [ ] Configurar roteamento

### ✅ Fase 2: Funcionalidades Core
- [ ] Sistema de gerenciamento de grupos
- [ ] Configuração de comandos por grupo
- [ ] Integração com bot existente
- [ ] Sistema de logs e monitoramento
- [ ] Painel administrativo

### ✅ Fase 3: Melhorias e Otimizações
- [ ] Implementar WebSocket para tempo real
- [ ] Adicionar sistema de notificações
- [ ] Otimizar performance
- [ ] Implementar PWA
- [ ] Testes automatizados

### ✅ Fase 4: Deploy e Produção
- [ ] Configurar servidor de produção
- [ ] Implementar SSL/HTTPS
- [ ] Configurar backups automáticos
- [ ] Monitoramento de performance
- [ ] Documentação completa

---

## 🎯 CONSIDERAÇÕES FINAIS

Este roteiro fornece uma base sólida para criar um sistema web completo integrado com o bot WebJS existente. O sistema mantém todas as funcionalidades do bot original enquanto adiciona uma interface web moderna e intuitiva para gerenciamento.

**Principais Benefícios:**
- ✅ Sincronização em tempo real entre web e bot
- ✅ Interface moderna e responsiva
- ✅ Sistema de autenticação robusto
- ✅ Gerenciamento centralizado de configurações
- ✅ Logs detalhados e monitoramento
- ✅ Escalabilidade para múltiplos clientes

**Tecnologias Utilizadas:**
- **Frontend:** React.js, TailwindCSS, Axios
- **Backend:** Laravel, MySQL, JWT
- **Bot:** Node.js, WhatsApp-Web.js
- **Infraestrutura:** Nginx, SSL, WebSocket

O sistema está projetado para ser facilmente extensível e mantível, com arquitetura modular que permite adicionar novas funcionalidades conforme necessário.