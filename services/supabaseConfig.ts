// Este arquivo armazena as credenciais de conexão do Supabase.
// No Vite, as variáveis de ambiente expostas ao cliente DEVEM começar com "VITE_".
// Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu ambiente (Vercel).

// Valores de fallback para evitar que o aplicativo quebre se as variáveis de ambiente não estiverem definidas.
// O aplicativo não se conectará ao Supabase, mas pelo menos será carregado.
const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// fix: Replaced import.meta.env with process.env to resolve TypeScript errors.
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
// fix: Replaced import.meta.env with process.env to resolve TypeScript errors.
export const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

// fix: Replaced import.meta.env with process.env to resolve TypeScript errors.
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.warn(`
    *****************************************************************
    * AVISO: Credenciais do Supabase não configuradas!               *
    *                                                               *
    * As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY *
    * não foram encontradas. O aplicativo não conseguirá se         *
    * conectar ao banco de dados.                                   *
    *                                                               *
    * Por favor, configure estas variáveis no seu ambiente (Vercel).  *
    *****************************************************************
    `);
}