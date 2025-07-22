import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Sidebar = ({ user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
    { name: 'Grupos', path: '/groups', icon: UserGroupIcon },
    { name: 'Configurações', path: '/settings', icon: CogIcon },
  ];

  return (
    <div className={`bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header da Sidebar */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold neon-text">Bot Admin</h2>
              <p className="text-gray-400 text-sm">v1.0.0</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-green-500/20 border border-green-500/30 text-green-500'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-white font-medium truncate">{user?.name || 'Usuário'}</p>
            <p className="text-gray-400 text-sm truncate">{user?.email || 'admin@bot.com'}</p>
          </div>
        )}
        <button
          onClick={onLogout}
          className="flex items-center space-x-3 w-full p-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
