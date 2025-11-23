import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { generateBookContent } from '../services/bookGenerator';
import { ProgressScreen } from './ProgressScreen'; 

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

const TONE_OPTIONS = [
  "Inspirador e prático",
  "Formal e acadêmico",
  "Divertido e casual",
  "Empático e acolhedor",
  "Direto e objetivo",
  "Narrativo e Storytelling"
];

const NICHE_EXAMPLES = [
  "Desenvolvimento Pessoal",
  "Marketing Digital",
  "Finanças Pessoais",
  "Culinária e Gastronomia",
  "Ficção Científica",
  "Direito e Legislação",
  "Educação Infantil"
];

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
    niche: '', 
    summary: '',
  });
  
  const [log, setLog] = useState<string[]>([]);
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [createdBookId, setCreatedBookId] = useState<string | null>(null);
  
  // Helpers para timestamp real no log
  const getTimestamp = () => new Date().toLocaleTimeString('pt-BR');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateLog = (message: string) => {
    // Adiciona o timestamp aqui para garantir que o log tenha a hora real do evento
    setLog(prev => [...prev, `[${getTimestamp()}] ${message}`]);
  };
  
  const handleGenerateBook = async () => {
    const { allow, message } = await onBeforeGenerate();
    if (!allow) {
        setErrorMessage(message);
        setGenerationState('error');
        return;
    }

    setLog([`[${getTimestamp()}] Iniciando conexão segura com SNT Core...`]);
    setErrorMessage('');
    setGenerationState('generating');

    try {
      const newBookId = await generateBookContent(formData, user, updateLog);
      
      setCreatedBookId(newBookId);
      // Log final de sucesso
      updateLog("Processo finalizado. PDF gerado com sucesso.");
      setGenerationState('success');

    } catch (error) {
        console.error("Erro ao gerar o livro:", error);
        const err = error as Error;
        updateLog(`ERRO FATAL: ${err.message}`);
        setErrorMessage(`Ocorreu um erro: ${err.message}.`);
        setGenerationState('error');
    }
  };

  const handleFinishFlow = async () => {
    if (createdBookId) {
        setGenerationState('idle'); 
        setLog([]);
        await onGenerationComplete(createdBookId);
    } else {
        setGenerationState('idle');
    }
  };

  const isFormValid = formData.title && formData.summary && formData.niche;

  // --- MODO TERMINAL (MATRIX) ---
  if (generationState === 'generating' || generationState === 'success') {
    return (
      <ProgressScreen 
        logs={log} 
        isDone={generationState === 'success'} 
        onComplete={handleFinishFlow}
      />
    );
  }

  // --- MODO FORMULÁRIO (CLEAN & ROBUSTO) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center text-gray-600 bg-white border-gray-300 hover:bg-gray-50">
            <ArrowLeftIcon />
            Voltar ao Dashboard
          </Button>
        </header>

        <main>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
                {/* Cabeçalho do Card */}
                <div className="bg-indigo-900 p-8 text-white text-center">
                    <h1 className="text-3xl font-bold mb-2">Editor de Novos Livros</h1>
                    <p className="text-indigo-200 opacity-90">Preencha os dados essenciais para iniciar a geração.</p>
                </div>

                <div className="p-8 md:p-12">
                    <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleGenerateBook(); }}>
                        
                        {/* Seção 1: Identidade */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Título do Livro *</label>
                                <input 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleInputChange} 
                                    className="w-full h-12 px-4 rounded-md border-2 border-gray-300 focus:border-indigo-600 focus:ring-0 transition-colors text-lg"
                                    placeholder="Ex: O Código da Riqueza" 
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Subtítulo</label>
                                <input 
                                    name="subtitle" 
                                    value={formData.subtitle} 
                                    onChange={handleInputChange} 
                                    className="w-full h-12 px-4 rounded-md border-2 border-gray-300 focus