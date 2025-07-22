import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

// Importar páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import Settings from './pages/Settings';

// Importar componentes
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Configurar Axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://painel.botwpp.tech/api';
axios.defaults.baseURL = API_BASE_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Verificar se o usuário está logado
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }

    // Conectar ao WebSocket se logado
    if (token) {
      const newSocket = io(API_BASE_URL);
      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/user');
      setUser(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post('/login', credentials);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success('Login realizado com sucesso!');
      return true;
    } catch (error) {
      toast.error('Erro no login. Verifique suas credenciais.');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    if (socket) socket.close();
    toast.success('Logout realizado com sucesso!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-500 mt-4 text-center">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={login} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-black text-white flex">
        <Sidebar user={user} onLogout={logout} />
        
        <div className="flex-1 flex flex-col">
          <Header user={user} />
          
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard socket={socket} />} />
              <Route path="/groups" element={<Groups socket={socket} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
      
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;
