import React from 'react';
import type { Page } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configurações do Sistema</h1>
          <p className="text-gray-600">Gerencie chaves de API e outras configurações.</p>
        </div>
         <div className="flex space-x-2">
            <Button onClick={() => onNavigate('admin-users')} variant="secondary">Usuários</Button>
            <Button onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto">
        <Card>
          <h2 className="text-xl font-bold text-gray-700 mb-4">Chave da API Gemini</h2>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-semibold">
              Configuração via Variável de Ambiente
            </p>
            <p className="text-sm text-blue-800 mt-2">
              A chave da API do Google Gemini é gerenciada de forma segura através de variáveis de ambiente no seu provedor de hospedagem (ex: Vercel, Netlify).
            </p>
             <p className="text-sm text-blue-800 mt-2">
              Certifique-se de que a variável de ambiente com o nome <code>VITE_API_KEY</code> está configurada com sua chave válida.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};