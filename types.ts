

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

export type BookStatus = 'generating_content' | 'content_ready' | 'processing_parts' | 'assembling_pdf' | 'ready' | 'error';

export interface Book {
  id: string;
  user_id: string;
  title: string;
  subtitle: string;
  author: string;
  created_at: string;
  content?: string; // This will now hold the full HTML for viewing/editing
  status: BookStatus;
  pdf_final_url?: string | null;
}

export interface BookPart {
    id: string;
    book_id: string;
    part_index: number;
    part_name: string;
    html_content: string;
    pdf_url?: string | null;
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