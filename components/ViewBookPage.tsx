import React, { useState } from 'react';
import type { Book } from '../types';
import { Button } from './ui/Button';

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async () => {
    if (!book.content) {
        setDownloadError("O conteúdo do livro não está disponível para download.");
        return;
    };
    setIsDownloading(true);
    setDownloadError('');

    try {
        const response = await fetch('/api/generate-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                htmlContent: book.content,
                title: book.title
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.details || errorJson.error || `O servidor respondeu com status ${response.status}`;
            } catch (e) {
                errorMessage = errorText;
            }
            throw new Error(errorMessage);
        }

        const { downloadUrl } = await response.json();
        window.open(downloadUrl, '_blank');

    } catch (error) {
        console.error("PDF Download failed:", error);
        const err = error as Error;
        setDownloadError(`Ocorreu um erro ao gerar o PDF: ${err.message}`);
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <Button onClick={() => onNavigate('dashboard')} variant="secondary" className="inline-flex items-center w-full sm:w-auto">
                <ArrowLeftIcon />
                Voltar ao Dashboard
            </Button>
            <div className="flex space-x-4 w-full sm:w-auto">
                <Button 
                  onClick={handleDownload} 
                  className="w-full"
                  isLoading={isDownloading}
                  loadingText="Gerando PDF..."
                >
                  Baixar PDF
                </Button>
            </div>
        </header>

        {downloadError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Erro!</strong>
                <span className="block sm:inline"> {downloadError}</span>
            </div>
        )}

        <main>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {book.content ? (
                    <iframe
                        srcDoc={book.content}
                        title={book.title}
                        className="w-full border-0 h-[80vh]"
                        sandbox="allow-same-origin" // for security
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        O conteúdo deste livro não está disponível.
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};
