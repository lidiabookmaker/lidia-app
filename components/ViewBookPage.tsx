import React, { useState } from 'react';
import type { Book } from '../types';
import { Button } from './ui/Button';
import { downloadAsPdf } from '../services/pdf-generator';

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);

interface ViewBookPageProps {
  book: Book;
  onNavigate: (page: 'dashboard') => void;
}

export const ViewBookPage: React.FC<ViewBookPageProps> = ({ book, onNavigate }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!book.generated_content) return;
    setIsDownloading(true);
    try {
        await downloadAsPdf(book.title, book.generated_content);
    } catch (error) {
        console.error("PDF Download failed:", error);
        // Optionally show an error message to the user
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
        <main>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {book.generated_content ? (
                    <iframe
                        srcDoc={book.generated_content}
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