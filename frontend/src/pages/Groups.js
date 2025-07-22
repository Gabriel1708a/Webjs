import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const Groups = ({ socket }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchGroups();

    // WebSocket listeners
    if (socket) {
      socket.on('group-updated', (group) => {
        setGroups(prev => prev.map(g => g.id === group.id ? group : g));
      });
    }

    return () => {
      if (socket) {
        socket.off('group-updated');
      }
    };
  }, [socket]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/groups');
      setGroups(response.data);
    } catch (error) {
      toast.error('Erro ao buscar grupos');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupStatus = async (groupId, currentStatus) => {
    try {
      await axios.patch(`/groups/${groupId}/status`, {
        active: !currentStatus
      });
      
      setGroups(prev => 
        prev.map(group => 
          group.id === groupId 
            ? { ...group, active: !currentStatus }
            : group
        )
      );
      
      toast.success('Status do grupo atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status do grupo');
    }
  };

  const extendGroupExpiry = async (groupId, days) => {
    try {
      await axios.patch(`/groups/${groupId}/extend`, { days });
      toast.success(`Grupo liberado por mais ${days} dias!`);
      fetchGroups();
    } catch (error) {
      toast.error('Erro ao estender validade do grupo');
    }
  };

  const GroupCard = ({ group }) => (
    <div className="card-futuristic p-6 hover:border-green-500/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{group.name}</h3>
          <p className="text-gray-400 text-sm">{group.id}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            group.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm ${
            group.active ? 'text-green-500' : 'text-red-500'
          }`}>
            {group.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Membros:</span>
          <span className="text-white flex items-center">
            <UsersIcon className="w-4 h-4 mr-1" />
            {group.memberCount || 0}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Validade:</span>
          <span className={`${
            group.expiryDate && new Date(group.expiryDate) < new Date()
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            {group.expiryDate 
              ? new Date(group.expiryDate).toLocaleDateString('pt-BR')
              : 'Sem validade'
            }
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Comandos ativos:</span>
          <span className="text-white">{group.activeCommands || 0}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => toggleGroupStatus(group.id, group.active)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            group.active
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
          }`}
        >
          {group.active ? 'Desativar' : 'Ativar'}
        </button>
        
        <button
          onClick={() => {
            setSelectedGroup(group);
            setShowModal(true);
          }}
          className="px-3 py-2 bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 rounded-lg transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
        </button>

        <div className="relative group">
          <button className="px-3 py-2 bg-purple-500/20 text-purple-500 hover:bg-purple-500/30 rounded-lg transition-colors">
            <PlusIcon className="w-4 h-4" />
          </button>
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-gray-800 rounded-lg p-2 whitespace-nowrap space-y-1">
              <button
                onClick={() => extendGroupExpiry(group.id, 7)}
                className="block w-full text-left px-3 py-1 text-sm text-white hover:bg-gray-700 rounded"
              >
                +7 dias
              </button>
              <button
                onClick={() => extendGroupExpiry(group.id, 30)}
                className="block w-full text-left px-3 py-1 text-sm text-white hover:bg-gray-700 rounded"
              >
                +30 dias
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-500 mt-4 text-center">Carregando grupos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold neon-text">Gerenciar Grupos</h1>
        <div className="text-sm text-gray-400">
          {groups.filter(g => g.active).length} de {groups.length} grupos ativos
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Nenhum grupo encontrado</p>
          <p className="text-gray-500 text-sm mt-2">
            Os grupos aparecerão aqui quando o bot for adicionado
          </p>
        </div>
      )}
    </div>
  );
};

export default Groups;
