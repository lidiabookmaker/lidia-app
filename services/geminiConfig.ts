// Este arquivo gerencia a configuração da chave de API do Google Gemini.

// =================================================================================
// ATENÇÃO: INSTRUÇÕES DE CONFIGURAÇÃO PARA O MVP
// =================================================================================
// 1. Obtenha sua chave de API no Google AI Studio.
// 2. Cole a chave na constante GEMINI_API_KEY abaixo.
// =================================================================================

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ALERTA DE SEGURANÇA: Não envie este arquivo para um repositório público com as
// chaves preenchidas. Esta abordagem é APENAS para a fase de validação inicial.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// FIX: Added string type annotation to widen the type from a literal to a string.
// This resolves the TypeScript error where a comparison between the literal key and an empty string was flagged as impossible.
export const GEMINI_API_KEY: string = "AIzaSyDmyns_NuZrgquEAC3VXTXJ_21CtCSjDww";

/**
 * Verifica se a chave da API do Gemini foi configurada.
 * A verificação é feita para garantir que a chave padrão não seja usada.
 */
export const isGeminiConfigured = !(GEMINI_API_KEY.includes('COLE_AQUI') || GEMINI_API_KEY === '');
