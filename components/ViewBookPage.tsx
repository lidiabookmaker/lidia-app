import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { supabase } from '../services/supabase';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { assembleFullHtml, assemblePartHtml } from '../services/bookFormatter';


const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const GenerateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15-2-2 2-2"/><path d="m14 15 2-2-2-2"/></svg>
);


interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [bookParts, setBookParts] = useState<BookPart[]>([]);
  const [fullHtml, setFullHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
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

  const updateLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };
  
  const handleGeneratePdf = async () => {
    if (bookParts.length === 0) {
        alert("As partes do livro não estão carregadas. Tente novamente.");
        return;
    }
    
    setIsGenerating(true);
    setLog([]);
    updateLog("Iniciando pipeline de geração de PDF...");

    const generatedPdfParts: PDFDocument[] = [];
    
    try {
        // --- FASE 1: Geração individual de cada parte ---
        for (const part of bookParts) {
            updateLog(`Gerando PDF para a parte '${part.part_type}' (índice ${part.part_index})...`);
            const partHtml = assemblePartHtml(book, part);

            // FIX: Explicitly typed 'margin' as a tuple [number, number, number, number] to resolve TypeScript error.
            const margin: [number, number, number, number] = part.part_type === 'cover' ? [0,0,0,0] : [2.4, 2, 2.7, 2];

            const opt = {
                margin:       margin, // cm: top, left, bottom, right
                filename:     `part_${part.part_index}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'cm', format: 'a5', orientation: 'portrait' as const }
            };
            
            const pdfBytes = await html2pdf().from(partHtml).set(opt).output('arraybuffer');
            const partPdfDoc = await PDFDocument.load(pdfBytes);
            
            generatedPdfParts.push(partPdfDoc);
            updateLog(`... Sucesso (${partPdfDoc.getPageCount()} páginas)`);
        }

        // --- FASE 2: Montagem final e Paginação ---
        updateLog("Todas as partes geradas. Iniciando montagem final do documento...");

        const finalPdfDoc = await PDFDocument.create();
        let pageCounter = 1;

        const helveticaFont = await finalPdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await finalPdfDoc.embedFont(StandardFonts.HelveticaBold);
        const royalBlue = rgb(0, 0.137, 0.4); // #002366
        const blackTransparent = rgb(0, 0, 0);


        for (const partPdf of generatedPdfParts) {
            const copiedPages = await finalPdfDoc.copyPages(partPdf, partPdf.getPageIndices());
            for (const page of copiedPages) {
                const addedPage = finalPdfDoc.addPage(page);
                const { width, height } = addedPage.getSize();

                // Pula o "carimbo" na capa
                if (pageCounter > 1) {
                    // Header
                    // FIX: Replaced unsupported 'xAlign' property by manually calculating the centered 'x' position based on text width.
                    const headerText = book.title.toUpperCase();
                    const headerTextWidth = helveticaFont.widthOfTextAtSize(headerText, 8);
                    addedPage.drawText(headerText, {
                        x: (width - headerTextWidth) / 2,
                        y: height - 1.3 * 28.35, // 1.3cm from top
                        font: helveticaFont,
                        size: 8,
                        color: royalBlue,
                    });

                    // Footer
                    // FIX: Replaced unsupported 'xAlign' property by manually calculating the centered 'x' position based on text width.
                    const footerText = String(pageCounter);
                    const footerTextWidth = helveticaBoldFont.widthOfTextAtSize(footerText, 16);
                    addedPage.drawText(footerText, {
                        x: (width - footerTextWidth) / 2,
                        y: 1.35 * 28.35, // 1.35cm from bottom
                        font: helveticaBoldFont,
                        size: 16,
                        color: blackTransparent,
                        opacity: 0.4,
                    });
                }
                pageCounter++;
            }
        }
        
        updateLog(`Montagem finalizada com ${pageCounter - 1} páginas. Preparando para download...`);
        
        const finalPdfBytes = await finalPdfDoc.save();

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${book.title.replace(/ /g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        updateLog("Download iniciado. Processo concluído!");

    } catch (error) {
        console.error("PDF Generation Pipeline Error:", error);
        const errMessage = `Ocorreu um erro: ${(error as Error).message}`;
        updateLog(`ERRO: ${errMessage}`);
        alert(errMessage);
    } finally {
        setIsGenerating(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center w-full sm:w-auto">
                <ArrowLeftIcon />
                Voltar
            </Button>
            <div className="text-sm text-gray-600">
                A edição de conteúdo foi desativada nesta versão para garantir a estabilidade da geração de PDF.
            </div>
        </header>

        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Erro!</strong>
                <span className="block sm:inline"> {error}</span>
            </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-2 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>
            
             <Card className="lg:col-span-2 text-center">
                <h3 className="text-xl font-bold text-gray-800">Gerar PDF do Livro</h3>
                <p className="text-gray-600 mt-2">Clique no botão abaixo para iniciar o processo de geração sequencial do PDF.</p>
                <Button 
                  onClick={handleGeneratePdf} 
                  className="mt-6 text-lg" 
                  isLoading={isGenerating || isLoadingParts}
                  loadingText={isLoadingParts ? "Carregando conteúdo..." : "Gerando PDF..."}
                  disabled={isLoadingParts || !!error || isGenerating}
                >
                    <GenerateIcon/>
                    Gerar PDF Final
                </Button>
            </Card>

            <div className="lg:col-span-2">
                 <h2 className="text-2xl font-bold text-gray-800 mb-4">Log de Geração</h2>
                 <div ref={logContainerRef} className="bg-gray-900 text-white font-mono text-sm p-4 rounded-lg h-64 overflow-y-auto mb-4 flex-grow">
                  {log.length === 0 && <p className="text-gray-400">Aguardando início da geração...</p>}
                  {log.map((line, index) => <p key={index} className="whitespace-pre-wrap">{line}</p>)}
                </div>
            </div>

            <div className="lg:col-span-2">
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