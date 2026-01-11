
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Article, Category } from '../types';

const AdminDashboard: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const savedDrafts = localStorage.getItem('cmb_drafts');
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
  }, []);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-5));

  const generateDailyPosts = async () => {
    setIsGenerating(true);
    setLogs([]);
    addLog("Iniciando varredura de tendências globais...");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Pesquisa e Redação
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Aja como um editor-chefe senior da CMBDIGITAL. 
        Utilize a ferramenta Google Search para encontrar as 3 notícias ou tendências mais importantes e REAIS de hoje nas áreas de: Inteligência Artificial, Marketing Digital e Produtividade Tecnológica.
        
        Para cada uma das 3 tendências, crie um artigo completo entre 1000 e 1500 palavras.
        O formato de saída deve ser um JSON válido contendo um array de objetos com:
        id, slug, title, excerpt, content (HTML rico), category (use as categorias: Inteligência Artificial, Tecnologia, Marketing Digital, Produtividade, Renda Online, Ferramentas), date (Hoje), tags (array), metaTitle, metaDescription.
        
        Não gere conteúdo genérico. Use fatos reais encontrados na busca.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      const generatedArticles = JSON.parse(response.text);
      addLog("Artigos redigidos com sucesso. Iniciando geração de imagens...");

      // 2. Geração de Imagens para cada artigo
      const articlesWithImages = await Promise.all(generatedArticles.map(async (art: any) => {
        addLog(`Gerando visual chic para: ${art.title.substring(0, 30)}...`);
        
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `A professional, elegant, and chic high-quality photograph for a tech blog article titled: "${art.title}". Style: Minimalist, futuristic, clean, navy blue and white tones, cinematic lighting, 8k resolution. No text in image.` }]
          }
        });

        let imageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200";
        for (const part of imgResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          }
        }

        return { ...art, image: imageUrl, author: 'CMBDIGITAL', status: 'draft' };
      }));

      const newDrafts = [...drafts, ...articlesWithImages];
      setDrafts(newDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(newDrafts));
      addLog("Protocolo concluído. 3 posts aguardando sua aprovação.");

    } catch (error) {
      console.error(error);
      addLog("Erro no protocolo: Verifique sua conexão e chave de API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const publishArticle = (id: string) => {
    const articleToPublish = drafts.find(d => d.id === id);
    if (!articleToPublish) return;

    // Adiciona aos artigos publicados (LocalStorage para simular DB)
    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    localStorage.setItem('cmb_published', JSON.stringify([...published, { ...articleToPublish, status: 'published' }]));
    
    // Remove dos rascunhos
    const remainingDrafts = drafts.filter(d => d.id !== id);
    setDrafts(remainingDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    
    alert("Artigo publicado com sucesso no fluxo principal!");
    window.location.reload(); // Recarrega para atualizar o feed
  };

  const deleteDraft = (id: string) => {
    const remaining = drafts.filter(d => d.id !== id);
    setDrafts(remaining);
    localStorage.setItem('cmb_drafts', JSON.stringify(remaining));
  };

  return (
    <div className="min-h-screen pt-32 pb-20 dark:bg-brand-obsidian bg-brand-lightBg">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-10">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-4 dark:text-brand-soft text-slate-900 uppercase">
              Centro de <span className="text-brand-cyan">Curação Automática</span>
            </h1>
            <p className="text-brand-muted font-medium">Motor de inteligência CMBDIGITAL v2.0</p>
          </div>
          <button 
            onClick={generateDailyPosts}
            disabled={isGenerating}
            className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${isGenerating ? 'bg-brand-graphite text-brand-muted cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:bg-brand-purple hover:text-white'}`}
          >
            {isGenerating ? 'Processando Redação & Visual...' : 'Acionar Varredura Diária'}
          </button>
        </div>

        {/* Logs Console */}
        <div className="mb-20 p-8 rounded-[2rem] border dark:bg-brand-graphite dark:border-brand-graphite/50 dark:text-brand-cyan text-slate-600 bg-white border-slate-200 font-mono text-xs space-y-2">
          {logs.length === 0 ? '> Sistema em standby. Aguardando comando...' : logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>

        {/* Rascunhos para Aprovação */}
        <div className="space-y-12">
          <h2 className="text-2xl font-black uppercase tracking-widest dark:text-brand-soft text-slate-900 border-b pb-6 dark:border-brand-graphite border-slate-200">
            Fila de Aprovação ({drafts.length})
          </h2>
          
          {drafts.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-[3rem] dark:border-brand-graphite border-slate-200">
               <p className="text-brand-muted font-bold uppercase tracking-widest text-sm">Nenhum rascunho pendente de validação.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10">
              {drafts.map(draft => (
                <div key={draft.id} className="group p-8 rounded-[3rem] border flex flex-col lg:flex-row gap-10 transition-all dark:bg-brand-graphite/30 dark:border-brand-graphite hover:border-brand-cyan bg-white border-slate-200">
                  <div className="lg:w-1/3 rounded-[2rem] overflow-hidden h-64 border dark:border-brand-graphite border-slate-100">
                    <img src={draft.image} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                  <div className="lg:w-2/3 flex flex-col justify-center">
                    <span className="text-brand-purple font-black text-[10px] uppercase tracking-widest mb-4">{draft.category}</span>
                    <h3 className="text-3xl font-black mb-6 tracking-tighter dark:text-brand-soft text-slate-900">{draft.title}</h3>
                    <p className="text-brand-muted mb-10 line-clamp-2">{draft.excerpt}</p>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => publishArticle(draft.id)}
                        className="bg-brand-cyan text-brand-obsidian px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all"
                      >
                        Aprovar e Publicar
                      </button>
                      <button 
                        onClick={() => deleteDraft(draft.id)}
                        className="bg-red-500/10 text-red-500 px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
