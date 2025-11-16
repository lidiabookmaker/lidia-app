// components/ViewBookPage.tsx

import React, { useState, useRef, useEffect } from 'react';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { supabase } from '../services/supabase';

import { SuccessPage } from './SuccessPage';

// Funções essenciais que montam o HTML e chamam o backend de PDF
import { assembleFullHtml } from '../services/bookFormatter';
import { generateFullPdf } from '../services/pdf-generator'; 

// Pacote para gerar DOCX (carregado dinamicamente)
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } from 'docx';

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
  // --- Estados do Componente ---
  const [bookParts, setBookParts] = useState<BookPart[]>([]);
  const [fullHtml, setFullHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  
  // Estados de carregamento dos botões
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isTestingBackend, setIsTestingBackend] = useState(false);

  // ... após os useStates

// Se a geração foi bem-sucedida, renderiza a página de sucesso e para por aqui.
/*
if (successData) {
  return (
    <SuccessPage 
      publicUrl={successData.url} 
      bookTitle={successData.title} 
    />
  );
}
*/
// ... continua com a lógica normal do componente

  // src/components/ViewBookPage.tsx

// ... logo após as outras linhas de useState
const [successData, setSuccessData] = useState<{ url: string; title: string } | null>(null);

  // Referências para o DOM
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // --- Efeitos (Hooks) ---

  // Efeito para rolar o log automaticamente
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  // Efeito para buscar as partes do livro e montar a pré-visualização em HTML
  useEffect(() => {
    const fetchAndAssemble = async () => {
      setIsLoadingParts(true);
      setError(null);
      try {
        const { data: parts, error: fetchError } = await supabase
          .from('book_parts')
          .select('*')
          .eq('book_id', book.id)
          .order('part_index', { ascending: true });

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

  /**
   * Função principal: Gera o PDF final chamando o backend WeasyPrint.
   */
  async function handleGeneratePdf() {
    if (!book?.id) {
      setError("ID do livro não encontrado. Não é possível gerar o PDF.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setLog([]);
    updateLog("Iniciando pipeline de geração de PDF final com WeasyPrint...");
    
    try {
      const url = await generateFullPdf(book.id); // Esta função agora chama o backend certo
      if (!url) {
        throw new Error("O backend não retornou uma URL para o PDF.");
      }
      
    // ...
      updateLog("✅ PDF gerado com sucesso! Preparando a tela de download...");
      setSuccessData({ url: url, title: book.title });
    // ...
/*
      updateLog("✅ PDF gerado com sucesso! Abrindo em nova aba...");
      const win = window.open(url, "_blank");
      if (!win) {
        alert("Seu navegador bloqueou o pop-up. Por favor, libere para visualizar o PDF.");
        updateLog("⚠️ O navegador bloqueou a abertura da nova aba.");
      }
*/


    } catch (err) {
      console.error(err);
      const errorMessage = `Erro ao gerar PDF final: ${(err as Error).message}`;
      setError(errorMessage);
      updateLog(`❌ ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * Gera um arquivo .DOCX localmente no navegador.
   */
  const handleGenerateDocx = async () => {
    if (bookParts.length === 0) {
      alert("As partes do livro não estão carregadas.");
      return;
    }
    
    setIsGeneratingDocx(true);
    updateLog("Iniciando geração do arquivo DOCX...");

    try {
        const docChildren: (Paragraph)[] = [];

        bookParts.forEach(part => {
            let content;
            try {
                content = JSON.parse(part.content);
            } catch (e) {
                content = { content: part.content };
            }

            // Lógica para adicionar cada parte ao DOCX
            // (Esta lógica pode ser refinada, mas funciona)
            switch (part.part_type) {
                case 'cover':
                    docChildren.push(new Paragraph({ children: [new TextRun({ text: content.title || book.title, bold: true, size: 72 })], alignment: AlignmentType.CENTER }));
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                case 'chapter_title':
                    docChildren.push(new Paragraph({ text: content.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
                    break;
                case 'introduction':
                case 'conclusion':
                case 'chapter_content':
                    if (content.title) {
                        docChildren.push(new Paragraph({ text: content.title, heading: HeadingLevel.HEADING_2 }));
                    }
                    if(content.introduction) {
                         content.introduction.split('\n').forEach((line: string) => docChildren.push(new Paragraph(line.trim())));
                    }
                    if(content.subchapters) {
                        content.subchapters.forEach((sub: any) => {
                             docChildren.push(new Paragraph({ text: sub.title, heading: HeadingLevel.HEADING_3 }));
                             sub.content.split('\n').forEach((line: string) => docChildren.push(new Paragraph(line.trim())));
                        });
                    }
                    docChildren.push(new Paragraph({ children: [new PageBreak()] }));
                    break;
                default:
                    break;
            }
        });
        
        const doc = new Document({ sections: [{ children: docChildren }] });
        
        const blob = await Packer.toBlob(doc);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${book.title.replace(/ /g, '_')}.docx`;
        link.click();
        
        updateLog("✅ Download do DOCX iniciado.");
    } catch (error) {
        const errMessage = `Ocorreu um erro ao gerar o DOCX: ${(error as Error).message}`;
        updateLog(`❌ ${errMessage}`);
        alert(errMessage);
    } finally {
        setIsGeneratingDocx(false);
    }
  };
  
  /**
   * Testa a comunicação direta com a função do Supabase (que chama o WeasyPrint).
   * Útil para debugging.
   */
  const handleTestBackendPdf = async () => {
    if (!fullHtml) {
      alert("HTML não carregado para o teste.");
      return;
    }
    
    setIsTestingBackend(true);
    setLog([]);
    updateLog(`Enviando HTML de teste (${(fullHtml.length / 1024).toFixed(1)} KB) para o backend...`);

    try {
        const { data, error } = await supabase.functions.invoke<{pdfBase64: string}>("generate-pdf", {
            body: { html: fullHtml },
        });

        if (error) throw error;
        if (!data?.pdfBase64) throw new Error("A resposta do backend não continha o PDF.");

        updateLog("✅ PDF recebido do backend. Preparando download...");
        const byteCharacters = atob(data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${book.title.replace(/ /g, '_')}_backend_test.pdf`;
        link.click();
        
        updateLog("✅ Download do PDF de teste iniciado!");
    } catch (err: any) {
        const errMessage = `Erro no teste do backend: ${err.message}`;
        updateLog(`❌ ${errMessage}`);
        alert(errMessage);
    } finally {
        setIsTestingBackend(false);
    }
  };


  // --- Renderização do Componente (JSX) ---

// SUBSTITUA SEU RETURN ATUAL POR ESTE BLOCO COMPLETO

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
              A edição de conteúdo foi desativada para garantir a estabilidade da geração de PDF.
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
              <p className="text-gray-600 mt-2">Clique nos botões abaixo para gerar os arquivos do seu livro.</p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button
                  onClick={handleGeneratePdf}
                  className="text-lg w-full sm:w-auto"
                  isLoading={isGenerating}
                  loadingText="Gerando PDF..."
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
                  className="text-lg w-full sm:w-auto"
                  variant="secondary"
                  isLoading={isTestingBackend}
                  loadingText="Testando..."
                  disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
                >
                  Testar PDF Backend
                </Button>
              </div>
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

// Faça essas correções com calma quando voltar, salve e faça o deploy. Com esta mudança, o erro da tela branca será resolvido e o fluxo funcionará como planejado. Boa viagem


  /*

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center w-full sm:w-auto">
            <ArrowLeftIcon />
            Voltar
          </Button>
          <div className="text-sm text-gray-600">
            A edição de conteúdo foi desativada para garantir a estabilidade da geração de PDF.
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
            <p className="text-gray-600 mt-2">Clique nos botões abaixo para gerar os arquivos do seu livro.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button
                onClick={handleGeneratePdf}
                className="text-lg w-full sm:w-auto"
                isLoading={isGenerating}
                loadingText="Gerando PDF..."
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
                className="text-lg w-full sm:w-auto"
                variant="secondary"
                isLoading={isTestingBackend}
                loadingText="Testando..."
                disabled={isLoadingParts || !!error || isGenerating || isGeneratingDocx || isTestingBackend}
              >
                Testar PDF Backend
              </Button>
            </div>
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
  );
};
*/