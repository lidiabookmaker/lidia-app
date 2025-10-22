
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import type { UserProfile } from '../types';

interface AuthPageProps {
  onLogin: (user: UserProfile) => void;
  onRegister: (user: UserProfile) => void;
}

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,35.24,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mocking Supabase Auth logic
  const handleAuthAction = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (isLogin) {
        // Simulate login
        if (email === 'admin@lidia.com' && password === 'admin123') {
          onLogin({ id: '1', email, status: 'ativa_pro', role: 'admin', book_credits: 999 });
        } else if (email === 'user@example.com' && password === 'user123') {
          onLogin({ id: '2', email, status: 'ativa_pro', role: 'user', book_credits: 8 });
        } else if (email === 'free@example.com' && password === 'user123') {
          onLogin({ id: '3', email, status: 'ativa_free', role: 'user', book_credits: 1 });
        } else if (email === 'suspended@example.com' && password === 'user123') {
           onLogin({ id: '4', email, status: 'suspensa', role: 'user', book_credits: 0 });
        } else if (email === 'usedfree@example.com' && password === 'user123') {
           onLogin({ id: '5', email, status: 'ativa_free', role: 'user', book_credits: 0, first_book_ip: '123.45.67.89' });
        } else {
          setError('Credenciais inválidas.');
        }
      } else {
        // Simulate registration
        if (!email || !password) {
            setError('Email e senha são obrigatórios.');
        } else {
            const newUser: UserProfile = { id: Date.now().toString(), email, status: 'ativa_free', role: 'user', book_credits: 1 };
            onRegister(newUser);
        }
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <h1 className="text-3xl font-bold text-indigo-600 mb-4">Lidia Book Maker</h1>
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
        
        <Button className="w-full mb-4 flex items-center justify-center" variant="secondary">
            <GoogleIcon />
            {isLogin ? 'Entrar com Google' : 'Cadastrar com Google'}
        </Button>

        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Ou continue com</span>
            </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <form onSubmit={handleAuthAction} className="space-y-4">
          <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input id="password" label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          <button onClick={() => { setIsLogin(!isLogin); setError('')}} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </p>
      </Card>
    </div>
  );
};