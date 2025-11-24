import React, { useEffect, useState } from 'react';
import { BookOpen, Cpu, Sparkles } from 'lucide-react'; // Ícones para dar vida
interface ProgressScreenProps {
logs: string[]; // Recebe a lista de logs do backend
}
export const ProgressScreen: React.FC<ProgressScreenProps> = ({ logs }) => {
// Pega o último log para mostrar o status atual
const currentLogRaw = logs.length > 0 ? logs[logs.length - 1] : "Iniciando conexão com o núcleo...";
// Remove o timestamp [13:04:19] se existir, para ficar mais limpo
const currentMessage = currentLogRaw.replace(/^[.?]\s/, '').trim();
// Estado para a barra de progresso "fake" que reseta a cada nova mensagem
const [progress, setProgress] = useState(0);
// Efeito: Toda vez que a mensagem muda, reseta a barra e enche ela de novo
useEffect(() => {
setProgress(0); // Reseta
const interval = setInterval(() => {
setProgress((prev) => {
// Vai enchendo até 95% (deixa 5% de margem para o próximo log chegar)
if (prev >= 95) return prev;
// Velocidade aleatória para parecer orgânico (entre 0.5% e 2% por tick)
return prev + Math.random() * 1.5;
});
}, 100); // Atualiza a cada 100ms

return () => clearInterval(interval);

}, [currentLogRaw]); // Dispara quando o log muda
return (
<div className="w-full rounded-xl overflow-hidden bg-gray-900 text-white relative shadow-2xl border border-indigo-500/30">

{/* --- FUNDO ANIMADO (Aurora Boreal Tecnológica) --- */}
  <div className="absolute inset-0 z-0">
    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(79,70,229,0.15)_0%,rgba(0,0,0,0)_50%)] animate-pulse"></div>
    <div className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(147,51,234,0.15)_0%,rgba(0,0,0,0)_50%)] animate-pulse delay-75"></div>
  </div>

  <div className="relative z-10 flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-8">
    
    {/* --- ÁREA DO LOGO E BRANDING --- */}
    <div className="flex flex-col items-center space-y-4">
      {/* Logo Lidia Pulsando */}
      <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/10 shadow-lg animate-pulse">
        {/* Se tiver o SVG do logo da Lidia, coloque aqui. Usei um ícone genérico bonito */}
        <BookOpen size={48} className="text-indigo-400" />
      </div>
      
      {/* Selo SNT Core */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-950/50 rounded-full border border-indigo-500/30">
        <Cpu size={14} className="text-cyan-400 animate-spin-slow" />
        <span className="text-xs font-mono tracking-widest text-cyan-300 uppercase">
          SNT® Core Inside
        </span>
      </div>
    </div>

    {/* --- STATUS ATUAL (TEXTO DINÂMICO) --- */}
    <div className="w-full max-w-lg h-16 flex items-center justify-center">
      <h2 className="text-xl md:text-2xl font-light text-indigo-100 animate-fade-in-up transition-all duration-500">
        {currentMessage}
        <span className="inline-block w-1 h-1 ml-1 bg-indigo-400 rounded-full animate-bounce">.</span>
        <span className="inline-block w-1 h-1 ml-1 bg-indigo-400 rounded-full animate-bounce delay-100">.</span>
        <span className="inline-block w-1 h-1 ml-1 bg-indigo-400 rounded-full animate-bounce delay-200">.</span>
      </h2>
    </div>

    {/* --- BARRA DE PROGRESSO "MICRO" (A cada etapa) --- */}
    <div className="w-full max-w-xl space-y-2">
      <div className="flex justify-between text-xs text-gray-400 uppercase tracking-wider">
        <span>Processando</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        <div 
          className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 transition-all duration-300 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          {/* Brilho correndo na barra */}
          <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 transform skew-x-12"></div>
        </div>
      </div>
      <div className="text-xs text-gray-500 italic mt-2">
        Isso pode levar alguns minutos. A IA está arquitetando e escrevendo seu conteúdo.
      </div>
    </div>

  </div>
</div>

);
};
// Adicione isso se não tiver no seu globals.css, ou deixe que o Tailwind resolve a maioria.
// A classe animate-spin-slow pode ser simulada com animate-spin se não tiver configurada.