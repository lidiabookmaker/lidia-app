// components/SuccessPage.tsx

import React from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

/* ======================================================================= */
/* ========================== ÍCONES SVG ================================= */
/* ======================================================================= */

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);


/* ======================================================================= */
/* =========================== COMPONENTE ================================ */
/* ======================================================================= */

interface SuccessPageProps {
  publicUrl: string;
  bookTitle: string;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({ publicUrl, bookTitle }) => {
  
  /**
   * Esta função força o download do arquivo PDF.
   * Ela cria um link invisível, clica nele e depois o remove.
   */
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = publicUrl;
    
    // Formata o título do livro para ser um nome de arquivo válido (ex: "Meu_Livro_Incrivel.pdf")
    const fileName = `${bookTitle.replace(/ /g, '_')}.pdf`;
    link.setAttribute('download', fileName);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl p-8 text-center shadow-2xl">
        
        {/* Imagem da Lídia adicionada aqui */}
        <img 
            src="/lidia-parabens-1200.webp" 
            alt="Lídia parabenizando pela conclusão do livro"
            className="rounded-lg shadow-lg mb-8 max-w-md mx-auto" 
        />

        <h1 className="text-4xl font-bold text-gray-800 mt-6">Parabéns!</h1>
        <h2 className="text-2xl text-gray-700">Seu livro "{bookTitle}" está pronto!</h2>
        
        <p className="text-gray-600 mt-4 max-w-prose mx-auto">
          Toda a jornada de criação, desde a primeira ideia até a última palavra, culminou neste momento.
          Clique no botão abaixo para fazer o download da sua obra.
        </p>

        <Button 
          onClick={handleDownload} 
          className="text-lg mt-8 py-4 px-8 w-full sm:w-auto"
        >
          <DownloadIcon />
          Baixar meu Livro
        </Button>

      </Card>
    </div>
  );
};