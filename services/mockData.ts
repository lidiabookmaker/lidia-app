
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
  },
  {
    id: '6',
    email: 'pending@example.com',
    status: 'aguardando_ativacao',
    role: 'user',
    book_credits: 0,
  },
];

export const mockBooks: Book[] = [
  {
    id: 'b1',
    // FIX: Changed 'userId' to 'user_id' to match the 'Book' type definition.
    user_id: '2',
    title: 'A Jornada do Herói Digital',
    subtitle: 'Conquistando o impossível no mundo online',
    author: 'user@example.com',
    // FIX: Changed 'createdAt' to 'created_at' to match the 'Book' type definition.
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    // FIX: Added missing 'status' property to match the 'Book' type.
    status: 'ready',
  },
   {
    id: 'b2',
    // FIX: Changed 'userId' to 'user_id' to match the 'Book' type definition.
    user_id: '2',
    title: 'Receitas para o Sucesso',
    subtitle: 'Um guia culinário para empreendedores',
    author: 'user@example.com',
    // FIX: Changed 'createdAt' to 'created_at' to match the 'Book' type definition.
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    // FIX: Added missing 'status' property to match the 'Book' type.
    status: 'ready',
  },
];