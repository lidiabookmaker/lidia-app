
import React from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface SuspendedAccountPageProps {
  onLogout: () => void;
}

export const SuspendedAccountPage: React.FC<SuspendedAccountPageProps> = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
       <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Lidia Book Maker</h1>
        <Button onClick={onLogout} variant="secondary">Sair</Button>
      </header>
      <Card className="w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Conta Suspensa</h2>
        <p className="text-gray-600 mb-6">
          Sua conta está suspensa. Por favor, entre em contato com o suporte.
        </p>
      </Card>
    </div>
  );
};