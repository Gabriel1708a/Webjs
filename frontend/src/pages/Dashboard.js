import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const Dashboard = ({ socket }) => {
  const [stats, setStats] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalMessages: 0,
    botStatus: 'offline'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // WebSocket listeners
    if (socket) {
      socket.on('bot-status', (status) => {
        setStats(prev => ({ ...prev, botStatus: status }));
      });

      socket.on('new-activity', (activity) => {
        setRecentActivity(prev => [activity, ...prev.slice(0, 9)]);
      });
    }

    return () => {
      if (socket) {
        socket.off('bot-status');
        socket.off('new-activity');
      }
    };
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/dashboard/stats');
      setStats(response.data.stats);
      setRecentActivity(response.data.recentActivity);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'green' }) => (
    <div className="card-futuristic p-6 hover:border-green-500/50 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold text-${color}-500 mt-2`}>{value}</p>
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg`}>
          <Icon className={`w-8 h-8 text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-800/50 rounded-lg transition-colors">
      <div className={`w-2 h-2 rounded-full ${
        activity.type === 'success' ? 'bg-green-500' : 
        activity.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
      }`}></div>
      <div className="flex-1">
        <p className="text-white text-sm">{activity.message}</p>
        <p className="text-gray-400 text-xs">{activity.timestamp}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-500 mt-4 text-center">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold neon-text">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            stats.botStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className="text-gray-300 text-sm">
            Bot {stats.botStatus === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Grupos" 
          value={stats.totalGroups} 
          icon={UserGroupIcon}
          color="green"
        />
        <StatCard 
          title="Grupos Ativos" 
          value={stats.activeGroups} 
          icon={CheckCircleIcon}
          color="blue"
        />
        <StatCard 
          title="Mensagens Hoje" 
          value={stats.totalMessages} 
          icon={ChatBubbleLeftRightIcon}
          color="purple"
        />
        <StatCard 
          title="Uptime" 
          value="24h 15m" 
          icon={ClockIcon}
          color="yellow"
        />
      </div>

      {/* Seção de Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividade Recente */}
        <div className="card-futuristic p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-green-500" />
            Atividade Recente
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">Nenhuma atividade recente</p>
            )}
          </div>
        </div>

        {/* Status do Sistema */}
        <div className="card-futuristic p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-green-500" />
            Status do Sistema
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-300">WhatsApp Connection</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-500 text-sm">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-300">Database</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-500 text-sm">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <span className="text-gray-300">API Server</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-500 text-sm">Running</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
