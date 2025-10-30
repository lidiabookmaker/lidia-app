import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { isGeminiConfigured } from '../services/geminiConfig';
import { downloadAsPdf } from '../services/pdf-generator';
import type { UserProfile, Book, BookGenerationFormData, Page } from '../types';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';
import { coverBackgroundImage } from '../services/pdf-assets';


interface CreateBookPageProps {
  user: UserProfile;
  onBookCreated: (bookData: Omit<Book, 'id' | 'created_at'>, updatedCredits: number) => Promise<void>;
  onNavigate: (page: Page) => void;
  onBeforeGenerate: () => Promise<{ allow: boolean; message: string }>;
}

// --- Tipos para a nova estrutura do livro ---
interface SubChapter {
  title: string;
  content: string;
}
interface Chapter {
  title: string;
  introduction: string;
  subchapters: SubChapter[];
}
interface DetailedBookContent {
  introduction: { title: string; content: string };
  table_of_contents: { title: string; content: string; };
  chapters: Chapter[];
  conclusion: { title: string; content: string };
}
// --- Fim dos Tipos ---


const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
);


export const CreateBookPage: React.FC<CreateBookPageProps> = ({ user, onBookCreated, onNavigate, onBeforeGenerate }) => {
  const [formData, setFormData] = useState<BookGenerationFormData>({
    title: '',
    subtitle: '',
    author: user.email?.split('@')[0] || 'Autor',
    language: 'Português (Brasil)',
    tone: 'Inspirador e prático',
    niche: 'Desenvolvimento Pessoal',
    summary: '',
  });
  const [log, setLog] = useState<string[]>([]);
  const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const formatContentForHTML = (text: string, addIndent = true) => {
    return text.split('\n').filter(p => p.trim() !== '').map(p => `<p class="font-merriweather ${addIndent ? 'indent' : ''}">${p}</p>`).join('');
  }

  const generateBookHTML = (bookData: BookGenerationFormData, bookContent: DetailedBookContent): string => {
    const year = new Date().getFullYear();
    const pageBgColor = '#FAF3E0';
    
    const styles = `
      <style>
          @import url('https://fonts.googleapis.com/css2?family=League+Gothic&family=Merriweather:wght@400;700&family=Merriweather+Sans:wght@300;400;600;700&display=swap');
          
          body {
              font-family: 'Merriweather', serif;
              font-size: 11pt;
              color: #262626;
              margin: 0;
              background-color: #f0f0f0; /* Fundo cinza para a área fora das páginas */
          }
          .page-container {
               width: 14.8cm;
               min-height: 21cm;
               margin: 1cm auto;
               padding: 2cm;
               background: ${pageBgColor};
               box-shadow: 0 0 10px rgba(0,0,0,0.1);
               box-sizing: border-box;
           }
          
          /* --- Cover Page --- */
          .cover-page {
              padding: 2cm;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 21cm;
              width: 14.8cm;
              background-image: url('${coverBackgroundImage}');
              background-size: cover;
              background-position: center;
              color: #333;
              margin: 1cm auto;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              box-sizing: border-box;
          }
          .cover-page .title {
              font-family: 'League Gothic', sans-serif;
              font-size: 4.5rem;
              text-transform: uppercase;
              margin: 0;
              line-height: 1;
              color: #0d47a1;
          }
          .cover-page .subtitle {
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 1.125rem;
              margin: 1.5rem 0;
              color: #212121;
              font-style: italic;
          }
          .cover-page .author {
              font-family: 'Merriweather Sans', sans-serif;
              font-size: 1rem;
              font-weight: 400;
              margin-top: 5rem;
              color: #212121;
          }

          /* --- Copyright Page --- */
