


export type UserStatus = 'ativa_pro' | 'ativa_free' | 'suspensa' | 'aguardando_ativacao' | 'ativa_starter' | 'ativa_premium';
export type UserRole = 'user' | 'admin';
export type Page = 'landing' | 'login' | 'suspended-account' | 'dashboard' | 'create-book' | 'admin-users' | 'admin-settings' | 'view-book' | 'admin-activation' | 'loading' | 'awaiting-activation';

export interface UserProfile {
  id: string;
  email?: string; // Email is on the auth.users table, might not be joined
  status: UserStatus;
  role: UserRole;
  book_credits: number;
}

// FIX: Added 'processing_parts' to the BookStatus type to accommodate all possible book states from the backend and fix type errors in DashboardPage.
export type BookStatus = 'generating_content' | 'content_ready' | 'processing_parts' | 'generating_pdf' | 'ready' | 'error';

export interface Book {
  id: string;
  user_id: string;
  title: string;
  subtitle: string;
  author: string;
  created_at: string;
  content?: string | null; // This is now legacy or for caching, the source of truth is book_parts
  status: BookStatus;
  pdf_final_url?: string | null;
}

export interface BookPart {
    id: string;
    book_id: string;
    part_index: number;
    part_type: string; // e.g., 'cover', 'copyright', 'chapter_title', 'chapter_content'
    content: string; // Can be simple text from AI or generated HTML
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

export interface PlanSetting {
    plan_id: UserStatus;
    plan_name: string;
    book_credits: number;
}