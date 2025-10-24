
import React from 'react';
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
  const handleDownload = (format: 'PDF' | 'DOCX') => {
    if (!book.generatedContent) return;
    const blob = new Blob([book.generatedContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    // Simulate different downloads by changing extension. In production, a server would convert this.
    a.download = `${safeTitle}.${format === 'PDF' ? 'html' : 'html'}`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                <Button onClick={() => handleDownload('PDF')} className="w-full">Baixar "PDF"</Button>
                <Button onClick={() => handleDownload('DOCX')} variant="secondary" className="w-full">Baixar "DOCX"</Button>
            </div>
        </header>
        <main>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-1">{book.title}</h1>
                <h2 className="text-xl text-gray-600">{book.subtitle}</h2>
                <p className="text-sm text-gray-500 mt-1">por {book.author}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {book.generatedContent ? (
                    <iframe
                        srcDoc={book.generatedContent}
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
