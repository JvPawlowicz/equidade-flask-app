// Dashboard simplificada
import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';

export default function SimpleDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [_, setLocation] = useLocation();

  // Verificar status de autenticação
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Redirecionar para login se não estiver autenticado
          setLocation('/simple-login');
        }
      } catch (err) {
        setError('Erro ao verificar autenticação');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [setLocation]);

  // Função para fazer logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setLocation('/simple-login');
    } catch (err) {
      setError('Erro ao fazer logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-medium">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-lg">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => setLocation('/simple-login')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-lg">
          <div className="mb-4">Você não está autenticado</div>
          <button 
            onClick={() => setLocation('/simple-login')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Ir para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Clínica Equidade</h1>
            </div>
            <div className="flex items-center">
              <div className="mr-4">
                <span className="text-gray-600">Olá, </span>
                <span className="font-medium">{user.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Informações do usuário
            </h2>
            <div className="bg-gray-50 p-4 rounded">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">ID</p>
                  <p className="mt-1">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nome de usuário</p>
                  <p className="mt-1">{user.username}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nome completo</p>
                  <p className="mt-1">{user.fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">E-mail</p>
                  <p className="mt-1">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Função</p>
                  <p className="mt-1">{user.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Último login</p>
                  <p className="mt-1">{new Date(user.lastLogin).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Pacientes</h3>
              <p className="mt-1 text-sm text-gray-500">
                Gerenciar registro de pacientes e histórico médico
              </p>
              <div className="mt-4">
                <a
                  href="#"
                  className="text-blue-500 hover:underline"
                >
                  Ver pacientes →
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Profissionais</h3>
              <p className="mt-1 text-sm text-gray-500">
                Gerenciar equipe de profissionais de saúde
              </p>
              <div className="mt-4">
                <a
                  href="#"
                  className="text-blue-500 hover:underline"
                >
                  Ver profissionais →
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Agendamentos</h3>
              <p className="mt-1 text-sm text-gray-500">
                Gerenciar agendamentos e consultas
              </p>
              <div className="mt-4">
                <a
                  href="#"
                  className="text-blue-500 hover:underline"
                >
                  Ver agenda →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}