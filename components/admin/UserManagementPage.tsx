

import React from 'react';
import type { UserProfile, Page, UserStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface UserManagementPageProps {
  users: UserProfile[];
  onUpdateUserStatus: (userId: string, status: 'suspensa') => void;
  onNavigate: (page: Page) => void;
}

const statusClasses: Record<UserStatus, string> = {
    ativa_pro: 'bg-indigo-100 text-indigo-800',
    ativa_free: 'bg-green-100 text-green-800',
    suspensa: 'bg-red-100 text-red-800',
    aguardando_ativacao: 'bg-yellow-100 text-yellow-800',
};

const formatStatus = (status: UserStatus) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ users, onUpdateUserStatus, onNavigate }) => {
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {(user.status === 'ativa_pro' || user.status === 'ativa_free') ? (
                        <Button onClick={() => onUpdateUserStatus(user.id, 'suspensa')} variant="danger" className="py-1 px-3 text-xs">Suspender</Button>
                      ) : null}
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
