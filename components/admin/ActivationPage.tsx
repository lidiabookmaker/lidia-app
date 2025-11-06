

import React, { useState } from 'react';
import type { UserProfile, Page, UserStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ActivationPageProps {
  users: UserProfile[];
  onUpdateUser: (userId: string, status: UserStatus) => Promise<void>;
  onNavigate: (page: Page) => void;
}

export const ActivationPage: React.FC<ActivationPageProps> = ({ users, onUpdateUser, onNavigate }) => {
  const pendingUsers = users.filter(u => u.status === 'aguardando_ativacao');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleActivate = async (userId: string, status: UserStatus) => {
    setUpdatingUserId(userId);
    try {
        await onUpdateUser(userId, status);
    } catch (error) {
        console.error("Failed to activate user:", error);
    } finally {
        // The component will re-render without this user, so we don't strictly need to nullify,
        // but it's good practice in case of an error where the user remains.
        setUpdatingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Ativação de Contas</h1>
          <p className="text-gray-600">Ative novas contas de usuários com um plano específico.</p>
        </div>
        <div className="flex space-x-2">
            <Button onClick={() => onNavigate('admin-users')} variant="secondary">Gestão de Usuários</Button>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingUsers.length > 0 ? pendingUsers.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {updatingUserId === user.id ? (
                        <div className="flex items-center text-gray-500 text-xs">
                           <svg className="animate-spin mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          Ativando...
                        </div>
                      ) : (
                        <div className="space-x-2">
                            <Button onClick={() => handleActivate(user.id, 'ativa_free')} variant="secondary" className="py-1 px-3 text-xs bg-green-200 text-green-800 hover:bg-green-300">Ativar FREE</Button>
                            <Button onClick={() => handleActivate(user.id, 'ativa_starter')} variant="secondary" className="py-1 px-3 text-xs bg-blue-200 text-blue-800 hover:bg-blue-300">Ativar STARTER</Button>
                            <Button onClick={() => handleActivate(user.id, 'ativa_pro')} variant="secondary" className="py-1 px-3 text-xs bg-indigo-200 text-indigo-800 hover:bg-indigo-300">Ativar PRO</Button>
                            <Button onClick={() => handleActivate(user.id, 'ativa_premium')} variant="success" className="py-1 px-3 text-xs">Ativar PREMIUM</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                            Nenhum usuário aguardando ativação.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
};
