import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { supabase } from '../services/supabase';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';


const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);
const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const GenerateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15-2-2 2-2"/><path d="m14 15 2-2-2-2"/></svg>
);


interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
  onUpdateBook: (bookId: string, content: string) => Promise<void>;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate, onUpdateBook }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (doc) {
      doc.designMode = isEditing ? 'on' : 'off';
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setSaveError('');
  };

  const handleCancel = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      // Restore original content
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(book.content || '');
      iframe.contentWindow.document.close();
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow?.document?.documentElement?.outerHTML) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const updatedContent = iframe.contentWindow.document.documentElement.outerHTML;
      await onUpdateBook(book.id, updatedContent);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save book:", error);
      setSaveError(`Falha ao salvar: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
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
            // FIX: Explicitly cast margin to a tuple of 4 numbers to satisfy Html2PdfOptions type.
            margin:       [2.4, 2, 2.7, 2] as [number, number, number, number], // [top, left, bottom, right] in cm
            filename:     `${book.title.replace(/ /g, '_')}.pdf`,
            pagebreak:    { mode: 'css', after: '.page-container' },
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'cm', format: 'a5', orientation: 'portrait' }
        };

        const worker = html2pdf().from(contentElement).set(opt);
        
        // FIX: Refactored promise chain to use async/await correctly, preventing an error where `.save()` was called on a Promise.
        const pdf = await worker.toPdf().get('pdf');

        const totalPages = pdf.internal.getNumberOfPages();
        const bookTitle = book.title.toUpperCase();
        
        const headerFont = 'Helvetica'; // Standard PDF font, safe choice
        const footerFont = 'Helvetica'; // Standard PDF font, safe choice
        const royalBlue = '#002366';

        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            // Skip adding headers/footers to the first page (cover)
            if (i === 1) continue;

            // --- Add Header ---
            pdf.setFont(headerFont, 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(royalBlue);
            pdf.text(bookTitle, pdf.internal.pageSize.getWidth() / 2, 1.3, { align: 'center' });

            // --- Add Footer (Page Number) ---
            pdf.setFont(footerFont, 'bold');
            pdf.setFontSize(16);
            pdf.setTextColor('#000000');
            
            // Apply 40% opacity using Graphic State
            pdf.setGState(new pdf.GState({opacity: 0.4}));
            
            const pageNumText = String(i);
            pdf.text(pageNumText, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 1.35, { align: 'center' });
            
            // Reset opacity to default for subsequent operations
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
            <div className="flex space-x-2 w-full sm:w-auto">
                {isEditing ? (
                    <>
                        <Button onClick={handleSave} variant="success" className="w-full inline-flex items-center" isLoading={isSaving} loadingText="Salvando...">
                            <SaveIcon /> Salvar
                        </Button>
                        <Button onClick={handleCancel} variant="secondary" className="w-full">
                            Cancelar
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleEdit} variant="secondary" className="w-full inline-flex items-center" disabled={isGenerating}>
                        <EditIcon /> Editar Conteúdo
                    </Button>
                )}
            </div>
        </header>

        {saveError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Erro!</strong>
                <span className="block sm:inline"> {saveError}</span>
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
                  isLoading={isGenerating}
                  loadingText="Gerando PDF..."
                  disabled={isEditing}
                >
                    <GenerateIcon/>
                    Gerar PDF Final
                </Button>
            </Card>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pré-visualização do Conteúdo</h2>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <iframe
                        ref={iframeRef}
                        srcDoc={book.content}
                        title={book.title}
                        className="w-full border-0 h-[80vh]"
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};