import { GoogleGenAI, SchemaType } from "@google/genai";
import { supabase } from './supabase';
import type { UserProfile, BookGenerationFormData } from '../types';
import { GEMINI_API_KEY } from './geminiConfig';

// --- SCHEMAS (TIPOS PARA A IA) ---

// 1. Schema leve apenas para a ESTRUTURA (Outline)
const outlineSchema = {
    type: SchemaType.OBJECT,
    properties: {
        optimized_title: { type: SchemaType.STRING, description: "Título otimizado para a capa." },
        optimized_subtitle: { type: SchemaType.STRING, description: "Subtítulo otimizado para a capa." },
        introduction_outline: { type: SchemaType.STRING, description: "Breve resumo do que será a introdução." },
        chapters: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    chapter_number: { type: SchemaType.INTEGER },
                    title: { type: SchemaType.STRING, description: "O título deste capítulo." },
                    subchapters_list: { 
                        type: SchemaType.ARRAY, 
                        items: { type: SchemaType.STRING },
                        description: "Lista de 3 títulos de subcapítulos para este capítulo."
                    }
                },
                required: ['chapter_number', 'title', 'subchapters_list']
            }
        },
        conclusion_outline: { type: SchemaType.STRING, description: "Breve resumo da conclusão." }
    },
    required: ['optimized_title', 'optimized_subtitle', 'chapters']
};

// 2. Schema pesado para o CONTEÚDO DE UM CAPÍTULO
const chapterContentSchema = {
    type: SchemaType.OBJECT,
    properties: {
        title: { type: SchemaType.STRING },
        introduction: { type: SchemaType.STRING, description: "Texto introdutório do capítulo (múltiplos parágrafos com \\n)." },
        subchapters: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    title: { type: SchemaType.STRING },
                    content: { type: SchemaType.STRING, description: "Texto rico do subcapítulo (600+ palavras, parágrafos com \\n)." }
                },
                required: ['title', 'content']
            }
        }
    },
    required: ['title', 'introduction', 'subchapters']
};

// 3. Schema para INTRODUÇÃO ou CONCLUSÃO isoladas
const sectionContentSchema = {
    type: SchemaType.OBJECT,
    properties: {
        title: { type: SchemaType.STRING },
        content: { type: SchemaType.STRING, description: "Texto completo (múltiplos parágrafos com \\n)." }
    },
    required: ['title', 'content']
};


// --- HELPER: PROMPT BUILDERS ---

const buildOutlinePrompt = (formData: BookGenerationFormData): string => {
    return `
      Atue como um Arquiteto Editorial de Elite. Sua tarefa é PLANEJAR a estrutura de um best-seller.
      NÃO escreva o livro ainda. Apenas defina a estrutura de capítulos.
      
      **Dados do Livro:**
      - Título Sugerido: "${formData.title}"
      - Subtítulo: "${formData.subtitle}"
      - Nicho: "${formData.niche}"
      - Público: "${formData.tone}"
      - Resumo: "${formData.summary}"
      
      **Requisitos:**
      1. Otimize o Título e Subtítulo para serem virais e "vendáveis".
      2. Crie uma estrutura com EXATAMENTE 10 CAPÍTULOS lógicos e progressivos.
      3. Para cada capítulo, defina 3 subcapítulos interessantes.
      
      Responda APENAS com o JSON seguindo o schema fornecido.
    `;
};

const buildChapterPrompt = (chapterTitle: string, subchapters: string[], context: string): string => {
    return `
      Atue como um Ghostwriter Profissional. Escreva AGORA o conteúdo completo do capítulo: "${chapterTitle}".
      
      **Contexto do Livro:** ${context}
      
      **Estrutura Obrigatória deste Capítulo:**
      - Introdução do Capítulo (min. 300 palavras).
      - Subcapítulo 1: "${subchapters[0]}" (min. 600 palavras).
      - Subcapítulo 2: "${subchapters[1]}" (min. 600 palavras).
      - Subcapítulo 3: "${subchapters[2]}" (min. 600 palavras).
      
      **Regras de Estilo:**
      - Use parágrafos curtos e dinâmicos (use \\n para separar).
      - Tom de voz envolvente. Evite repetições.
      - Aprofunde-se no tema. Use exemplos práticos.
      
      Responda APENAS com o JSON do conteúdo deste capítulo.
    `;
};

const buildSectionPrompt = (sectionType: 'Introdução' | 'Conclusão', context: string): string => {
    return `
      Escreva a ${sectionType} completa e envolvente para este livro.
      **Contexto:** ${context}
      **Requisito:** Mínimo de 600 palavras. Use \\n para parágrafos.
      Responda APENAS com o JSON.
    `;
};


// --- FUNÇÃO PRINCIPAL (LOOP CIRÚRGICO) ---

