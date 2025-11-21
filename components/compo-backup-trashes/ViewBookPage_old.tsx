import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import type { Book } from '../types';
import { Button } from './ui/Button';

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
);
const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
  onUpdateBook: (bookId: string, content: string) => Promise<void>;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate, onUpdateBook }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
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
    // Re-render iframe with original content
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(book.content || '');
      iframe.contentWindow.document.close();
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow?.document?.body?.innerHTML) return;

    setIsSaving(true);
    setSaveError('');

    try {
      const updatedContent = iframe.contentWindow.document.body.innerHTML;
      await onUpdateBook(book.id, updatedContent);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save book:", error);
      const err = error as Error;
      setSaveError(`Falha ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!book.content) {
        setDownloadError("O conteúdo do livro não está disponível para download.");
        return;
    };
    setIsDownloading(true);
    setDownloadError('');

    let iframe: HTMLIFrameElement | null = null;

    try {
        iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) {
            throw new Error("Não foi possível acessar o documento do iframe.");
        }

        iframeDoc.open();
        iframeDoc.write(book.content);
        iframeDoc.close();
        
        const opt = {
            // FIX: The margin property for html2pdf requires a tuple of 4 numbers.
            // A simple array literal works here as the library is less strict than its typings suggest.
            margin: [20, 20, 20, 20],
            filename: `${book.title.replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').toLowerCase()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true,
                logging: false,
                windowWidth: iframeDoc.documentElement.scrollWidth,
                windowHeight: iframeDoc.documentElement.scrollHeight,
            },
            jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] },
        };

        const worker = html2pdf().from(iframeDoc.body).set(opt);
        
        worker.toPdf().get('pdf').then(function (pdf) {
            const totalPages = pdf.internal.getNumberOfPages();
            const startPage = 3; 
            pdf.setFont('helvetica', 'normal');

            for (let i = startPage; i <= totalPages; i++) {
                pdf.setPage(i);
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                pdf.setFontSize(9);
                pdf.setTextColor(150);
                pdf.text(book.title, pageWidth / 2, 15, { align: 'center' });
                
                pdf.text(String(i), pageWidth / 2, pageHeight - 15, { align: 'center' });
            }
        });

        await worker.save();
        await new Promise(r => setTimeout(r, 300));
        
    } catch (error) {
        console.error("Client-side PDF Download failed:", error);
        const err = error as Error;
        setDownloadError(`Ocorreu um erro ao gerar o PDF: ${err.message}`);
    } finally {
        if (iframe && iframe.parentNode) {
            document.body.removeChild(iframe);
        }
        setIsDownloading(false);
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
                            <SaveIcon />
                            Salvar
                        </Button>
                        <Button onClick={handleCancel} variant="secondary" className="w-full">
                            Cancelar
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={handleEdit} variant="secondary" className="w-full inline-flex items-center">
                           <EditIcon />
                           Editar
                        </Button>
                        <Button 
                          onClick={handleDownload} 
                          className="w-full inline-flex items-center"
                          isLoading={isDownloading}
                          loadingText="Gerando PDF..."
                          disabled={isEditing}
                        >
                          <DownloadIcon />
                          Baixar PDF
                        </Button>
                    </>
                )}
            </div>
        </header>

        {(downloadError || saveError) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Erro!</strong>
                {downloadError && <span className="block sm:inline"> {downloadError}</span>}
                {saveError && <span className="block sm:inline"> {saveError}</span>}
            </div>
        )}

        <main>
            {!isEditing && (
              <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                  <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                  <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
              </div>
            )}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <iframe
                    ref={iframeRef}
                    srcDoc={book.content}
                    title={book.title}
                    className="w-full border-0 h-[80vh]"
                    sandbox="allow-same-origin"
                />
            </div>
        </main>
      </div>
    </div>
  );
};