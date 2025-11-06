

import React, { useState, useEffect } from 'react';
import type { UserProfile, Page, UserStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface UserManagementPageProps {
  users: UserProfile[];
  onUpdateUser: (userId: string, status: UserStatus) => Promise<void>;
  onNavigate: (page: Page) => void;
}

// FIX: Added missing status types 'ativa_starter' and 'ativa_premium' to align with the UserStatus type.
const statusClasses: Record<UserStatus, string> = {
    ativa_pro: 'bg-indigo-100 text-indigo-800',
    ativa_free: 'bg-green-100 text-green-800',
    suspensa: 'bg-red-100 text-red-800',
    aguardando_ativacao: 'bg-yellow-100 text-yellow-800',
    ativa_starter: 'bg-blue-100 text-blue-800',
    ativa_premium: 'bg-purple-100 text-purple-800',
};

const formatStatus = (status: UserStatus) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ users, onUpdateUser, onNavigate }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const availableStatuses: UserStatus[] = ['ativa_free', 'ativa_starter', 'ativa_pro', 'ativa_premium', 'suspensa'];

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    setOpenDropdown(null);
    setUpdatingUserId(userId);
    try {
      await onUpdateUser(userId, status);
    } catch (error) {
      console.error("Failed to update user status:", error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestão de Usuários</h1>
          <p className="text-gray-600">Ative ou suspenda contas de usuários.</p>
        </div>
        <div className="flex space-x-2">
            <Button onClick={() => onNavigate('admin-activation')} variant="secondary">Ativações Pendentes</Button>
            <Button onClick={() => onNavigate('admin-settings')} variant="secondary">Configurações</Button>
            <Button onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto">
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créditos</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.filter(u => u.role !== 'admin').map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{user.email || user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[user.status]}`}>
                        {formatStatus(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.book_credits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                       {updatingUserId === user.id ? (
                        <div className="flex items-center text-gray-500 text-xs">
                           <svg className="animate-spin mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          Salvando...
                        </div>
                      ) : (
                        <div className="relative inline-block text-left">
                          <div>
                            <Button
                              variant="secondary"
                              className="py-1 px-3 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === user.id ? null : user.id);
                              }}
                            >
                              Ações
                            </Button>
                          </div>
                          {openDropdown === user.id && (
                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                {availableStatuses.map(status => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(user.id, status)}
                                    disabled={user.status === status}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    role="menuitem"
                                  >
                                    {formatStatus(status)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};
