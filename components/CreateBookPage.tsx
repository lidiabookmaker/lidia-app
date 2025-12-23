import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { Card } from './ui/Card';
import { generateBookContent } from '../services/bookGenerator';
import { generateBookStructure } from '../services/bookArchitect';

// Ícones
const ArrowLeftIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>);
const MagicWandIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>);
const BulbIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2 1.5-3.5a6 6 0 0 0-11 0c0 1.5.5 2.5 1.5 3.5.9.8 1.4 1.5 1.6 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const PenToolIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>);

interface CreateBookPageProps {
  user: UserProfile;
  onGenerationComplete: (newBookId: string) => Promise<void>;
  onNavigate: (page: Page) => void;
  onBeforeGenerate: () => Promise<{ allow: boolean; message: string }>;
}

type WizardStep = 'choice' | 'idea-input' | 'refining' | 'final-form';

export const CreateBookPage: React.FC<CreateBookPageProps> = ({ user, onGenerationComplete, onNavigate, onBeforeGenerate }) => {
  
  const [step, setStep] = useState<WizardStep>('choice');
  const [ideaInput, setIdeaInput] = useState('');
  
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

  const handleArchitectFlow = async (mode: 'idea' | 'surprise') => {
    if (mode === 'idea' && !ideaInput.trim()) {
      alert("Por favor, digite uma ideia.");
      return;
    }
    setStep('refining'); 
    try {
      const structure = await generateBookStructure(mode, ideaInput);
      setFormData(prev => ({
        ...prev,
        title: structure.title,
        subtitle: structure.subtitle,
        niche: structure.niche,
        summary: structure.structure // O texto formatado já vem do serviço
      }));
      setStep('final-form'); 
    } catch (error) {
      console.error(error);
      alert("Erro ao criar estrutura. Tente novamente.");
      setStep('choice');
    }
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
      updateLog("Livro criado com sucesso! Redirecionando...");
      setGenerationState('success');
    } catch (error) {
        console.error("Erro ao gerar o livro:", error);
        const err = error as Error;
        updateLog(`Falha na geração: ${err.message}`);
        setErrorMessage(`Ocorreu um erro: ${err.message}.`);
        setGenerationState('error');
    }
  };

  const isFormValid = formData.title && formData.summary && formData.niche;

  if (step === 'choice') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          <header className="mb-10 flex items-center">
            <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="mr-4"><ArrowLeftIcon /></Button>
            <h1 className="text-3xl font-bold text-gray-800">Novo Livro: Como deseja começar?</h1>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <button onClick={() => setStep('final-form')} className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-indigo-500 text-left h-full flex flex-col">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform"><PenToolIcon /></div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Já tenho a estrutura</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Você já tem o título e o resumo. Vá direto para a geração.</p>
            </button>
            <button onClick={() => setStep('idea-input')} className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-amber-500 text-left h-full flex flex-col">
              <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-amber-600 group-hover:scale-110 transition-transform"><BulbIcon /></div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Tenho uma ideia</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Você tem um tema, mas quer ajuda da IA para criar a estrutura dos capítulos.</p>
            </button>
            <button onClick={() => handleArchitectFlow('surprise')} className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-purple-500 text-left h-full flex flex-col">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform"><MagicWandIcon /></div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Estou sem ideias</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Deixe a IA escolher um nicho lucrativo e montar tudo para você.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'idea-input') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <Card className="max-w-xl w-full p-8">
          <div className="text-center mb-6">
            <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600"><BulbIcon /></div>
            <h2 className="text-2xl font-bold text-gray-800">Qual é o tema?</h2>
            <p className="text-gray-600 mt-2">Uma palavra ou frase curta.</p>
          </div>
          <Input id="idea" label="" value={ideaInput} onChange={(e) => setIdeaInput(e.target.value)} placeholder="Ex: Culinária Vegana..." autoFocus />
          <div className="mt-8 flex justify-between items-center">
            <Button variant="secondary" onClick={() => setStep('choice')}>Voltar</Button>
            <Button onClick={() => handleArchitectFlow('idea')} disabled={!ideaInput.trim()}>Criar Estrutura</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'refining') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl flex flex-col items-center max-w-md text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-75"></div>
            <div className="relative bg-white p-4 rounded-full shadow-sm">
                <svg className="animate-spin h-10 w-10 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Criando estrutura...</h3>
          <p className="text-gray-500 mt-2 text-sm">A IA está organizando os capítulos e subcapítulos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <Button onClick={() => setStep('choice')} variant="secondary" className="inline-flex items-center"><ArrowLeftIcon /> Reiniciar</Button>
        </header>
        <main>
          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Lado Esquerdo: Formulário */}
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Configuração Final</h1>
                <p className="text-gray-600 mb-6">Revise o plano do livro abaixo. Você pode editar os títulos ou adicionar detalhes antes de gerar.</p>
                
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleGenerateBook(); }}>
                  <Input id="title" name="title" label="Título *" value={formData.title} onChange={handleInputChange} required />
                  <Input id="subtitle" name="subtitle" label="Subtítulo" value={formData.subtitle} onChange={handleInputChange} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input id="author" name="author" label="Autor *" value={formData.author} onChange={handleInputChange} required />
                    <Input id="language" name="language" label="Idioma" value={formData.language} onChange={handleInputChange} />
                  </div>

                  <Input id="niche" name="niche" label="Nicho *" value={formData.niche} onChange={handleInputChange} required />
                  <Input id="tone" name="tone" label="Tom de Voz" value={formData.tone} onChange={handleInputChange} />

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4 mb-2">
                    <p className="text-sm text-blue-700"><strong>Estrutura Completa:</strong> Abaixo está o roteiro que a IA seguirá. Sinta-se à vontade para ajustar.</p>
                  </div>
                  
                  {/* TEXTAREA COM LARGURA TOTAL E MAIS LINHAS */}
                  <TextArea 
                    id="summary" 
                    name="summary" 
                    label="Sinopse e Estrutura de Capítulos *" 
                    value={formData.summary} 
                    onChange={handleInputChange} 
                    required 
                    rows={16} 
                    className="w-full font-mono text-sm block" // Forçando w-full e block
                  />
                  
                  <Button type="submit" className="w-full text-lg mt-6 h-14" isLoading={generationState === 'generating'} loadingText="Escrevendo o livro..." disabled={!isFormValid || generationState === 'generating'}>
                    Gerar Livro Completo
                  </Button>
                </form>
              </div>

              {/* Lado Direito: Status */}
              <div className="flex flex-col h-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Status da Criação</h2>
                <div ref={logContainerRef} className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-full min-h-[400px] overflow-y-auto mb-4 flex-grow shadow-inner">
                  {log.length === 0 && <p className="text-gray-400">Aguardando início...</p>}
                  {log.map((line, index) => <p key={index} className="whitespace-pre-wrap mb-1">{line}</p>)}
                </div>
                {generationState === 'error' && <Card className="border-2 border-red-300 bg-red-50 mt-4"><h3 className="text-lg font-bold text-red-800">Erro</h3><p className="text-red-700 mt-2">{errorMessage}</p></Card>}
                {generationState === 'success' && <Card className="border-2 border-green-300 bg-green-50 mt-4"><h3 className="text-lg font-bold text-green-800">Sucesso!</h3><p className="text-green-700 mt-2 mb-4">Livro criado. Redirecionando...</p></Card>}
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};