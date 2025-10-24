
export type UserStatus = 'ativa_pro' | 'ativa_free' | 'suspensa';
export type UserRole = 'user' | 'admin';
export type Page = 'landing' | 'login' | 'suspended-account' | 'dashboard' | 'create-book' | 'admin-users' | 'admin-settings' | 'view-book';

export interface UserProfile {
  id: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  book_credits: number;
  first_book_ip?: string | null;
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