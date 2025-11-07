import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { supabase } from '../services/supabase';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { assembleFullHtml } from '../services/bookFormatter';


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
  const [fullHtml, setFullHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
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
  
  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
        const contentElement = iframeRef.current?.contentWindow?.document.documentElement;
        if (!contentElement) {
            alert("Não foi possível acessar o conteúdo do livro para gerar o PDF.");
            setIsGenerating(false);
            return;
        }

        const opt = {
            margin:       [0, 0, 0, 0] as [number, number, number, number],
            filename:     `${book.title.replace(/ /g, '_')}.pdf`,
            pagebreak:    { mode: 'css', after: '.page-container' },
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            // FIX: The type of 'orientation' was inferred as 'string' instead of the literal 'portrait'. Adding 'as const' ensures it's correctly typed as 'portrait', which is assignable to 'portrait' | 'landscape'.
            jsPDF:        { unit: 'cm', format: 'a5', orientation: 'portrait' as const }
        };

        const worker = html2pdf().from(contentElement).set(opt);
        
        const pdf = await worker.toPdf().get('pdf');

        const totalPages = pdf.internal.getNumberOfPages();
        const bookTitle = book.title.toUpperCase();
        
        const headerFont = 'Helvetica';
        const footerFont = 'Helvetica';
        const royalBlue = '#002366';

        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            if (i === 1) continue;

            // Header
            pdf.setFont(headerFont, 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(royalBlue);
            pdf.text(bookTitle, pdf.internal.pageSize.getWidth() / 2, 1.3, { align: 'center' });

            // Footer
            pdf.setFont(footerFont, 'bold');
            pdf.setFontSize(16);
            pdf.setTextColor('#000000');
            pdf.setGState(new pdf.GState({opacity: 0.4}));
            pdf.text(String(i), pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 1.35, { align: 'center' });
            pdf.setGState(new pdf.GState({opacity: 1}));
        }
        
        await worker.save();

    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert(`Ocorreu um erro ao gerar o PDF: ${(error as Error).message}`);
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

        <main className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>
            
             <Card className="text-center">
                <h3 className="text-xl font-bold text-gray-800">Gerar PDF do Livro</h3>
                <p className="text-gray-600 mt-2">Clique no botão abaixo para gerar e baixar o arquivo PDF final do seu livro.</p>
                <Button 
                  onClick={handleGeneratePdf} 
                  className="mt-6 text-lg" 
                  isLoading={isGenerating || isLoadingParts}
                  loadingText={isLoadingParts ? "Carregando conteúdo..." : "Gerando PDF..."}
                  disabled={isLoadingParts || !!error}
                >
                    <GenerateIcon/>
                    Gerar PDF Final
                </Button>
            </Card>

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