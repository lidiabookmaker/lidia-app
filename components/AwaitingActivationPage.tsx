import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import type { UserProfile } from '../types';

interface AwaitingActivationPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  logoUrl: string | null;
}

export const AwaitingActivationPage: React.FC<AwaitingActivationPageProps> = ({ user, onLogout, logoUrl }) => {
    const [notified, setNotified] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleNotifyAdmin = () => {
        setIsLoading(true);
        // Simulate sending an email
        console.log(`Notifying admin to activate account for: ${user?.email}`);
        setTimeout(() => {
            setNotified(true);
            setIsLoading(false);
        }, 1500);
    };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
       <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <img src={logoUrl || '/logo.png'} alt="LIDIA Logo" className="h-10" />
        <Button onClick={onLogout} variant="secondary">Sair</Button>
      </header>
      <Card className="w-full max-w-lg text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quase lá!</h2>
        <p className="text-gray-600 mb-6">
          Sua conta foi criada com sucesso! Estamos validando sua assinatura e seu acesso será liberado em breve.
        </p>
        {!notified ? (
            <Button onClick={handleNotifyAdmin} isLoading={isLoading}>
                POR FAVOR ATIVE MINHA CONTA
            </Button>
        ) : (
            <p className="text-green-600 font-semibold bg-green-100 p-3 rounded-md">
                O administrador foi notificado! Você receberá um email assim que sua conta for ativada.
            </p>
        )}
      </Card>
    </div>
  );
};