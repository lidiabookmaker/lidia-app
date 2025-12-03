// geminiconfig.ts
// Este arquivo gerencia a configuração da API de forma segura.

// Tenta ler a chave das variáveis de ambiente.
// O "process.env" ou "import.meta.env" busca a chave fora do código fonte.
// Adicionei suporte para os prefixos mais comuns (Vite e React App).
export const GEMINI_API_KEY = 
  process.env.GEMINI_API_KEY || 
  process.env.REACT_APP_GEMINI_API_KEY || 
  (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || 
  "";

/**
 * Verifica se a chave foi carregada corretamente pelo ambiente.
 */
export const isGeminiConfigured = GEMINI_API_KEY.length > 0;
// Atualizando Vercel
