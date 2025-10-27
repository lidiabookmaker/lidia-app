// Este arquivo armazena as credenciais de conexão do Supabase.
// O ambiente de produção (Vercel) fornece as variáveis através do objeto `process.env`.
// As variáveis devem ser nomeadas SEM o prefixo "VITE_".

const env = (typeof process !== 'undefined') ? process.env : {};

// Valores de fallback para evitar que o aplicativo quebre se as variáveis de ambiente não estiverem definidas.
// O aplicativo não se conectará ao Supabase, mas pelo menos será carregado.
const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SUPABASE_URL = env.SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.warn(`
    *****************************************************************
    * AVISO: Credenciais do Supabase não configuradas!               *
    *                                                               *
    * As variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY     *
    * não foram encontradas. O aplicativo não conseguirá se         *
    * conectar ao banco de dados.                                   *
    *                                                               *
    * Por favor, configure estas variáveis no seu ambiente.         *
    *****************************************************************
    `);
}
