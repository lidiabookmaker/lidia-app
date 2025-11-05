import React, { useState, useRef, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import type { Book, BookPart } from '../types';
import { Button } from './ui/Button';
import { supabase } from '../services/supabase';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';


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
const GenerateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m10 15-2-2 2-2"/><path d="m14 15 2-2-2-2"/></svg>
);


interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
  onUpdateBook: (bookId: string, content: string) => Promise<void>;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate, onUpdateBook }) => {
  const [currentBook, setCurrentBook] = useState<Book>(book);
  const [parts, setParts] = useState<BookPart[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ message: '', details: '' });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollingInterval = useRef<number | null>(null);

  const fetchBookStatus = async () => {
    const { data, error } = await supabase.from('books').select('status, pdf_final_url').eq('id', book.id).single();
    if (error) {
      console.error('Error polling book status:', error);
      // Stop polling on error to avoid spamming
      stopPolling();
      return;
    }
    if (data) {
        setCurrentBook(prev => ({...prev, status: data.status, pdf_final_url: data.pdf_final_url}));
        if (data.status === 'ready' || data.status === 'error') {
            stopPolling();
            setIsProcessing(false);
        }
    }
  };

  const startPolling = () => {
    if (pollingInterval.current) return;
    pollingInterval.current = window.setInterval(fetchBookStatus, 5000);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  useEffect(() => {
    const currentStatus = currentBook.status;
    if (currentStatus === 'processing_parts' || currentStatus === 'assembling_pdf') {
      setIsProcessing(true);
      startPolling();
    } else {
      setIsProcessing(false);
      stopPolling();
    }
    // Cleanup on component unmount
    return () => stopPolling();
  }, [currentBook.status, book.id]);
  
  const fetchBookParts = async () => {
      const { data, error } = await supabase.from('book_parts').select('*').eq('book_id', book.id).order('part_index', { ascending: true });
      if (error) {
          console.error("Error fetching book parts:", error);
          setProgress({ message: 'Erro', details: 'Não foi possível carregar as partes do livro.' });
      } else {
          setParts(data || []);
      }
  };

  useEffect(() => {
    fetchBookParts();
  }, [book.id]);

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
      setSaveError(`Falha ao salvar: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePdfPipeline = async () => {
    if (parts.length === 0) {
      setProgress({ message: 'Erro', details: 'Nenhuma parte do livro encontrada para gerar PDF.' });
      return;
    }
    setIsProcessing(true);
    setSaveError('');
    
    try {
      // 1. Set status to processing_parts
      await supabase.from('books').update({ status: 'processing_parts' }).eq('id', book.id);
      setCurrentBook(prev => ({...prev, status: 'processing_parts'}));

      // 2. Loop and generate PDF for each part
      for (const part of parts) {
        setProgress({ message: 'Gerando PDF...', details: `Processando parte ${part.part_index + 1} de ${parts.length}: ${part.part_name}` });

        const opt = { margin: 0, filename: 'part.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false }, jsPDF: { unit: 'cm', format: 'a5', orientation: 'portrait' } };
        
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = part.html_content;
        document.body.appendChild(tempContainer);
        
        const pdfBlob = await html2pdf().from(tempContainer).set(opt).output('blob');
        document.body.removeChild(tempContainer);

        const filePath = `${book.id}/parts/${part.part_index}.pdf`;
        const { error: uploadError } = await supabase.storage.from('books').upload(filePath, pdfBlob, { upsert: true });
        if (uploadError) throw new Error(`Falha no upload da parte ${part.part_index}: ${uploadError.message}`);

        await supabase.from('book_parts').update({ pdf_url: filePath }).eq('id', part.id);
      }

      // 3. Set status to assembling_pdf and invoke merge function
      setProgress({ message: 'Montando PDF final...', details: 'Aguarde, isso pode levar alguns instantes.' });
      await supabase.from('books').update({ status: 'assembling_pdf' }).eq('id', book.id);
      setCurrentBook(prev => ({...prev, status: 'assembling_pdf'}));
      
      const { error: functionError } = await supabase.functions.invoke('merge-pdfs', { body: { bookId: book.id } });
      if (functionError) throw new Error(`Falha na montagem do PDF: ${functionError.message}`);
      
      startPolling(); // Start checking for the 'ready' status

    } catch (error) {
      console.error("PDF Pipeline Error:", error);
      await supabase.from('books').update({ status: 'error' }).eq('id', book.id);
      setCurrentBook(prev => ({...prev, status: 'error'}));
      setProgress({ message: 'Erro no Pipeline', details: (error as Error).message });
      setIsProcessing(false);
    }
  };
  
  const getPublicUrl = (path: string) => {
      const { data } = supabase.storage.from('books').getPublicUrl(path);
      return data.publicUrl;
  }

  const renderPipelineControls = () => {
    if(isProcessing || currentBook.status === 'processing_parts' || currentBook.status === 'assembling_pdf') {
        let message = 'Processando...';
        let details = 'Aguarde um momento.';
        if (currentBook.status === 'processing_parts') {
            message = progress.message || 'Gerando partes do PDF...';
            details = progress.details || `Renderizando cada página do seu livro.`;
        }
        if (currentBook.status === 'assembling_pdf') {
            message = 'Montando PDF final...';
            details = 'Juntando todas as partes. Isso pode levar alguns minutos.';
        }
        return (
            <Card className="bg-indigo-50 border-indigo-200 border text-center">
                <h3 className="text-xl font-bold text-indigo-800">{message}</h3>
                <p className="text-indigo-700 mt-2">{details}</p>
                <div className="mt-4">
                    <LoadingSpinner/>
                </div>
            </Card>
        );
    }

    if (currentBook.status === 'ready' && currentBook.pdf_final_url) {
        return (
             <Card className="bg-green-50 border-green-200 border text-center">
                <h3 className="text-xl font-bold text-green-800">Seu PDF está pronto!</h3>
                <a href={getPublicUrl(currentBook.pdf_final_url)} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="success" className="mt-4 inline-flex items-center text-lg">
                        <DownloadIcon />
                        Baixar PDF Final
                    </Button>
                </a>
            </Card>
        );
    }
    
    if (currentBook.status === 'error') {
        return (
             <Card className="bg-red-50 border-red-200 border text-center">
                <h3 className="text-xl font-bold text-red-800">Ocorreu um Erro</h3>
                <p className="text-red-700 mt-2">{progress.details || "Não foi possível gerar o PDF."}</p>
                 <Button onClick={generatePdfPipeline} className="mt-4">
                    Tentar Novamente
                </Button>
            </Card>
        );
    }


    return (
        <Card className="text-center">
            <h3 className="text-xl font-bold text-gray-800">Gerar PDF do Livro</h3>
            <p className="text-gray-600 mt-2">Este processo irá renderizar cada parte do livro individualmente e depois juntá-las em um único arquivo PDF.</p>
            <Button onClick={generatePdfPipeline} className="mt-6 text-lg" disabled={parts.length === 0}>
                <GenerateIcon/>
                Iniciar Geração do PDF
            </Button>
        </Card>
    );
  }

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
                    <Button onClick={handleEdit} variant="secondary" className="w-full inline-flex items-center" disabled={isProcessing}>
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
            
            {renderPipelineControls()}

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Pré-visualização do Conteúdo</h2>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <iframe
                        ref={iframeRef}
                        srcDoc={book.content}
                        title={book.title}
                        className="w-full border-0 h-[80vh]"
                        sandbox="allow-same-origin"
                    />
                </div>
            </div>
        </main>
      </div>
    </div>
  );
};