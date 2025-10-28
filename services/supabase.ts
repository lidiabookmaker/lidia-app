import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig';

// Verifica se as credenciais ainda são placeholders.
export const isSupabaseConfigured = !(SUPABASE_URL.includes('COLE_AQUI') || SUPABASE_ANON_KEY.includes('COLE_AQUI'));

// Exporta o client. App.tsx é responsável por prevenir o seu uso se não estiver configurado.
// A criação do client em si é leve e não causa problemas de rede imediatos.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);