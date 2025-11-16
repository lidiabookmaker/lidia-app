// components/ProgressScreen.tsx

import React from 'react';
import { Card } from './ui/Card';

/* ======================================================================= */
/* =========================== COMPONENTE ================================ */
/* ======================================================================= */

interface ProgressScreenProps {
  message: string;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ message }) => {
  return (
    <div className="text-center p-4">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Lídia está criando seu livro...</h3>
      
      {/* Barra de Progresso Animada */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
        <div 
          className="bg-purple-600 h-4 rounded-full animate-pulse"
          style={{ width: '100%' }} // A barra estará sempre "cheia", mas o pulse dá a sensação de atividade
        ></div>
      </div>

      {/* Mensagem de Status Dinâmica */}
      <p className="text-gray-600 font-mono text-sm">
        {message}
      </p>
    </div>
  );
};