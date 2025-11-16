// components/ViewBookPage.tsx

import React, { useState, useRef, useEffect } from 'react';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { supabase } from '../services/supabase';

// Nossos novos componentes de UI
import { SuccessPage } from './SuccessPage';
import { ProgressScreen } from './ProgressScreen';

// Funções essenciais
import { assembleFullHtml } from '../services/bookFormatter';
import { generateFullPdf } from '../services/pdf-generator'; 

// Pacote para gerar DOCX
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, HeadingLevel } from 'docx';

/* ======================================================================= */
/* ========================== ÍCONES SVG ================================= */
/* ======================================================================= */

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

const GenerateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15-2-2 2-2"/><path d="m14 15 2-2-2-2"/></svg>
);

const DocxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

/* ======================================================================= */
/* =========================== COMPONENTE ================================ */
/* ======================================================================= */

interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate }) => {
  // --- Estados do Componente (Todos juntos e organizados) ---
  const [bookParts, setBookParts]         = useState<BookPart[]>([]);
  const [fullHtml, setFullHtml]           = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [log, setLog]                     = useState<string[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [successData, setSuccessData]     = useState<{ url: string; title: string } | null>(null);

  // --- Referências para o DOM ---
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- Constantes ---
  const progressSteps = [
    "Analisando a estrutura do seu livro...", "Montando a folha de rosto...", "Escrevendo a introdução...",
    "Formatando os capítulos iniciais...", "Revisando o fluxo de conteúdo...", "Diagramando os capítulos centrais...",
    "Ajustando a tipografia e o espaçamento...", "Criando o sumário...", "Compilando a conclusão...",
    "Aplicando a hifenização e justificação...", "Gerando a versão final do arquivo PDF...", "Quase pronto, aplicando os últimos retoques..."
  ];

  // --- Efeitos (Hooks) ---
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    const fetchAndAssemble = async () => {
      setIsLoadingParts(true);
      setError(null);
      try {
        const { data: parts, error: fetchError } = await supabase.from('book_parts').select('*').eq('book_id', book.id).order('part_index', { ascending: true });
        if (fetchError) throw fetchError;
        if (!parts || parts.length === 0) throw new Error("Nenhuma parte do livro foi encontrada.");
        
        setBookParts(parts as BookPart[]);
        const assembledHtml = assembleFullHtml(book, parts as BookPart[]);
        setFullHtml(assembledHtml);
      } catch (err) {
        console.error("Error fetching or assembling book parts:", err);
        setError(`Não foi possível carregar o conteúdo do livro: ${(err as Error).message}`);
      } finally {
        setIsLoadingParts(false);
      }
    };
    fetchAndAssemble();
  }, [book.id, book]);

  // --- Funções Auxiliares ---
  const updateLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // --- Funções dos Botões ---
  async function handleGeneratePdf() {
    if (!book?.id) {
      setError("ID do livro não encontrado. Não é possível gerar o PDF.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setLog([]);
    
    let step = 0;
    setProgressMessage(progressSteps[step]);
    const progressInterval = setInterval(() => {
      step = (step + 1) % progressSteps.length; 
      setProgressMessage(progressSteps[step]);
    }, 2500);

    try {
      updateLog("Iniciando pipeline de geração de PDF final com WeasyPrint...");
      const url = await generateFullPdf(book.id);
      if (!url) throw new Error("O backend não retornou uma URL para o PDF.");
      
      updateLog("✅ PDF gerado com sucesso! Preparando a tela de download...");
      setSuccessData({ url: url, title: book.title });

    } catch (err) {
      console.error(err);
      const errorMessage = `Erro ao gerar PDF final: ${(err as Error).message}`;
      setError(errorMessage);
      updateLog(`❌ ${errorMessage}`);
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  }

  const handleGenerateDocx = async () => {
    // ... (função do docx permanece a mesma, sem alterações)
  };
  
  const handleTestBackendPdf = async () => {
    // ... (função de teste permanece a mesma, sem alterações)
  };

  // --- Renderização do Componente (JSX) ---
  return (
    successData ? (
      <SuccessPage publicUrl={successData.url} bookTitle={successData.title} />
    ) : (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center w-full sm:w-auto">
              <ArrowLeftIcon />
              Voltar
            </Button>
            <div className="text-sm text-gray-600">
              A edição de conteúdo foi desativada para garantir a estabilidade.
            </div>
          </header>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Erro!</strong>
              <span className="block sm:inline ml-2">{error}</span>
            </div>
          )}

          <main className="grid grid-cols-1 gap-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
              <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
              <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>

            <Card className="text-center">
              <h3 className="text-xl font-bold text-gray-800">Gerar Arquivos Finais</h3>
              <p className="text-gray-600 mt-2">Clique no botão abaixo para gerar o arquivo final do seu livro.</p>
              
              {isGenerating ? (
                <ProgressScreen message={progressMessage} />
              ) : (
                <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                  <Button
                    onClick={handleGeneratePdf}
                    className="text-lg w-full sm:w-auto"
                    disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                  >
                    <GenerateIcon />
                    Gerar PDF Final
                  </Button>
                  <Button
                    onClick={handleGenerateDocx}
                    className="text-lg w-full sm:w-auto"
                    variant="secondary"
                    isLoading={isGeneratingDocx}
                    loadingText="Gerando DOCX..."
                    disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                  >
                    <DocxIcon />
                    Baixar .DOCX
                  </Button>
                  <Button
                    onClick={handleTestBackendPdf}
                    variant="secondary" // Removido tamanho da classe para consistência
                    isLoading={isTestingBackend}
                    loadingText="Testando..."
                    disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                  >
                    Testar PDF Backend
                  </Button>
                </div>
              )}
            </Card>

            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Log de Geração</h2>
              <div ref={logContainerRef} className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto mb-4 flex-grow">
                {log.length === 0 ? (
                  <p className="text-gray-400">Aguardando início da geração...</p>
                ) : (
                  log.map((line, index) => <p key={index} className="whitespace-pre-wrap">{line}</p>)
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Pré-visualização do Conteúdo</h2>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {isLoadingParts ? (
                  <div className="h-[80vh] flex justify-center items-center"><LoadingSpinner/></div>
                ) : error ? (
                  <div className="h-[80vh] flex justify-center items-center text-red-600 p-4">{error}</div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    srcDoc={fullHtml || ''}
                    title={book.title}
                    className="w-full border-0 h-[80vh]"
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  );
};

