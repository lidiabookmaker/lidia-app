// Este arquivo armazena as credenciais de conexão do Google Gemini.
// Para a validação do MVP, você pode colar sua chave diretamente aqui.

// =================================================================================
// ATENÇÃO: INSTRUÇÕES DE CONFIGURAÇÃO PARA O MVP
// =================================================================================
// 1. Obtenha sua chave de API no Google AI Studio.
// 2. Cole a chave na constante GEMINI_API_KEY abaixo, substituindo "COLE_AQUI_SUA_CHAVE_API_DO_GEMINI".
// =================================================================================

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ALERTA DE SEGURANÇA: Não envie este arquivo para um repositório público com as
// chaves preenchidas. Esta abordagem é APENAS para a fase de validação inicial.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// geminiConfig.ts

// Placeholder apenas para referência no MVP
const PLACEHOLDER = "AIzaSyCyh43BgOsfCijaBuKIhxHrdEnZhwWON1Q";

// 1) Tenta pegar do ambiente (Vercel)
// 2) Se não houver, cai no placeholder
export const GEMINI_API_KEY: string =
  import.meta.env.VITE_API_KEY || PLACEHOLDER;

// Verifica se não estamos usando o placeholder
export const isGeminiConfigured =
  GEMINI_API_KEY !== PLACEHOLDER && GEMINI_API_KEY.trim() !== "";
