// services/geminiConfig.ts

// Agora o código busca a chave nas configurações do Vercel/Vite
// Nenhuma chave real fica escrita aqui!
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

// Verifica se a chave existe (tem mais de 10 caracteres)
export const isGeminiConfigured = GEMINI_API_KEY.length > 10;

// Se quiser usar OpenAI no futuro, deixe preparado (mas vazio por enquanto)
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";