
import React, { useState } from 'react';
import type { Page } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
  apiKey: string | null;
  onApiKeySave: (key: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, apiKey, onApiKeySave }) => {
  const [currentApiKey, setCurrentApiKey] = useState(apiKey || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onApiKeySave(currentApiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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
          <h2 className="text-xl font-bold text-gray-700 mb-4">Chave da API Gemini (OpenAI)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Esta chave será usada para todas as chamadas à API de geração de conteúdo. Armazene-a com segurança.
          </p>
          <div className="space-y-4">
            <Input
              id="api-key"
              label="Gemini API Key"
              type="password"
              value={currentApiKey}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              placeholder="Cole sua chave de API aqui"
            />
            <div className="flex items-center space-x-4">
                <Button onClick={handleSave}>Salvar Chave</Button>
                {saved && <p className="text-green-600 font-semibold">Chave salva com sucesso!</p>}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};
   