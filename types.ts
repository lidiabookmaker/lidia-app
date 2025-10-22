
export type UserStatus = 'ativa' | 'pendente' | 'suspensa';
export type UserRole = 'user' | 'admin';
export type Page = 'landing' | 'login' | 'awaiting-activation' | 'dashboard' | 'create-book' | 'admin-users' | 'admin-settings';

export interface UserProfile {
  id: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  book_credits: number;
}

export interface Book {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  author: string;
  createdAt: string;
  generatedContent?: string;
}

export interface BookGenerationFormData {
    title: string;
    subtitle:string;
    author: string;
    language: string;
    tone: string;
    niche: string;
    summary: string;
}
   