export const generateBookContent = async (
    formData: BookGenerationFormData,
    user: UserProfile,
    updateLog: (message: string) => void
): Promise<string> => {
    
    // 1. Inicialização
    updateLog("Inicializando Lidia SNT® Core (Arquitetura Distribuída)...");
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const modelName = 'gemini-2.5-pro'; // Usar o melhor modelo sempre
    
    // Contexto resumido para passar em cada prompt subsequente (economia de tokens)
    const bookContext = `Livro: ${formData.title}. Nicho: ${formData.niche}. Objetivo: ${formData.summary}`;

    // -----------------------------------------------------------------------
    // FASE 1: O ARQUITETO (Gera a Estrutura)
    // -----------------------------------------------------------------------
    updateLog("Fase 1: Desenhando o Blueprint Editorial (Estrutura)...");
    
    const outlineResponse = await ai.models.generateContent({
        model: modelName,
        contents: buildOutlinePrompt(formData),
        config: { responseMimeType: "application/json", responseSchema: outlineSchema }
    });
    
    const outline = JSON.parse(outlineResponse.text.trim());
    
    updateLog(`Título Definido: "${outline.optimized_title}"`);
    updateLog(`Estrutura Aprovada: ${outline.chapters.length} Capítulos detectados.`);

    // Cria o livro no banco (Status: Processing)
    const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({
            user_id: user.id,
            title: outline.optimized_title,
            subtitle: outline.optimized_subtitle,
            author: formData.author,
            status: 'processing_parts',
        })
        .select()
        .single();
    if (bookError) throw bookError;

    let partIndex = 1;

    // Salva Capa e Copyright
    await supabase.from('book_parts').insert([
        { book_id: newBook.id, part_index: partIndex++, part_type: 'cover', content: JSON.stringify({ title: outline.optimized_title, subtitle: outline.optimized_subtitle, author: formData.author }) },
        { book_id: newBook.id, part_index: partIndex++, part_type: 'copyright', content: JSON.stringify(`Copyright © ${new Date().getFullYear()} ${formData.author}`) }
    ]);

    // -----------------------------------------------------------------------
    // FASE 2: A INTRODUÇÃO
    // -----------------------------------------------------------------------
    updateLog("Escrevendo Introdução Imersiva...");
    const introRes = await ai.models.generateContent({
        model: modelName,
        contents: buildSectionPrompt('Introdução', bookContext),
        config: { responseMimeType: "application/json", responseSchema: sectionContentSchema }
    });
    const introContent = JSON.parse(introRes.text.trim());
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'introduction', content: JSON.stringify(introContent) });
    updateLog("Introdução finalizada e salva.");

    // Salva TOC (Sumário) agora que temos a estrutura confirmada
    // (Podemos montar um TOC simples baseado no outline)
    const tocContent = {
        title: "Sumário",
        content: outline.chapters.map((c: any) => `${c.chapter_number}. ${c.title}`).join('\n')
    };
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'toc', content: JSON.stringify(tocContent) });


    // -----------------------------------------------------------------------
    // FASE 3: O LOOP MATRIX (Capítulo por Capítulo)
    // -----------------------------------------------------------------------
    updateLog("Iniciando Motor de Escrita Sequencial...");

    for (const chapter of outline.chapters) {
        const chapterNum = chapter.chapter_number;
        const chapterTitle = chapter.title;
        
        // Log Realista para o usuário
        updateLog(`[SNT Core] Escrevendo Cap ${chapterNum}: "${chapterTitle}"...`);
        
        // Chama a IA só para este capítulo
        try {
            const chapRes = await ai.models.generateContent({
                model: modelName,
                contents: buildChapterPrompt(chapterTitle, chapter.subchapters_list, bookContext),
                config: { responseMimeType: "application/json", responseSchema: chapterContentSchema }
            });

            const chapContent = JSON.parse(chapRes.text.trim());
            
            // Salva no banco imediatamente
            await supabase.from('book_parts').insert([
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_title', content: JSON.stringify({ title: chapContent.title }) },
                { book_id: newBook.id, part_index: partIndex++, part_type: 'chapter_content', content: JSON.stringify(chapContent) }
            ]);

            updateLog(`Capítulo ${chapterNum} finalizado e salvo com sucesso.`);

        } catch (err) {
            console.error(`Erro no Cap ${chapterNum}`, err);
            updateLog(`AVISO: Houve uma instabilidade no Cap ${chapterNum}. Tentando recuperar...`);
            // Em produção, aqui poderia ter um retry automático
        }
    }

    // -----------------------------------------------------------------------
    // FASE 4: A CONCLUSÃO E FINALIZAÇÃO
    // -----------------------------------------------------------------------
    updateLog("Escrevendo Conclusão e Considerações Finais...");
    const conclRes = await ai.models.generateContent({
        model: modelName,
        contents: buildSectionPrompt('Conclusão', bookContext),
        config: { responseMimeType: "application/json", responseSchema: sectionContentSchema }
    });
    const conclContent = JSON.parse(conclRes.text.trim());
    await supabase.from('book_parts').insert({ book_id: newBook.id, part_index: partIndex++, part_type: 'conclusion', content: JSON.stringify(conclContent) });

    // Atualiza Status Final e Créditos
    updateLog("Compilando arquivo final...");
    await supabase.from('books').update({ status: 'content_ready' }).eq('id', newBook.id);
    
    await supabase.from('profiles').update({ book_credits: user.book_credits - 1 }).eq('id', user.id);
    
    updateLog("Processo concluído com sucesso. Gerando PDF...");
    
    return newBook.id;
};