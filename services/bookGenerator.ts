import { GoogleGenAI, SchemaType } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- CONFIGURAÇÃO ---
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// --- PROMPTS ---
const buildOutlinePrompt = (formData: BookGenerationFormData) => `
  Atue como Editor Chefe. Crie o planejamento de um livro.
  Dados: Título="${formData.title}", Nicho="${formData.niche}", Tom="${formData.tone}", Objetivo="${formData.summary}".
  
  FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
  {
    "optimized_title": "Texto",
    "optimized_subtitle": "Texto",
    "chapters": [
      { "chapter_number": 1, "title": "Texto", "subchapters_list": ["Sub 1", "Sub 2", "Sub 3"] }
    ]
  }
  Requisitos: EXATAMENTE 10 Capítulos. Responda APENAS O JSON. Sem markdown.
`;

const buildChapterPrompt = (title: string, subs: string[], ctx: string) => `
  Escreva o capítulo "${title}". Contexto: ${ctx}.
  Estrutura: Intro + 3 Subcapítulos (${subs.join(', ')}).
  
  FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
  {
    "title": "${title}",
    "introduction": "Texto com \\n",
    "subchapters": [
      { "title": "Sub 1", "content": "Texto longo com \\n" },
      { "title": "Sub 2", "content": "Texto longo com \\n" },
      { "title": "Sub 3", "content": "Texto longo com \\n" }
    ]
  }
  Responda APENAS O JSON. Sem markdown.
`;

const buildSectionPrompt = (type: string, ctx: string) => `
  Escreva a ${type}. Contexto: ${ctx}.
  FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
  { "title": "${type}", "content": "Texto longo com \\n" }
  Responda APENAS O JSON.
`;

// --- HELPER: GERADOR INTELIGENTE (COM FALLBACK) ---
async function generateJSON(prompt: string, logFunc: (m: string) => void) {
    // TENTATIVA 1: Modelo Flash Moderno (Com Schema Strict)
    try {
        // logFunc("[Debug] Tentando Engine v1.5 Flash...");
        const res = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" } // Tenta forçar JSON nativo
        });
        return JSON.parse(res.text());
    } catch (e: any) {
        // Se der 404, ignora e tenta o próximo
        // logFunc(`[Debug] Engine v1.5 falhou (${e.message}). Alternando para Legado...`);
    }

    // TENTATIVA 2: Modelo Pro Clássico (Sem Schema, Apenas Texto)
    // Esse é o que funcionava antes para você!
    try {
        const res = await ai.models.generateContent({
            model: "gemini-pro", // Versão 1.0 estável
            contents: prompt
            // SEM config de JSON aqui, pois o gemini-pro não suporta
        });
        
        let text = res.text();
        // Limpeza manual do JSON (caso venha com ```json ... ```)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (finalError: any) {
        throw new Error(`Falha Total na IA: ${finalError.message}`);
    }
}

// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core...");
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}`;

    // --- FASE 1: ESTRUTURA ---
    updateLog("Fase 1: Criando Estrutura (Blueprint)...");
    
    // Gera estrutura usando o helper inteligente
    const outline = await generateJSON(buildOutlinePrompt(formData), updateLog);

    // Validação básica se o JSON veio certo
    if (!outline.chapters || outline.chapters.length === 0) {
        throw new Error("A IA gerou uma estrutura inválida. Tente novamente.");
    }

    updateLog(`Estrutura definida: ${outline.chapters.length} Capítulos.`);

    // Salva no Banco
    const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({
            user_id: user.id,
            title: outline.optimized_title || formData.title,
            subtitle: outline.optimized_subtitle || formData.subtitle,
            author: formData.author,
            status: 'processing_parts',
        })
        .select()
        .single();
    if (bookError) throw bookError;

    let partIndex = 1;
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: newBook.title, subtitle: newBook.subtitle, author: formData.author }) });

    // --- FASE 2: INTRODUÇÃO ---
    updateLog("Escrevendo Introdução...");
    const introContent = await generateJSON(buildSectionPrompt('Introdução', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    // Salva TOC
    const tocList = outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n');
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify({ title: "Sumário", content: tocList }) });

    // --- FASE 3: LOOP MATRIX (Capítulo a Capítulo) ---
    updateLog("Iniciando Escrita Sequencial...");

    for (const chapter of outline.chapters) {
        const cNum = chapter.chapter_number;
        const cTitle = chapter.title;
        const cSubs = chapter.subchapters_list || [];

        updateLog(`[SNT Core] Escrevendo Cap ${cNum}: "${cTitle}"...`);
        
        try {
            const chapContent = await generateJSON(buildChapterPrompt(cTitle, cSubs, bookContext), updateLog);
            
            // Normaliza dados caso a IA varie o nome das chaves
            const finalContent = {
                title: chapContent.title || cTitle,
                introduction: chapContent.introduction || "",
                subchapters: chapContent.subchapters || []
            };

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: finalContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(finalContent) }
            ]);

            updateLog(`Capítulo ${cNum} salvo.`);

        } catch (err) {
            console.error(`Erro cap ${cNum}`, err);
            updateLog(`⚠️ Erro no Cap ${cNum}. O sistema continuará.`);
        }
    }

    // --- FASE 4: CONCLUSÃO ---
    updateLog("Escrevendo Conclusão...");
    const conclContent = await generateJSON(buildSectionPrompt('Conclusão', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Finalizando...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Sucesso! Livro gerado.");
    return newBook.id;
};