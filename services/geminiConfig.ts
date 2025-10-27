// Este arquivo armazena as credenciais de conexão do Gemini.
// O ambiente de produção (Vercel) fornece as variáveis através do objeto `process.env`.
// A variável deve ser nomeada API_KEY.

const env = (typeof process !== 'undefined') ? process.env : {};

// Valor de fallback para evitar que o aplicativo quebre se a variável de ambiente não estiver definida.
// O aplicativo não conseguirá chamar a API do Gemini, mas pelo menos será carregado.
const FALLBACK_API_KEY = "API_KEY_NOT_SET";

export const API_KEY = env.API_KEY || FALLBACK_API_KEY;

if (!env.API_KEY) {
    console.warn(`
    *****************************************************************
    * AVISO: Chave de API do Gemini não configurada!                  *
    *                                                               *
    * A variável de ambiente API_KEY não foi encontrada.            *
    * A geração de livros pela IA não funcionará.                   *
    *                                                               *
    * Por favor, configure esta variável no seu ambiente.         *
    *****************************************************************
    `);
}
