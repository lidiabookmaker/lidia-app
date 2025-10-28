
export type UserStatus = 'ativa_pro' | 'ativa_free' | 'suspensa' | 'aguardando_ativacao';
export type UserRole = 'user' | 'admin';
// FIX: Added 'loading' to the Page type to handle the loading state after authentication.
export type Page = 'landing' | 'login' | 'suspended-account' | 'dashboard' | 'create-book' | 'admin-users' | 'admin-settings' | 'view-book' | 'admin-activation' | 'awaiting-activation' | 'loading';

export interface UserProfile {
  id: string;
  email?: string; // Email is on the auth.users table, might not be joined
  status: UserStatus;
  role: UserRole;
  book_credits: number;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  subtitle: string;
  author: string;
  created_at: string;
  generated_content?: string;
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