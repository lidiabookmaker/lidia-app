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


// FIX: Reverted to a hardcoded key placeholder for the pre-MVP testing phase.
// export const GEMINI_API_KEY: string = "AIzaSyCyh43BgOsfCijaBuKIhxHrdEnZhwWON1Q";

// SUA CHAVE DO GOOGLE (Já está aí, não mexa se estiver funcionando)
export const GEMINI_API_KEY: string = "AIzaSyCyh43BgOsfCijaBuKIhxHrdEnZhwWON1Q";

// --- NOVO: Adicione sua chave da OpenAI aqui ---
// Cole a chave sk-proj-... dentro das aspas abaixo
export const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";

// ... (verificação isGeminiConfigured continua igual) ...
export const isGeminiConfigured = !GEMINI_API_KEY.includes('COLE_AQUI');

/**
 * Verifica se a chave da API foi alterada do valor placeholder.
 * O App.tsx usará isso para mostrar um erro de configuração se a chave não for fornecida.
 */
// FIX: Re-enabled the configuration check for the pre-MVP phase.
// export const isGeminiConfigured = !GEMINI_API_KEY.includes('COLE_AQUI');