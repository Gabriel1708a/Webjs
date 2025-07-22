import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  SaveAsIcon,
  RefreshIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const Settings = () => {
  const [settings, setSettings] = useState({
    botNumber: '',
    ownerNumber: '',
    prefix: '!',
    timezone: 'America/Sao_Paulo',
    autoReconnect: true,
    laravelApi: {
      enabled: false,
      baseUrl: '',
      token: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put('/settings', settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const restartBot = async () => {
    try {
      await axios.post('/bot/restart');
      toast.success('Bot reiniciado com sucesso!');
    } catch (error) {
      toast.error('Erro ao reiniciar bot');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-500 mt-4 text-center">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold neon-text">Configurações</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={restartBot}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 rounded-lg transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
            <span>Reiniciar Bot</span>
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-neon disabled:opacity-50"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Salvando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <SaveAsIcon className="w-4 h-4" />
                <span>Salvar</span>
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações Básicas */}
        <div className="card-futuristic p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <CogIcon className="w-5 h-5 mr-2 text-green-500" />
            Configurações Básicas
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número do Bot
              </label>
              <input
                type="text"
                value={settings.botNumber}
                onChange={(e) => setSettings({...settings, botNumber: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white"
                placeholder="5511999999999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número do Dono
              </label>
              <input
                type="text"
                value={settings.ownerNumber}
                onChange={(e) => setSettings({...settings, ownerNumber: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white"
                placeholder="5511888888888"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Prefixo dos Comandos
              </label>
              <input
                type="text"
                value={settings.prefix}
                onChange={(e) => setSettings({...settings, prefix: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white"
                placeholder="!"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white"
              >
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoReconnect"
                checked={settings.autoReconnect}
                onChange={(e) => setSettings({...settings, autoReconnect: e.target.checked})}
                className="w-4 h-4 text-green-500 bg-gray-900 border-gray-700 rounded focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="autoReconnect" className="ml-2 text-sm text-gray-300">
                Reconexão Automática
              </label>
            </div>
          </div>
        </div>

        {/* Integração Laravel */}
        <div className="card-futuristic p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-green-500" />
            Integração Laravel
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="laravelEnabled"
                checked={settings.laravelApi.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  laravelApi: { ...settings.laravelApi, enabled: e.target.checked }
                })}
                className="w-4 h-4 text-green-500 bg-gray-900 border-gray-700 rounded focus:ring-green-500 focus:ring-2"
              />
              <label htmlFor="laravelEnabled" className="ml-2 text-sm text-gray-300">
                Habilitar API Laravel
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL Base da API
              </label>
              <input
                type="text"
                value={settings.laravelApi.baseUrl}
                onChange={(e) => setSettings({
                  ...settings,
                  laravelApi: { ...settings.laravelApi, baseUrl: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white"
                placeholder="https://seu-site.com/api"
                disabled={!settings.laravelApi.enabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token de Autenticação
              </label>
              <input
                type="password"
                value={settings.laravelApi.token}
                onChange={(e) => setSettings({
                  ...settings,
                  laravelApi: { ...settings.laravelApi, token: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white"
                placeholder="seu-token-api"
                disabled={!settings.laravelApi.enabled}
              />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-500">
                    Aviso Importante
                  </h3>
                  <div className="mt-2 text-sm text-yellow-300">
                    <p>
                      Alterações nestas configurações requerem reinicialização do bot para terem efeito.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
