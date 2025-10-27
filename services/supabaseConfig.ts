// Este arquivo armazena as credenciais de conexão do Supabase.
// O ambiente de produção (Vercel) fornece as variáveis através do objeto `process.env`.
// As variáveis devem ser nomeadas SEM o prefixo "VITE_".

const env = (typeof process !== 'undefined') ? process.env : {};

export const SUPABASE_URL = env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
