import React from 'react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Header = ({ user }) => {
  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar grupos, comandos..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <BellIcon className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-white text-sm font-medium">{user?.name || 'Admin'}</p>
              <p className="text-gray-400 text-xs">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
