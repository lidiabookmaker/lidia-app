// Este arquivo armazena as credenciais de conexão do Supabase.
// As credenciais são lidas de variáveis de ambiente prefixadas com VITE_
// para serem expostas de forma segura ao frontend pela ferramenta de build Vite.

// The execution environment provides environment variables via `process.env`.
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;