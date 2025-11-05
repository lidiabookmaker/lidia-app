
import React, { useState, useEffect } from 'react';
import type { Page, PlanSetting } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
  planSettings: PlanSetting[];
  onUpdatePlanSettings: (updatedSettings: PlanSetting[]) => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, planSettings, onUpdatePlanSettings }) => {
  const [localSettings, setLocalSettings] = useState<PlanSetting[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    // Sort to ensure a consistent order in the UI
    const sortedSettings = [...planSettings].sort((a, b) => a.plan_name.localeCompare(b.plan_name));
    setLocalSettings(sortedSettings);
  }, [planSettings]);

  const handleCreditChange = (plan_id: string, value: string) => {
    const credits = parseInt(value, 10);
    if (isNaN(credits) || credits < 0) return;

    setLocalSettings(prev =>
      prev.map(setting =>
        setting.plan_id === plan_id ? { ...setting, book_credits: credits } : setting
      )
    );
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await onUpdatePlanSettings(localSettings);
      setSaveMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`Erro ao salvar: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <header className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Configurações do Sistema</h1>
          <p className="text-gray-600">Gerencie planos, chaves de API e outras configurações.</p>
        </div>
         <div className="flex space-x-2">
            <Button onClick={() => onNavigate('admin-users')} variant="secondary">Usuários</Button>
            <Button onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto space-y-6">

        <Card>
          <h2 className="text-xl font-bold text-gray-700 mb-4">Gestão de Planos e Créditos</h2>
          <p className="text-gray-600 mb-6 text-sm">Defina quantos livros cada tipo de usuário pode criar. Isso será aplicado quando uma nova conta for ativada nesse plano.</p>
          <div className="space-y-4">
            {localSettings.map(setting => (
              <div key={setting.plan_id} className="grid grid-cols-3 items-center gap-4">
                <label htmlFor={`credits-${setting.plan_id}`} className="font-medium text-gray-700 col-span-1">{setting.plan_name}</label>
                <div className="col-span-2">
                  <Input
                    id={`credits-${setting.plan_id}`}
                    type="number"
                    label=""
                    value={setting.book_credits}
                    onChange={(e) => handleCreditChange(setting.plan_id, e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-end space-x-4">
            {saveMessage && (
              <p className={`text-sm ${saveMessage.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{saveMessage}</p>
            )}
            <Button onClick={handleSaveChanges} isLoading={isSaving} loadingText="Salvando...">
              Salvar Alterações
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-gray-700 mb-4">Chave da API do Google Gemini</h2>
           <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-900 font-semibold">
              Configuração via Arquivo Local (MVP)
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              A chave da API do Gemini é gerenciada diretamente no código para a fase de testes.
            </p>
             <p className="text-sm text-yellow-800 mt-2">
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