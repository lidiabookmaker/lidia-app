// Este arquivo armazena as credenciais de conexão do Gemini.
// Configure API_KEY no seu ambiente (Vercel).

// Valor de fallback para evitar que o aplicativo quebre se a variável de ambiente não estiver definida.
// O aplicativo não conseguirá chamar a API do Gemini, mas pelo menos será carregado.
const FALLBACK_API_KEY = "API_KEY_NOT_SET";

// fix: Switched to process.env.API_KEY to align with Gemini SDK guidelines and resolve TypeScript errors.
export const API_KEY = process.env.API_KEY || FALLBACK_API_KEY;

// fix: Switched to process.env.API_KEY to align with Gemini SDK guidelines and resolve TypeScript errors.
if (!process.env.API_KEY) {
    console.warn(`
    *****************************************************************
    * AVISO: Chave de API do Gemini não configurada!                  *
    *                                                               *
    * A variável de ambiente API_KEY não foi encontrada.            *
    * A geração de livros pela IA não funcionará.                   *
    *                                                               *
    * Por favor, configure esta variável no seu ambiente (Vercel).  *
    *****************************************************************
    `);
}