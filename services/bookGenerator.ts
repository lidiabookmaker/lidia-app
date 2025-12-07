import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- HELPER: LIMPEZA DE JSON ---
// O Gemini Pro manda markdown (```json), então precisamos limpar na mão
const cleanAndParseJSON = (text: string): any => {
    // 1. Remove crases de markdown
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // 2. Tenta encontrar o bloco JSON válido
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');
    
    if (first !== -1 && last !== -1) {
        clean = clean.substring(first, last + 1);
    }

    try {
        return JSON.parse(clean);
    } catch (e) {
        console.error("Texto inválido recebido da IA:", text);
        throw new Error("A IA gerou um texto que não é JSON válido.");
    }
};

// --- PROMPT GIGANTE (MONÓLITO) ---
const buildPrompt = (formData: BookGenerationFormData): string => {
    return `
      Atue como um escritor profissional. Crie um livro COMPLETO agora.
      
      Dados do Livro:
      - Título: "${formData.title}"
      - Subtítulo: "${formData.subtitle}"
      - Nicho: "${formData.niche}"
      - Autor: "${formData.author}"
      - Resumo: "${formData.summary}"
      - Tom: "${formData.tone}"
      
      REGRAS ESTRUTURAIS:
      1. Crie Título e Subtítulo otimizados.
      2. Crie uma Introdução completa.
      3. Crie EXATAMENTE 10 Capítulos.
      4. Cada Capítulo deve ter Intro + 3 Subcapítulos.
      5. Crie uma Conclusão completa.
      
      REGRAS DE CONTEÚDO:
      - Texto fluído, parágrafos bem divididos com \\n.
      - Mínimo de 600 palavras por subcapítulo.
      
      FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
      Responda APENAS com este JSON exato, sem nada antes ou depois:
      {
        "optimized_title": "...",
        "optimized_subtitle": "...",
        "introduction": { "title": "Introdução", "content": "..." },
        "table_of_contents": { "title": "Sumário", "content": "..." },
        "chapters": [
            {
                "title": "...",
                "introduction": "...",
                "subchapters": [
                    { "title": "...", "content": "..." },
                    { "title": "...", "content": "..." },
                    { "title": "...", "content": "..." }
                ]
            }
        ],
        "conclusion": { "title": "Conclusão", "content": "..." }
      }
    `;
};

// --- FUNÇÃO PRINCIPAL ---
export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia AI (Classic Mode)...");
    
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    try {
        // Usamos 'gemini-pro' que é o modelo mais compatível
        const modelName = 'gemini-1.5-flash-002'; 

        updateLog(`Enviando prompt mestre para o modelo ${modelName}...`);
        updateLog("Aguarde... Escrevendo o livro inteiro (isso pode levar 2-5 minutos)...");

        const result = await ai.models.generateContent({
            model: modelName,
            contents: buildPrompt(formData)
            // IMPORTANTE: Removemos 'config' com schemas, pois o gemini-pro não suporta
        });

        const responseText = result.text();
        if (!responseText) throw new Error("Resposta vazia da IA");

        updateLog("Resposta recebida! Processando JSON...");
        
        // Limpeza manual (Back to basics)
        const bookContent = cleanAndParseJSON(responseText);

        // --- SALVAMENTO ---
        updateLog("Salvando no banco de dados...");

        const { data: newBook, error: bookError } = await supabase
            .from('books')
            .insert({
                user_id: user.id,
                title: bookContent.optimized_title || formData.title,
                subtitle: bookContent.optimized_subtitle || formData.subtitle,
                author: formData.author,
                status: 'processing_parts',
            })
            .select()
            .single();
    
        if (bookError) throw bookError;

        let partIndex = 1;
        const partsToInsert: any[] = [];

        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: newBook.title, subtitle: newBook.subtitle, author: formData.author }) });
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) });
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(bookContent.table_of_contents) });
        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(bookContent.introduction) });

        if (bookContent.chapters && Array.isArray(bookContent.chapters)) {
            bookContent.chapters.forEach((chapter: any) => {
                partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: chapter.title }) });
                partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(chapter) });
            });
        }

        partsToInsert.push({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(bookContent.conclusion) });

        const { error: partsError } = await supabase.from('book_parts').insert(partsToInsert);
        if (partsError) throw partsError;

        await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
        await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);

        updateLog("Sucesso! Livro gerado.");
        return newBook.id;

    } catch (error: any) {
        // Se der 404 aqui, é realmente a chave
        if (error.message && error.message.includes("404")) {
            updateLog("ERRO CRÍTICO DE API KEY: O Google não encontrou o modelo 'gemini-pro' para sua chave.");
        }
        console.error("Erro na geração:", error);
        throw error;
    }
};
