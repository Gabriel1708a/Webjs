import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await onLogin(credentials);
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background com efeito de grid */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(0,255,65,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,65,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="card-futuristic p-8 animate-pulse-neon">
          {/* Logo/Título */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold neon-text mb-2">Bot Admin</h1>
            <p className="text-gray-400">Painel de Controle WhatsApp</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Usuário
              </label>
              <input
                type="text"
                required
                value={credentials.username}
                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white placeholder-gray-500"
                placeholder="Digite seu usuário"
              />
            </div>

            {/* Campo Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white placeholder-gray-500 pr-12"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-500 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Informações adicionais */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Acesso restrito aos administradores</p>
            <p className="mt-2">Bot Admin v1.0</p>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="absolute -top-10 -left-10 w-20 h-20 border-2 border-green-500/30 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-16 h-16 border-2 border-blue-500/30 rounded-full animate-pulse delay-1000"></div>
      </div>
    </div>
  );
};

export default Login;
