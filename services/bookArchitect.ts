import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_API_KEY } from './geminiConfig';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- SCHEMA HIERÁRQUICO COM CONCLUSÃO ---
const structureSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Título comercial e chamativo" },
    subtitle: { type: Type.STRING, description: "Subtítulo com a promessa do livro" },
    niche: { type: Type.STRING, description: "O nicho de mercado" },
    summary: { type: Type.STRING, description: "Resumo da alma do livro (sinopse)" },
    target_audience: { type: Type.STRING, description: "Público-alvo detalhado" },
    
    chapters_structure: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chapter_title: { type: Type.STRING, description: "Título criativo do capítulo" },
          subchapters: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING, description: "Título do subcapítulo (gatilho mental)" }
          }
        },
        required: ["chapter_title", "subchapters"]
      }
    },
    // Adicionamos a estrutura obrigatória da conclusão
    conclusion_structure: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Título criativo para o encerramento (NÃO use apenas 'Conclusão')" },
        key_message: { type: Type.STRING, description: "A mensagem final ou chamada para ação (Call to Action)" }
      },
      required: ["title", "key_message"]
    }
  },
  required: ["title", "subtitle", "niche", "summary", "target_audience", "chapters_structure", "conclusion_structure"]
};

export interface BookStructure {
  title: string;
  subtitle: string;
  niche: string;
  summary: string;
  target_audience: string;
  structure: string;
}

export const generateBookStructure = async (
  mode: 'idea' | 'surprise',
  topicInput?: string
): Promise<BookStructure> => {
  
  let userInstruction = "";
  if (mode === 'idea') {
    userInstruction = `O usuário deseja escrever sobre: "${topicInput}".`;
  } else {
    userInstruction = "O usuário NÃO tem ideia. Escolha um nicho de alta demanda e crie um best-seller.";
  }

  const prompt = `
    Atue como um Editor Chefe de Best-Sellers.
    ${userInstruction}
    
    Sua tarefa é criar a ESTRUTURA ESTRATÉGICA COMPLETA (Outline) para este livro.
    
    REGRAS DE OURO:
    1. Idioma: Português (Brasil).
    2. Estrutura: Exatamente 10 Capítulos + 1 Conclusão.
    3. Profundidade: Cada capítulo DEVE ter exatamente 3 Subcapítulos.
    4. Conclusão: Deve ter um título criativo e inspirador (Ex: "O Início da Sua Jornada" ao invés de "Fim").
    
    Preencha o JSON estritamente.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: structureSchema
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou texto.");

    const json = JSON.parse(text);

    // --- FORMATADOR VISUAL (Agora com Conclusão) ---
    let formattedText = `SINOPSE:\n${json.summary}\n\n`;
    formattedText += `PÚBLICO-ALVO:\n${json.target_audience}\n\n`;
    formattedText += `=== ESTRUTURA DETALHADA DO LIVRO ===\n`;

    // Capítulos
    json.chapters_structure.forEach((cap: any, index: number) => {
      formattedText += `\nCapítulo ${index + 1}: ${cap.chapter_title}\n`;
      if (cap.subchapters && Array.isArray(cap.subchapters)) {
        cap.subchapters.forEach((sub: string) => {
          formattedText += `   - ${sub}\n`;
        });
      }
    });

    // Conclusão
    formattedText += `\n=== ENCERRAMENTO ===\n`;
    formattedText += `Título da Conclusão: ${json.conclusion_structure.title}\n`;
    formattedText += `Mensagem Final: ${json.conclusion_structure.key_message}\n`;

    return {
      title: json.title,
      subtitle: json.subtitle,
      niche: json.niche,
      summary: json.summary,
      target_audience: json.target_audience,
      structure: formattedText 
    };

  } catch (error) {
    console.error("Erro no bookArchitect:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro na IA: ${errorMessage}`);
  }
};