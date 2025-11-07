import React from 'react';
import type { UserProfile, Book, Page, BookStatus } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface DashboardPageProps {
  user: UserProfile;
  books: Book[];
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onViewBook: (bookId: string) => void;
  logoUrl: string | null;
}

const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-indigo-500 mb-2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
);

const bookStatusClasses: Record<BookStatus, string> = {
    content_ready: 'bg-blue-100 text-blue-800',
    // FIX: The 'processing_parts' and 'assembling_pdf' statuses were not defined in the BookStatus type. Renamed 'assembling_pdf' to 'generating_pdf' to match the type and added 'processing_parts' to the type definition.
    processing_parts: 'bg-yellow-100 text-yellow-800 animate-pulse',
    generating_pdf: 'bg-yellow-100 text-yellow-800 animate-pulse',
    ready: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    generating_content: 'bg-gray-100 text-gray-800 animate-pulse'
};

const formatBookStatus = (status: BookStatus) => {
    const map: Record<BookStatus, string> = {
        generating_content: 'Gerando...',
        content_ready: 'Pronto para PDF',
        // FIX: Renamed 'assembling_pdf' to 'generating_pdf' to align with the BookStatus type.
        processing_parts: 'Processando...',
        generating_pdf: 'Montando...',
        ready: 'Pronto',
        error: 'Erro'
    };
    return map[status] || status;
};


export const DashboardPage: React.FC<DashboardPageProps> = ({ user, books, onNavigate, onLogout, onViewBook, logoUrl }) => {
  const isFreeUser = user.status === 'ativa_free';
  const credits = user.book_credits;
  const canCreateBook = credits > 0;

  let creditsText;
  if (isFreeUser) {
    creditsText = `Você pode criar mais ${credits} ${credits === 1 ? 'livro' : 'livros'}.`;
  } else { // ativa_pro
    creditsText = `Você ainda pode criar ${credits} de 100 livros este mês.`;
  }

  let createButtonText = "+ Criar Novo Livro";
  if (!canCreateBook && isFreeUser) {
    createButtonText = "Faça upgrade para criar mais livros!";
  }

  const userBooks = user.role === 'admin' ? books : books.filter(b => b.user_id === user.id);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <img src={logoUrl || '/logo.png'} alt="LIDIA Logo" className="h-10" />
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
                <p className="text-gray-600 mt-1">{creditsText}</p>
            </div>
            <Button 
                onClick={() => onNavigate('create-book')} 
                className="mt-4 md:mt-0 text-lg" 
                disabled={!canCreateBook}
                title={!canCreateBook ? "Você não tem créditos suficientes" : "Criar um novo livro"}
            >
              {createButtonText}
            </Button>
          </div>
        </Card>

        <div>
          <h3 className="text-2xl font-bold text-gray-700 mb-4">Seus Livros Criados</h3>
          {userBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userBooks.map(book => (
                <Card key={book.id} className="flex flex-col">
                    <BookIcon />
                  <h4 className="text-xl font-bold text-gray-800">{book.title}</h4>
                  <p className="text-gray-500 text-sm mt-1">{book.subtitle}</p>
                   <div className="flex justify-between items-center mt-2">
                        <p className="text-gray-500 text-xs">Criado em: {new Date(book.created_at).toLocaleDateString()}</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bookStatusClasses[book.status] || bookStatusClasses.content_ready}`}>
                            {formatBookStatus(book.status)}
                        </span>
                   </div>
                   <div className="mt-auto pt-4 flex space-x-2">
                       <Button onClick={() => onViewBook(book.id)} variant="secondary" className="w-full text-sm py-2">Visualizar e Gerar PDF</Button>
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