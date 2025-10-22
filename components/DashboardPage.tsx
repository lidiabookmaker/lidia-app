
import React from 'react';
import type { UserProfile, Book, Page } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface DashboardPageProps {
  user: UserProfile;
  books: Book[];
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-indigo-500 mb-2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
);

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, books, onNavigate, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Lidia Book Maker</h1>
          <div className="flex items-center space-x-4">
             {user.role === 'admin' && <Button onClick={() => onNavigate('admin-users')} variant="secondary">Admin</Button>}
            <span className="text-gray-600 hidden sm:block">Olá, {user.email}</span>
            <Button onClick={onLogout} variant="secondary">Sair</Button>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
                <h2 className="text-3xl font-bold text-gray-800">Bem-vindo(a) de volta!</h2>
                <p className="text-gray-600 mt-1">Você ainda pode criar <span className="font-bold text-indigo-600">{user.book_credits}</span> de 10 livros este mês.</p>
            </div>
            <Button onClick={() => onNavigate('create-book')} className="mt-4 md:mt-0 text-lg">
              + Criar Novo Livro
            </Button>
          </div>
        </Card>

        <div>
          <h3 className="text-2xl font-bold text-gray-700 mb-4">Seus Livros Criados</h3>
          {books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map(book => (
                <Card key={book.id} className="flex flex-col">
                    <BookIcon />
                  <h4 className="text-xl font-bold text-gray-800">{book.title}</h4>
                  <p className="text-gray-500 text-sm mt-1">{book.subtitle}</p>
                   <p className="text-gray-500 text-xs mt-2">Criado em: {new Date(book.createdAt).toLocaleDateString()}</p>
                   <div className="mt-auto pt-4 flex space-x-2">
                       <Button variant="secondary" className="w-full text-sm py-2">Visualizar</Button>
                   </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center">
              <p className="text-gray-500">Você ainda não criou nenhum livro. Clique em "Criar Novo Livro" para começar!</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
   