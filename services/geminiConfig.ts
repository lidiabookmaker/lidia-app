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

export const GEMINI_API_KEY: string = "AIzaSyDmyns_NuZrgquEAC3VXTXJ_21CtCSjDww";

/**
 * Verifica se a chave da API foi alterada do valor placeholder.
 * O App.tsx usará isso para mostrar um erro de configuração se a chave não for fornecida.
 */
export const isGeminiConfigured = !GEMINI_API_KEY.includes('AIzaSyDmyns_NuZrgquEAC3VXTXJ_21CtCSjDww');