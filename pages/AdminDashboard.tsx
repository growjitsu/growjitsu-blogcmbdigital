import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

// Configuração Supabase
const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'sb_publishable_36McnPdKx5T7gEKzeMQYDQ_o44rEiYJ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    const savedDrafts = localStorage.getItem('cmb_drafts');
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts));

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw new Error(error.message === "Invalid login credentials" 
          ? "Credenciais inválidas. Verifique e-mail e senha no Supabase." 
          : error.message);
      }
    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-6));

  const generateDailyPosts = async () => {
    setIsGenerating(true);
    setLogs([]);
    setSources([]);
    addLog("Iniciando Protocolo de Varredura CMBDIGITAL...");

    try {
      // Inicialização da IA (A chave é injetada automaticamente pelo ambiente)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. PESQUISA EM TEMPO REAL (GOOGLE SEARCH)
      addLog("Varrendo a web por tendências de IA e Marketing Digital (Google Search)...");
      const researchResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: "Identifique as 3 notícias ou tendências de tecnologia e IA mais importantes de hoje no Brasil e globalmente.",
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) setSources(groundingChunks);

      addLog("Tendências identificadas. Iniciando redação de artigos premium...");

      // 2. GERAÇÃO DE CONTEÚDO (GEMINI 3 PRO)
      const generationResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Com base nas tendências atuais: "${researchResponse.text}", crie exatamente 3 artigos SEO premium para o blog CMBDIGITAL. 
        Retorne um array JSON com: id, slug, title, excerpt, content (HTML rico), category, date, tags (array), metaTitle, metaDescription.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                slug: { type: Type.STRING },
                title: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                content: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                metaTitle: { type: Type.STRING },
                metaDescription: { type: Type.STRING }
              },
              required: ["id", "slug", "title", "excerpt", "content", "category", "date", "tags", "metaTitle", "metaDescription"]
            }
          }
        }
      });

      const generatedArticles = JSON.parse(generationResponse.text || "[]");
      addLog("Conteúdo redigido. Sintetizando visuais de alta performance...");

      // 3. GERAÇÃO DE IMAGENS (GEMINI 2.5 FLASH IMAGE)
      const articlesWithImages = await Promise.all(generatedArticles.map(async (art: any) => {
        addLog(`Gerando imagem para: ${art.title.substring(0, 20)}...`);
        
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `A hyper-realistic, professional tech corporate photo for: "${art.title}". Minimalist obsidian style, cyan and neon accents, 8k resolution, cinematic lighting. No text.` }]
          }
        });

        let imageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200";
        if (imgResponse.candidates?.[0]?.content?.parts) {
          for (const part of imgResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        return { 
          ...art, 
          image: imageUrl, 
          author: 'CMBDIGITAL', 
          status: 'draft',
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        };
      }));

      const newDrafts = [...drafts, ...articlesWithImages];
      setDrafts(newDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(newDrafts));
      addLog("Varredura concluída. Rascunhos disponíveis para aprovação.");

    } catch (error: any) {
      console.error(error);
      addLog(`ERRO: ${error.message || "Falha na conexão com o motor de IA."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishArticle = (id: string) => {
    const articleToPublish = drafts.find(d => d.id === id);
    if (!articleToPublish) return;
    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    localStorage.setItem('cmb_published', JSON.stringify([{ ...articleToPublish, status: 'published' }, ...published]));
    const remainingDrafts = drafts.filter(d => d.id !== id);
    setDrafts(remainingDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    alert("Publicado com sucesso!");
    window.location.reload();
  };

  const deleteDraft = (id: string) => {
    const remaining = drafts.filter(d => d.id !== id);
    setDrafts(remaining);
    localStorage.setItem('cmb_drafts', JSON.stringify(remaining));
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-brand-soft uppercase tracking-tighter mb-2">Curadoria Oculta</h1>
            <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em]">Sincronize sua autoridade digital</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 rounded-[3rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-8">
            {loginError && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-2xl text-center">{loginError}</div>}
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 font-bold text-brand-soft outline-none focus:border-brand-cyan"
              placeholder="E-mail" required
            />
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 font-bold text-brand-soft outline-none focus:border-brand-cyan"
              placeholder="Senha" required
            />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-brand-purple hover:text-white transition-all shadow-xl">
              {isLoggingIn ? 'Processando...' : 'Acessar Terminal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-10">
          <div>
            <h1 className="text-5xl font-black text-brand-soft tracking-tighter uppercase mb-4">
              Gerência de <span className="text-brand-cyan">Protocolos</span>
            </h1>
            <p className="text-brand-muted font-medium">Motor IA Gemini 3 Pro (Search Grounding Ativo)</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleLogout} className="px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] border border-brand-graphite text-brand-muted hover:border-red-500 transition-all">Sair</button>
            <button onClick={generateDailyPosts} disabled={isGenerating} className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all ${isGenerating ? 'bg-brand-graphite text-brand-muted animate-pulse cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:bg-brand-purple hover:text-white'}`}>
              {isGenerating ? 'Varrendo Web...' : 'Adicionar Varredura'}
            </button>
          </div>
        </div>

        {sources.length > 0 && (
          <div className="mb-10 p-6 rounded-2xl border border-brand-graphite bg-brand-graphite/10">
            <h4 className="text-[10px] font-black uppercase text-brand-purple tracking-widest mb-4">Fontes Identificadas</h4>
            <div className="flex flex-wrap gap-4">
              {sources.map((s, i) => s.web && <a key={i} href={s.web.uri} target="_blank" className="text-[10px] font-bold text-brand-muted hover:text-brand-cyan underline">{s.web.title || s.web.uri}</a>)}
            </div>
          </div>
        )}

        <div className="mb-20 p-8 rounded-[2rem] border border-brand-graphite/50 bg-brand-graphite/30 text-brand-cyan font-mono text-xs space-y-2 overflow-hidden shadow-inner">
          {logs.length === 0 ? '> Sistema pronto para varredura.' : logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>

        <div className="space-y-12">
          <h2 className="text-2xl font-black uppercase tracking-widest text-brand-soft border-b border-brand-graphite pb-6">Fila de Aprovação ({drafts.length})</h2>
          {drafts.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-brand-graphite rounded-[3rem]">
               <p className="text-brand-muted font-bold uppercase tracking-widest text-sm">Aguardando novos protocolos de IA...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10">
              {drafts.map(draft => (
                <div key={draft.id} className="p-8 rounded-[3rem] border border-brand-graphite bg-brand-graphite/20 flex flex-col lg:flex-row gap-10 hover:border-brand-cyan transition-all group">
                  <div className="lg:w-1/3 rounded-[2rem] overflow-hidden h-64 border border-brand-graphite">
                    <img src={draft.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Visual" />
                  </div>
                  <div className="lg:w-2/3 flex flex-col justify-center">
                    <span className="text-brand-purple font-black text-[10px] uppercase tracking-widest mb-4">{draft.category}</span>
                    <h3 className="text-3xl font-black text-brand-soft mb-6 tracking-tighter leading-tight">{draft.title}</h3>
                    <p className="text-brand-muted mb-10 line-clamp-2 text-sm">{draft.excerpt}</p>
                    <div className="flex flex-wrap gap-4">
                      <button onClick={() => publishArticle(draft.id)} className="bg-brand-cyan text-brand-obsidian px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all">Aprovar e Publicar</button>
                      <button onClick={() => deleteDraft(draft.id)} className="bg-red-500/10 text-red-500 px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Descartar</button>
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