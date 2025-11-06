

import React from 'react';
import type { UserProfile, Page, UserStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ActivationPageProps {
  users: UserProfile[];
  onUpdateUser: (userId: string, status: UserStatus) => void;
  onNavigate: (page: Page) => void;
}

export const ActivationPage: React.FC<ActivationPageProps> = ({ users, onUpdateUser, onNavigate }) => {
  const pendingUsers = users.filter(u => u.status === 'aguardando_ativacao');

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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button onClick={() => onUpdateUser(user.id, 'ativa_free')} variant="secondary" className="py-1 px-3 text-xs bg-green-200 text-green-800 hover:bg-green-300">Ativar FREE</Button>
                        <Button onClick={() => onUpdateUser(user.id, 'ativa_starter')} variant="secondary" className="py-1 px-3 text-xs bg-blue-200 text-blue-800 hover:bg-blue-300">Ativar STARTER</Button>
                        <Button onClick={() => onUpdateUser(user.id, 'ativa_pro')} variant="secondary" className="py-1 px-3 text-xs bg-indigo-200 text-indigo-800 hover:bg-indigo-300">Ativar PRO</Button>
                        <Button onClick={() => onUpdateUser(user.id, 'ativa_premium')} variant="success" className="py-1 px-3 text-xs">Ativar PREMIUM</Button>
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
