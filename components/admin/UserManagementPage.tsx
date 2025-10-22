
import React from 'react';
import type { UserProfile, Page } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface UserManagementPageProps {
  users: UserProfile[];
  onUpdateUserStatus: (userId: string, status: 'ativa' | 'suspensa') => void;
  onNavigate: (page: Page) => void;
}

const statusClasses = {
    ativa: 'bg-green-100 text-green-800',
    pendente: 'bg-yellow-100 text-yellow-800',
    suspensa: 'bg-red-100 text-red-800',
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[user.status]}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.book_credits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.status === 'ativa' ? (
                        <Button onClick={() => onUpdateUserStatus(user.id, 'suspensa')} variant="danger" className="py-1 px-3 text-xs">Suspender</Button>
                      ) : (
                        <Button onClick={() => onUpdateUserStatus(user.id, 'ativa')} className="py-1 px-3 text-xs bg-green-600 hover:bg-green-700">Ativar</Button>
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
   