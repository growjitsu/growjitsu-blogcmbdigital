import React, { useState, useEffect } from 'react';
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

      if (error) throw new Error(error.message);
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
    addLog("Iniciando Protocolo Seguro via Backend Serverless...");

    try {
      addLog("Solicitando varredura ao servidor (/api/curadoria)...");
      
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP ${response.status}: O backend não respondeu corretamente.`);
      }

      const data = await response.json();
      
      if (data.sources) setSources(data.sources);
      
      const newDrafts = [...drafts, ...data.articles];
      setDrafts(newDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(newDrafts));
      
      addLog("Sucesso: 3 novos artigos gerados e fontes validadas.");

    } catch (error: any) {
      console.error(error);
      addLog(`FALHA: ${error.message}`);
      addLog("DICA: Certifique-se de que a GEMINI_API_KEY está configurada no seu ambiente Vercel.");
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
            <h1 className="text-4xl font-black text-brand-soft uppercase tracking-tighter mb-2">Terminal Curadoria</h1>
            <p className="text-brand-muted text-[10px] font-bold uppercase tracking-[0.2em]">Autenticação Supabase Requerida</p>
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
              {isLoggingIn ? 'Verificando...' : 'Acessar Sistema'}
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
              Controle de <span className="text-brand-cyan">Protocolos</span>
            </h1>
            <p className="text-brand-muted font-medium">Ambiente Serverless (API Oculta)</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleLogout} className="px-6 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] border border-brand-graphite text-brand-muted hover:border-red-500 transition-all">Sair</button>
            <button onClick={generateDailyPosts} disabled={isGenerating} className={`px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all ${isGenerating ? 'bg-brand-graphite text-brand-muted animate-pulse cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:bg-brand-purple hover:text-white'}`}>
              {isGenerating ? 'Processando no Servidor...' : 'Adicionar Varredura'}
            </button>
          </div>
        </div>

        {sources.length > 0 && (
          <div className="mb-10 p-6 rounded-2xl border border-brand-graphite bg-brand-graphite/10">
            <h4 className="text-[10px] font-black uppercase text-brand-purple tracking-widest mb-4">Fontes da Varredura Atual:</h4>
            <div className="flex flex-wrap gap-4">
              {sources.map((s, i) => s.web && <a key={i} href={s.web.uri} target="_blank" className="text-[10px] font-bold text-brand-muted hover:text-brand-cyan underline">{s.web.title || s.web.uri}</a>)}
            </div>
          </div>
        )}

        <div className="mb-20 p-8 rounded-[2rem] border border-brand-graphite/50 bg-brand-graphite/30 text-brand-cyan font-mono text-[10px] space-y-2 overflow-hidden shadow-inner min-h-[150px]">
          {logs.length === 0 ? '> Monitor de Operações em standby.' : logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>

        <div className="space-y-12">
          <h2 className="text-2xl font-black uppercase tracking-widest text-brand-soft border-b border-brand-graphite pb-6">Rascunhos para Revisão ({drafts.length})</h2>
          {drafts.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-brand-graphite rounded-[3rem]">
               <p className="text-brand-muted font-bold uppercase tracking-widest text-sm">Nenhum rascunho em fila.</p>
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
                      <button onClick={() => publishArticle(draft.id)} className="bg-brand-cyan text-brand-obsidian px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-lg">Publicar Artigo</button>
                      <button onClick={() => deleteDraft(draft.id)} className="bg-red-500/10 text-red-500 px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Remover</button>
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