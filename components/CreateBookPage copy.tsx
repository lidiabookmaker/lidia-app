import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { Card } from './ui/Card';
import { generateBookContent } from '../services/bookGenerator';

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

interface CreateBookPageProps {
  user: UserProfile;
  onGenerationComplete: (newBookId: string) => Promise<void>;
  onNavigate: (page: Page) => void;
  onBeforeGenerate: () => Promise<{ allow: boolean; message: string }>;
}

export const CreateBookPage: React.FC<CreateBookPageProps> = ({ user, onGenerationComplete, onNavigate, onBeforeGenerate }) => {
  const [formData, setFormData] = useState<BookGenerationFormData>({
    title: '',
    subtitle: '',
    author: user.email?.split('@')[0] || 'Autor',
    language: 'Português (Brasil)',
    tone: 'Inspirador e prático',
    niche: 'Desenvolvimento Pessoal',
    summary: '',
  });
  const [log, setLog] = useState<string[]>([]);
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };
  
  const handleGenerateBook = async () => {
    const { allow, message } = await onBeforeGenerate();
    if (!allow) {
        setErrorMessage(message);
        setGenerationState('error');
        return;
    }

    setLog([]);
    setErrorMessage('');
    setGenerationState('generating');

    try {
      const newBookId = await generateBookContent(formData, user, updateLog);
      
      await onGenerationComplete(newBookId);

      updateLog("Livro criado com sucesso! Redirecionando para a página de visualização.");
      setGenerationState('success');

    } catch (error) {
        console.error("Erro ao gerar o livro:", error);
        const err = error as Error;
        updateLog(`Falha na geração: ${err.message}`);
        setErrorMessage(`Ocorreu um erro: ${err.message}. Verifique o console para mais detalhes.`);
        setGenerationState('error');
    }
  };

  const isFormValid = formData.title && formData.summary && formData.niche;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center">
            <ArrowLeftIcon />
            Voltar ao Dashboard
          </Button>
        </header>
        <main>
          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna do Formulário */}
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Novo Livro</h1>
                <p className="text-gray-600 mb-6">Preencha os detalhes abaixo para a IA gerar seu e-book.</p>
                
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleGenerateBook(); }}>
                  <Input name="title" label="Sugestão de Título *" value={formData.title} onChange={handleInputChange} placeholder="Ex: O Guia Definitivo do Marketing Digital" required />
                  <Input name="subtitle" label="Subtítulo" value={formData.subtitle} onChange={handleInputChange} placeholder="Ex: Estratégias para alavancar seu negócio online" />
                  <Input name="author" label="Autor(es)" value={formData.author} onChange={handleInputChange} required />
                  <TextArea name="summary" label="Resumo do Conteúdo *" value={formData.summary} onChange={handleInputChange} placeholder="Descreva sobre o que é o livro, os principais tópicos que devem ser abordados, e o público-alvo." required rows={6} />
                  <Input name="niche" label="Nicho/Assunto Principal *" value={formData.niche} onChange={handleInputChange} placeholder="Ex: Marketing para pequenas empresas, Culinária vegana, etc." required />
                  <Input name="tone" label="Tom de Voz" value={formData.tone} onChange={handleInputChange} placeholder="Ex: Inspirador e prático, formal e acadêmico, divertido e casual" />
                  <Input name="language" label="Idioma" value={formData.language} onChange={handleInputChange} />
                  <Button 
                    type="submit" 
                    className="w-full text-lg" 
                    isLoading={generationState === 'generating'}
                    loadingText="Gerando seu livro..."
                    disabled={!isFormValid || generationState === 'generating'}
                  >
                    Gerar Livro com IA
                  </Button>
                </form>
              </div>

              {/* Coluna de Status e Resultado */}
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Status da Geração</h2>
                <div ref={logContainerRef} className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto mb-4 flex-grow">
                  {log.length === 0 && <p className="text-gray-400">Aguardando início da geração...</p>}
                  {log.map((line, index) => <p key={index} className="whitespace-pre-wrap">{line}</p>)}
                </div>

                {generationState === 'error' && (
                  <Card className="border-2 border-red-300 bg-red-50">
                    <h3 className="text-lg font-bold text-red-800">Erro na Geração</h3>
                    <p className="text-red-700 mt-2">{errorMessage}</p>
                  </Card>
                )}

                {generationState === 'success' && (
                  <Card className="border-2 border-green-300 bg-green-50">
                    <h3 className="text-lg font-bold text-green-800">Conteúdo Gerado!</h3>
                    <p className="text-green-700 mt-2 mb-4">Seu livro foi criado e está pronto para a geração do PDF. Você será redirecionado em instantes.</p>
                  </Card>
                )}
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};