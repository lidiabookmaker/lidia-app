import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- LISTA DE MODELOS PARA TENTAR (ORDEM DE PREFERÊNCIA) ---
const GOOGLE_MODELS = [
    "gemini-1.5-flash-latest", // Tentativa 1: Versão mais recente
    "gemini-1.5-flash",        // Tentativa 2: Versão padrão
    "gemini-1.5-pro",          // Tentativa 3: Versão Pro
    "gemini-1.0-pro",          // Tentativa 4: Versão 1.0 Estável
    "gemini-pro"               // Tentativa 5: O Clássico (Legado, mas funciona)
];

// --- HELPER: CHAMADA MANUAL ROBUSTA (REST API) ---
const callGeminiRaw = async (prompt: string, logFunc: (msg: string) => void): Promise<any> => {
    
    let lastError: any;

    // Loop "Try-Catch" para tentar todos os modelos da lista
    for (const modelName of GOOGLE_MODELS) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                response_mime_type: "application/json" // Tenta forçar JSON
            }
        };

        try {
            // logFunc(`[DEBUG] Testando conexão com motor: ${modelName}...`);
            
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // Se der erro 404 ou 500, lança erro para o catch pegar e tentar o próximo
                const errorText = await response.text();
                throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!rawText) throw new Error("Resposta vazia da IA.");

            // Se chegou aqui, FUNCIONOU! Retorna e sai do loop.
            return JSON.parse(rawText);

        } catch (error: any) {
            // Apenas loga internamente e continua o loop
            console.warn(`Falha no modelo ${modelName}:`, error.message);
            lastError = error;
            // Não paramos o loop, o 'for' vai tentar o próximo modelo da lista
        }
    }

    // Se saiu do loop, é porque TODOS falharam
    throw new Error(`Todos os modelos falharam. Verifique sua API Key. Último erro: ${lastError?.message}`);
};

// --- PROMPTS ---

const buildOutlinePrompt = (formData: BookGenerationFormData): string => {
    return `
      Atue como um Arquiteto Editorial. Planeje a estrutura de um livro.
      Dados: Título="${formData.title}", Nicho="${formData.niche}", Público="${formData.tone}", Resumo="${formData.summary}".
      
      Responda EXCLUSIVAMENTE com este JSON:
      {
        "optimized_title": "Título Otimizado",
        "optimized_subtitle": "Subtítulo",
        "chapters": [
           { "chapter_number": 1, "title": "Nome do Cap", "subchapters_list": ["Sub 1", "Sub 2", "Sub 3"] },
           ... (total 10 capítulos)
        ]
      }
    `;
};

const buildChapterPrompt = (chapterTitle: string, subchapters: string[], context: string): string => {
    return `
      Escreva o capítulo: "${chapterTitle}".
      Contexto: ${context}
      
      Responda EXCLUSIVAMENTE com este JSON:
      {
        "title": "${chapterTitle}",
        "introduction": "Texto da introdução com parágrafos separados por \\n (min 300 palavras)",
        "subchapters": [
           { "title": "${subchapters[0]}", "content": "Texto completo com \\n (min 600 palavras)" },
           { "title": "${subchapters[1]}", "content": "Texto completo com \\n (min 600 palavras)" },
           { "title": "${subchapters[2]}", "content": "Texto completo com \\n (min 600 palavras)" }
        ]
      }
    `;
};

const buildSectionPrompt = (sectionType: string, context: string): string => {
    return `
      Escreva a ${sectionType}. Contexto: ${context}.
      Responda EXCLUSIVAMENTE com este JSON:
      {
        "title": "${sectionType}",
        "content": "Texto completo da seção com parágrafos separados por \\n (min 600 palavras)"
      }
    `;
};


// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core (Auto-Scaling Mode)...");
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}. Objetivo: ${formData.summary}`;

    // --- FASE 1: ESTRUTURA ---
    updateLog("Fase 1: Blueprint Editorial...");
    
    const outline = await callGeminiRaw(buildOutlinePrompt(formData), updateLog);
    
    const title = outline.optimized_title || formData.title;
    const chapters = outline.chapters || [];

    updateLog(`Estrutura definida: ${chapters.length} Capítulos.`);

    // Cria Livro no Banco
    const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({
            user_id: user.id,
            title: title,
            subtitle: outline.optimized_subtitle || formData.subtitle,
            author: formData.author,
            status: 'processing_parts',
        })
        .select()
        .single();
    
    if (bookError) throw bookError;

    let partIndex = 1;
    await supabase.from('book_parts').insert([
        { book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title, subtitle: outline.optimized_subtitle, author: formData.author }) },
        { book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) }
    ]);

    // --- FASE 2: INTRODUÇÃO ---
    updateLog("Escrevendo Introdução...");
    const introContent = await callGeminiRaw(buildSectionPrompt('Introdução', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    // Salva TOC
    const tocContent = { title: "Sumário", content: chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n') };
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(tocContent) });

    // --- FASE 3: LOOP MATRIX ---
    updateLog("Iniciando Motor de Escrita Sequencial...");

    for (const chapter of chapters) {
        const chapterNum = chapter.chapter_number || 1;
        const chapterTitle = chapter.title || "Capítulo";
        const subchapters = chapter.subchapters_list || ["Parte 1", "Parte 2", "Parte 3"];

        updateLog(`[SNT Core] Escrevendo Cap ${chapterNum}: "${chapterTitle}"...`);
        
        try {
            const chapContent = await callGeminiRaw(
                buildChapterPrompt(chapterTitle, subchapters, bookContext), 
                updateLog
            );

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: chapContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(chapContent) }
            ]);

            updateLog(`Capítulo ${chapterNum} salvo.`);

        } catch (err) {
            console.error(`Erro cap ${chapterNum}`, err);
            updateLog(`Aviso: Instabilidade no Cap ${chapterNum}. Pulando...`);
        }
    }

    // --- FASE 4: CONCLUSÃO ---
    updateLog("Escrevendo Conclusão...");
    const conclContent = await callGeminiRaw(buildSectionPrompt('Conclusão', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Finalizando...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Sucesso! Gerando PDF...");
    
    return newBook.id;
};