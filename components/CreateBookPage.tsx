import React, { useState, useRef, useEffect } from 'react';
import type { UserProfile, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { Card } from './ui/Card';
import { generateBookContent } from '../services/bookGenerator';
// IMPORTANTE: Certifique-se que o caminho está correto
import { ProgressScreen } from './ProgressScreen'; 

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

// --- CONSTANTES PARA UX (DROPDOWNS) ---
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
    niche: '', // Começa vazio para forçar escolha ou input
    summary: '',
  });
  
  const [log, setLog] = useState<string[]>([]);
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Referência para scroll automático no console legado (caso precise debuggar)
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateLog = (message: string) => {
    // Adiciona timestamp para log interno, mas o ProgressScreen pode receber só a mensagem se preferir
    setLog(prev => [...prev, message]);
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
      
      updateLog("Finalizando últimos detalhes...");
      
      // Pequeno delay para o usuário ver a mensagem de sucesso no Cinema Mode antes de sair
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await onGenerationComplete(newBookId);
      setGenerationState('success');

    } catch (error) {
        console.error("Erro ao gerar o livro:", error);
        const err = error as Error;
        updateLog(`ERRO: ${err.message}`); // Isso aparecerá no Cinema Mode também
        setErrorMessage(`Ocorreu um erro: ${err.message}. Tente novamente.`);
        setGenerationState('error');
    }
  };

  const isFormValid = formData.title && formData.summary && formData.niche;

  // --- RENDERIZAÇÃO DO CINEMA MODE (OVERLAY) ---
  if (generationState === 'generating') {
    return (
      <ProgressScreen 
        logs={log} 
        currentStep={log.length > 0 ? log[log.length - 1] : "Iniciando motores..."} 
      />
    );
  }

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
                <p className="text-gray-600 mb-6">A IA Lidia escreverá ~22.000 palavras para você em minutos.</p>
                
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleGenerateBook(); }}>
                  
                  {/* Título e Subtítulo */}
                  <div className="space-y-4">
                    <Input 
                        name="title" 
                        label="Título do Livro *" 
                        value={formData.title} 
                        onChange={handleInputChange} 
                        placeholder="Ex: O Guia Definitivo do Marketing" 
                        required 
                    />
                    <Input 
                        name="subtitle" 
                        label="Subtítulo (Opcional)" 
                        value={formData.subtitle} 
                        onChange={handleInputChange} 
                        placeholder="Ex: Do zero ao milhão em 12 meses" 
                    />
                  </div>

                  {/* Resumo e Nicho */}
                  <TextArea 
                    name="summary" 
                    label="Sobre o que é o livro? (Prompt Principal) *" 
                    value={formData.summary} 
                    onChange={handleInputChange} 
                    placeholder="Descreva o conteúdo, público-alvo e o que o leitor vai aprender. Quanto mais detalhes, melhor o resultado." 
                    required 
                    rows={6} 
                    className="text-base"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Input com Datalist para Nicho (Híbrido: escolhe ou digita) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nicho/Assunto *</label>
                        <input 
                            list="niche-suggestions"
                            name="niche"
                            value={formData.niche}
                            onChange={handleInputChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Culinária Vegana"
                            required
                        />
                        <datalist id="niche-suggestions">
                            {NICHE_EXAMPLES.map(n => <option key={n} value={n} />)}
                        </datalist>
                    </div>
                    
                    <Input 
                        name="author" 
                        label="Nome do Autor" 
                        value={formData.author} 
                        onChange={handleInputChange} 
                        required 
                    />
                  </div>

                  {/* Dropdown de Tom de Voz */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tom de Voz</label>
                        <select 
                            name="tone" 
                            value={formData.tone} 
                            onChange={handleInputChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                        <select 
                            name="language" 
                            value={formData.language} 
                            onChange={handleInputChange}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="Português (Brasil)">Português (Brasil)</option>
                            <option value="Inglês (EUA)">Inglês (EUA)</option>
                            <option value="Espanhol">Espanhol</option>
                        </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                        type="submit" 
                        className="w-full text-lg py-4 shadow-lg hover:shadow-xl transition-all" 
                        disabled={!isFormValid}
                    >
                        ✨ Gerar Livro Completo
                    </Button>
                    <p className="text-xs text-center text-gray-500 mt-2">
                       O processo leva cerca de 5 a 10 minutos. Não feche a aba.
                    </p>
                  </div>
                </form>
              </div>

              {/* Coluna Direita (Preview / Dicas) - Console removido pois agora temos o Cinema Mode */}
              <div className="hidden lg:flex flex-col justify-center items-center bg-indigo-50 rounded-xl p-8 border-2 border-dashed border-indigo-200">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🤖</span>
                    </div>
                    <h3 className="text-xl font-bold text-indigo-900">Dicas da Lidia</h3>
                    <ul className="text-left text-indigo-800 space-y-3 text-sm">
                        <li className="flex items-start">
                            <span className="mr-2">✔️</span> 
                            <strong>Resumo Detalhado:</strong> Em vez de "Dieta", tente "Um guia de 30 dias para dieta cetogênica focado em mulheres acima de 40 anos".
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✔️</span> 
                            <strong>Nicho Claro:</strong> Ajuda a IA a escolher o vocabulário correto.
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✔️</span> 
                            <strong>Paciência:</strong> Livros de qualidade levam alguns minutos para serem escritos e formatados.
                        </li>
                    </ul>
                </div>

                {/* Exibição de erro caso ocorra (fora do Cinema Mode) */}
                {generationState === 'error' && (
                  <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg w-full">
                    <h3 className="text-red-800 font-bold flex items-center gap-2">
                        ⚠️ Erro na Geração
                    </h3>
                    <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
                    <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => setGenerationState('idle')}>
                        Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
};