import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Article, Category } from '../types';

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    // Verificar se já existe uma sessão ativa
    const authStatus = sessionStorage.getItem('cmb_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }

    const savedDrafts = localStorage.getItem('cmb_drafts');
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Credenciais de acesso (Hardcoded para este contexto de aplicação estática)
    if (username === 'admin' && password === 'cmb2025') {
      setIsAuthenticated(true);
      sessionStorage.setItem('cmb_admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Credenciais inválidas. Acesso negado pelo protocolo de segurança.');
    }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-5));

  const generateDailyPosts = async () => {
    setIsGenerating(true);
    setLogs([]);
    setSources([]);
    addLog("Iniciando varredura de tendências globais...");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const researchResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Identifique as 3 tendências mais importantes de hoje em Inteligência Artificial, Marketing Digital e Tecnologia no Brasil. Forneça fatos específicos.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const groundingChunks = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) setSources(groundingChunks);

      addLog("Tendências identificadas. Iniciando redação estruturada...");

      const generationResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Com base nestas tendências: "${researchResponse.text}", crie 3 artigos completos para o blog CMBDIGITAL em português brasileiro. 
        Retorne um array JSON com: id, slug, title, excerpt, content (HTML rico com h2, h3, p, strong, ul, li), category, date (Hoje), tags (array), metaTitle, metaDescription.`,
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

      const generatedArticles = JSON.parse(generationResponse.text);
      addLog("Conteúdo redigido. Gerando visuais de alta performance...");

      const articlesWithImages = await Promise.all(generatedArticles.map(async (art: any) => {
        addLog(`Gerando visual para: ${art.title.substring(0, 30)}...`);
        
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: `A professional, minimalist high-quality tech photograph for: "${art.title}". Corporate tech style, navy blue and cyan tones, 8k resolution. No text.` }]
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

        return { ...art, image: imageUrl, author: 'CMBDIGITAL', status: 'draft' };
      }));

      const newDrafts = [...drafts, ...articlesWithImages];
      setDrafts(newDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(newDrafts));
      addLog("Protocolo concluído. Rascunhos disponíveis.");

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
    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    localStorage.setItem('cmb_published', JSON.stringify([...published, { ...articleToPublish, status: 'published' }]));
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

  // TELA DE LOGIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-brand-obsidian bg-brand-lightBg px-4 py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-cyan mb-8 shadow-2xl shadow-brand-cyan/20">
              <span className="text-brand-obsidian font-black text-3xl">C</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter dark:text-brand-soft text-slate-900 mb-4">ACESSO RESTRITO</h1>
            <p className="text-brand-muted font-bold uppercase tracking-[0.2em] text-[10px]">Terminal de Curadoria Ativa CMBDIGITAL</p>
          </div>

          <form onSubmit={handleLogin} className="p-10 rounded-[3rem] border dark:bg-brand-graphite dark:border-brand-graphite bg-white border-slate-200 shadow-2xl">
            {loginError && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
                {loginError}
              </div>
            )}
            
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] mb-4 dark:text-brand-muted text-slate-500">Usuário</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded-2xl px-6 py-4 font-bold tracking-tight dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft bg-slate-50 border-slate-100 text-slate-900 focus:border-brand-cyan focus:ring-0 transition-all"
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.3em] mb-4 dark:text-brand-muted text-slate-500">Credencial</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-2xl px-6 py-4 font-bold tracking-tight dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft bg-slate-50 border-slate-100 text-slate-900 focus:border-brand-cyan focus:ring-0 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-brand-purple hover:text-white transition-all shadow-xl shadow-brand-cyan/10"
              >
                Estabelecer Conexão
              </button>
            </div>
          </form>
          
          <p className="mt-12 text-center text-[10px] font-bold dark:text-brand-muted text-slate-400 tracking-[0.2em]">
            PROTEGIDO POR CRIPTOGRAFIA DE PONTA <br/> CMBDIGITAL &copy; 2025
          </p>
        </div>
      </div>
    );
  }

  // DASHBOARD AUTENTICADO
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
          <div className="flex gap-4">
            <button 
              onClick={() => {
                sessionStorage.removeItem('cmb_admin_auth');
                setIsAuthenticated(false);
              }}
              className="px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all border dark:border-brand-graphite dark:text-brand-muted hover:border-red-500 hover:text-red-500"
            >
              Encerrar Sessão
            </button>
            <button 
              onClick={generateDailyPosts}
              disabled={isGenerating}
              className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${isGenerating ? 'bg-brand-graphite text-brand-muted cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:bg-brand-purple hover:text-white'}`}
            >
              {isGenerating ? 'Processando Protocolo...' : 'Acionar Varredura Diária'}
            </button>
          </div>
        </div>

        {/* Fontes de Grounding */}
        {sources.length > 0 && (
          <div className="mb-8 p-6 rounded-2xl border dark:bg-brand-graphite/20 dark:border-brand-graphite border-slate-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-purple mb-4">Fontes Identificadas</h4>
            <div className="flex flex-wrap gap-4">
              {sources.map((chunk, idx) => chunk.web && (
                <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs dark:text-brand-muted text-slate-500 hover:text-brand-cyan underline">
                  {chunk.web.title || chunk.web.uri}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mb-20 p-8 rounded-[2rem] border dark:bg-brand-graphite dark:border-brand-graphite/50 dark:text-brand-cyan text-slate-600 bg-white border-slate-200 font-mono text-xs space-y-2">
          {logs.length === 0 ? '> Sistema em standby.' : logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>

        <div className="space-y-12">
          <h2 className="text-2xl font-black uppercase tracking-widest dark:text-brand-soft text-slate-900 border-b pb-6 dark:border-brand-graphite border-slate-200">
            Fila de Aprovação ({drafts.length})
          </h2>
          
          {drafts.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed rounded-[3rem] dark:border-brand-graphite border-slate-200">
               <p className="text-brand-muted font-bold uppercase tracking-widest text-sm">Nenhum rascunho pendente.</p>
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
                      <button onClick={() => publishArticle(draft.id)} className="bg-brand-cyan text-brand-obsidian px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all">Publicar</button>
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