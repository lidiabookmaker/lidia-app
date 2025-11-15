


import React, { useState, useEffect, useRef } from 'react';
import type { Page, PlanSetting } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { supabase } from '../../services/supabase';

interface Branding {
    logoUrl: string | null;
    faviconUrl: string | null;
}

interface SettingsPageProps {
  onNavigate: (page: Page) => void;
  planSettings: PlanSetting[];
  onUpdatePlanSettings: (updatedSettings: PlanSetting[]) => Promise<void>;
  branding: Branding;
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, planSettings, onUpdatePlanSettings, branding, setBranding }) => {
  const [localSettings, setLocalSettings] = useState<PlanSetting[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'logo') setLogoFile(e.target.files[0]);
      else setFaviconFile(e.target.files[0]);
    }
  };

  const handleUpload = async (type: 'logo' | 'favicon') => {
    const file = type === 'logo' ? logoFile : faviconFile;
    if (!file) return;

    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingFavicon(true);
    setUploadMessage('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}.${fileExt}`;
      const filePath = `public/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(filePath);

      const columnToUpdate = type === 'logo' ? 'logo_url' : 'favicon_url';
      
      const { error: dbError } = await supabase
        .from('branding')
        .update({ [columnToUpdate]: publicUrl })
        .eq('id', 1);
      
      if (dbError) throw dbError;

      setBranding(prev => ({ ...prev, [type === 'logo' ? 'logoUrl' : 'faviconUrl']: publicUrl }));
      setUploadMessage(`${type === 'logo' ? 'Logo' : 'Favicon'} atualizado com sucesso!`);
      if (type === 'logo') setLogoFile(null);
      else setFaviconFile(null);

    } catch (error) {
        setUploadMessage(`Erro no upload: ${(error as Error).message}`);
    } finally {
        if (type === 'logo') setIsUploadingLogo(false);
        else setIsUploadingFavicon(false);
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
          <h2 className="text-xl font-bold text-gray-700 mb-4">Logo da Aplicação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-sm text-gray-600 mb-2">Pré-visualização atual:</p>
              <div className="bg-gray-200 p-4 rounded-lg flex justify-center items-center h-24">
                {branding.logoUrl ? <img src={branding.logoUrl} alt="Logo Preview" className="max-h-16" /> : <p className="text-gray-500">Nenhum logo definido</p>}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Fazer upload de novo logo:</p>
              <p className="text-xs text-gray-500 mb-2">Recomendado: 256x64 pixels, PNG com fundo transparente.</p>
              <input type="file" accept="image/png, image/jpeg" ref={logoInputRef} onChange={(e) => handleFileSelect(e, 'logo')} className="hidden" />
              <Button variant="secondary" onClick={() => logoInputRef.current?.click()}>Escolher arquivo</Button>
              {logoFile && <span className="ml-3 text-sm text-gray-600">{logoFile.name}</span>}
              {logoFile && (
                <Button onClick={() => handleUpload('logo')} isLoading={isUploadingLogo} loadingText="Enviando..." className="mt-2 w-full">
                  Salvar Logo
                </Button>
              )}
            </div>
          </div>
        </Card>
        
        <Card>
          <h2 className="text-xl font-bold text-gray-700 mb-4">Ícone do Navegador (Favicon)</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-sm text-gray-600 mb-2">Pré-visualização atual:</p>
              <div className="bg-gray-200 p-4 rounded-lg flex justify-center items-center h-24">
                {branding.faviconUrl ? <img src={branding.faviconUrl} alt="Favicon Preview" className="h-16 w-16" /> : <p className="text-gray-500">Nenhum ícone definido</p>}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Fazer upload de novo ícone:</p>
              <p className="text-xs text-gray-500 mb-2">Recomendado: 64x64 pixels, formato PNG.</p>
              <input type="file" accept="image/png, image/x-icon" ref={faviconInputRef} onChange={(e) => handleFileSelect(e, 'favicon')} className="hidden" />
              <Button variant="secondary" onClick={() => faviconInputRef.current?.click()}>Escolher arquivo</Button>
              {faviconFile && <span className="ml-3 text-sm text-gray-600">{faviconFile.name}</span>}
              {faviconFile && (
                <Button onClick={() => handleUpload('favicon')} isLoading={isUploadingFavicon} loadingText="Enviando..." className="mt-2 w-full">
                  Salvar Ícone
                </Button>
              )}
            </div>
          </div>
        </Card>
        
        {uploadMessage && (
            <p className={`text-center text-sm ${uploadMessage.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{uploadMessage}</p>
        )}

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

      </main>
    </div>
  );
};