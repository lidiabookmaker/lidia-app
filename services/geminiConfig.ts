// Este arquivo gerenciava a configuração da chave de API do Google Gemini.
// A chave agora é gerenciada através de variáveis de ambiente (process.env.API_KEY)
// e este arquivo não é mais utilizado pela aplicação.

// =================================================================================
// ATENÇÃO: INSTRUÇÕES DE CONFIGURAÇÃO PARA O MVP
// =================================================================================
// 1. A chave da API do Gemini agora deve ser configurada como uma variável de
//    ambiente no seu ambiente de hospedagem (ex: Vercel).
// 2. A variável de ambiente deve se chamar `API_KEY`.
// =================================================================================


/**
 * @deprecated This constant is no longer used. The API key is sourced from process.env.API_KEY.
 */
export const GEMINI_API_KEY: string = "CHAVE_REMOVIDA_USE_VARIAVEL_DE_AMBIENTE";

/**
 * @deprecated This function is no longer used. Configuration is assumed via environment variables.
 */
export const isGeminiConfigured = false;
