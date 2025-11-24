import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- LISTA DE MODELOS (ORDEM DE TENTATIVA) ---
// Removemos sufixos complexos, vamos no básico que funciona via REST
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

// --- HELPER: CONEXÃO HTTP DIRETA (SEM SDK) ---
const callGeminiDirect = async (prompt: string, logFunc: (m: string) => void): Promise<any> => {
    
    let lastErrorDetails = "";

    for (const model of MODELS) {
        // URL Oficial da API REST do Google
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

        // Corpo da requisição padrão REST
        const body = {
            contents: [{ parts: [{ text: prompt }] }]
            // Removemos 'generationConfig' com JSON mode para evitar erros de compatibilidade no modelo 'gemini-pro'
        };

        try {
            // logFunc(`[System] Tentando motor: ${model}...`);
            
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData.error?.message || response.statusText;
                
                // Se for 404, o modelo não existe pra essa chave, tenta o próximo
                if (response.status === 404) {
                    console.warn(`Modelo ${model} não encontrado (404). Tentando próximo.`);
                    lastErrorDetails = `404 - ${errorMessage}`;
                    continue; 
                }
                
                // Outros erros (400, 403, 500)
                throw new Error(`Erro API Google (${response.status}): ${errorMessage}`);
            }

            const data = await response.json();
            
            // Extração segura do texto
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) throw new Error("IA retornou resposta vazia.");

            // Limpeza manual de Markdown para garantir JSON válido
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            // Tenta converter para Objeto
            try {
                return JSON.parse(text);
            } catch (jsonError) {
                console.error("Erro ao fazer parse do JSON:", text);
                throw new Error("A IA gerou um texto que não é JSON válido.");
            }

        } catch (error: any) {
            console.warn(`Falha em ${model}:`, error.message);
            // Se for o último modelo, salva o erro para lançar
            if (model === MODELS[MODELS.length - 1]) {
                throw new Error(`Falha em todos os modelos. Último erro: ${error.message} || Detalhe anterior: ${lastErrorDetails}`);
            }
        }
    }
};

// --- PROMPTS ---

const buildOutlinePrompt = (formData: BookGenerationFormData) => `
  Atue como Editor Chefe.
  Livro: "${formData.title}" (${formData.niche}).
  Objetivo: ${formData.summary}.
  
  Crie uma estrutura JSON EXATAMENTE neste formato:
  {
    "optimized_title": "...",
    "optimized_subtitle": "...",
    "chapters": [
      { "chapter_number": 1, "title": "...", "subchapters_list": ["Sub 1", "Sub 2", "Sub 3"] }
    ]
  }
  Requisito: Exatamente 10 capítulos. Responda APENAS o JSON.
`;

const buildChapterPrompt = (title: string, subs: string[], ctx: string) => `
  Escreva o capítulo "${title}". Contexto: ${ctx}.
  Estrutura: Intro + 3 Subcapítulos (${subs.join(', ')}).
  
  Responda APENAS um JSON neste formato:
  {
    "title": "${title}",
    "introduction": "texto com \\n",
    "subchapters": [
      { "title": "...", "content": "texto longo com \\n" },
      { "title": "...", "content": "texto longo com \\n" },
      { "title": "...", "content": "texto longo com \\n" }
    ]
  }
`;

const buildSectionPrompt = (type: string, ctx: string) => `
  Escreva a ${type} (min 600 palavras). Contexto: ${ctx}.
  Responda APENAS um JSON neste formato:
  { "title": "${type}", "content": "texto com \\n" }
`;

// --- FUNÇÃO PRINCIPAL ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    updateLog("Inicializando Lidia SNT® Core (Direct Protocol)...");
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}`;

    // --- FASE 1: ESTRUTURA ---
    updateLog("Fase 1: Estrutura Editorial...");
    const outline = await callGeminiDirect(buildOutlinePrompt(formData), updateLog);
    
    updateLog(`Estrutura definida: ${outline.chapters?.length || 0} Capítulos.`);

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
    const introContent = await callGeminiDirect(buildSectionPrompt('Introdução', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });

    const tocList = outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n');
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify({ title: "Sumário", content: tocList }) });

    // --- FASE 3: LOOP ---
    updateLog("Iniciando Escrita Sequencial...");

    for (const chapter of outline.chapters) {
        const cNum = chapter.chapter_number;
        
        updateLog(`[SNT Core] Escrevendo Cap ${cNum}: "${chapter.title}"...`);
        
        try {
            const chapContent = await callGeminiDirect(buildChapterPrompt(chapter.title, chapter.subchapters_list, bookContext), updateLog);
            
            const finalContent = {
                title: chapContent.title || chapter.title,
                introduction: chapContent.introduction || "",
                subchapters: chapContent.subchapters || []
            };

            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: finalContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(finalContent) }
            ]);

            updateLog(`Capítulo ${cNum} salvo.`);
        } catch (err) {
            console.error(err);
            updateLog(`⚠️ Erro no Cap ${cNum}. Avançando...`);
        }
    }

    // --- FASE 4: CONCLUSÃO ---
    updateLog("Escrevendo Conclusão...");
    const conclContent = await callGeminiDirect(buildSectionPrompt('Conclusão', bookContext), updateLog);
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    updateLog("Finalizando...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Sucesso! Gerando PDF...");
    return newBook.id;
};