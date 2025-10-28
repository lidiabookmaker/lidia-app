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
      <main className="max-w-4xl mx-auto space-y-6">
        <Card>
          <h2 className="text-xl font-bold text-gray-700 mb-4">Chave da API do Google Gemini</h2>
           <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm text-green-900 font-semibold">
              Configuração via Arquivo Local (MVP)
            </p>
            <p className="text-sm text-green-800 mt-2">
              A chave da API do Gemini é gerenciada diretamente no código para facilitar a validação.
            </p>
             <p className="text-sm text-green-800 mt-2">
              Para atualizar a chave, edite o arquivo: <code>services/geminiConfig.ts</code>
            </p>
          </div>
        </Card>
         <Card>
          <h2 className="text-xl font-bold text-gray-700 mb-4">Credenciais do Supabase</h2>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm text-green-900 font-semibold">
              Configuração via Arquivo Local (MVP)
            </p>
            <p className="text-sm text-green-800 mt-2">
              As credenciais do Supabase (URL e Chave Anon) são gerenciadas diretamente no código.
            </p>
             <p className="text-sm text-green-800 mt-2">
              Para atualizar as credenciais, edite o arquivo: <code>services/supabaseConfig.ts</code>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
};