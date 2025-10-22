
import { UserProfile, Book } from '../types';

export const mockUsers: UserProfile[] = [
  {
    id: '1',
    email: 'admin@lidia.com',
    status: 'ativa_pro',
    role: 'admin',
    book_credits: 999,
  },
  {
    id: '2',
    email: 'user@example.com',
    status: 'ativa_pro',
    role: 'user',
    book_credits: 8,
  },
  {
    id: '3',
    email: 'free@example.com',
    status: 'ativa_free',
    role: 'user',
    book_credits: 1,
  },
  {
    id: '4',
    email: 'suspended@example.com',
    status: 'suspensa',
    role: 'user',
    book_credits: 0,
  },
  {
    id: '5',
    email: 'usedfree@example.com',
    status: 'ativa_free',
    role: 'user',
    book_credits: 0,
    first_book_ip: '123.45.67.89'
  },
];

export const mockBooks: Book[] = [
  {
    id: 'b1',
    userId: '2',
    title: 'A Jornada do Herói Digital',
    subtitle: 'Conquistando o impossível no mundo online',
    author: 'user@example.com',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
   {
    id: 'b2',
    userId: '2',
    title: 'Receitas para o Sucesso',
    subtitle: 'Um guia culinário para empreendedores',
    author: 'user@example.com',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];