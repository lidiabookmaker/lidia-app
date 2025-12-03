import React from 'react';
import { Button } from './ui/Button';
import type { Page } from '../types';

interface LandingPageProps {
  onNavigate: (page: 'login') => void;
  logoUrl: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, logoUrl }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center text-center px-4">
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <img src={logoUrl || '/logo.png'} alt="LIDIA Logo" className="h-10" />
        <Button onClick={() => onNavigate('login')} variant="secondary">Login</Button>
      </header>
      <main className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight">
        Transforme Suas Ideias em <span className="text-indigo-600">Livros Digitais</span> Profissionais.
        
        </h2>
        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Com o poder da Inteligência Artificial, o Lidia cria e-books completos com mais de 120 páginas, capa pronta e formatados para você em minutos, prontos para vender.
        </p>
        <div className="mt-10">
          <Button onClick={() => onNavigate('login')} className="text-xl md:text-2xl px-10 py-5">
            COMECE GRÁTIS AGORA
          </Button>
        </div>
      </main>
    </div>
  );
};