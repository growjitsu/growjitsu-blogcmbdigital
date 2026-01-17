
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc1ODYsImV4cCI6MjA4Mzc1MzU4Nn0.jJQpw4suKZof8caOsQ41PBOegESYqi-iLatK1qk4GzQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SQL_FIX_SCRIPT = `-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SUPABASE PARA CORRIGIR O SCHEMA CACHE
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  slug TEXT UNIQUE,
  content TEXT,
  excerpt TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'published')),
  featured BOOLEAN DEFAULT false,
  image_url TEXT,
  author TEXT DEFAULT 'CMBDIGITAL',
  date TEXT,
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);`;

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeMode, setActiveMode] = useState<'generate' | 'manage' | 'setup'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [themes, setThemes] = useState('');
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();
    loadAllContent();
  }, []);

  const loadAllContent = async () => {
    try {
      const resPending = await fetch('/api/posts?status=pending');
      const dataPending = await resPending.json();
      if (dataPending.success) setPendingArticles(dataPending.articles || []);

      const resPub = await fetch('/api/posts?status=published');
      const dataPub = await resPub.json();
      if (dataPub.success) setPublishedArticles(dataPub.articles || []);
      
      if (dataPending.error?.includes('cache')) {
        addLog("ERRO CRÍTICO: Tabela 'posts' não encontrada no cache do Supabase.");
      }
    } catch (e: any) {
      addLog(`Erro de Terminal: ${e.message}`);
    }
  };

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setIsAuthenticated(true);
    } catch (error: any) { 
      alert(`Erro na autenticação: ${error.message}`); 
    } finally { 
      setIsLoggingIn(false); 
    }
  };

  const generateDailyPosts = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    addLog("Iniciando Protocolo de Curadoria...");
    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: themes.split('\n').filter(t => t.trim()) })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`${data.count} rascunhos salvos como 'PENDENTE'.`);
        setThemes('');
        loadAllContent();
      } else throw new Error(data.error);
    } catch (error: any) { 
      addLog(`FALHA: ${error.message}`); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handlePublish = async (id: string) => {
    const post = editingArticle || pendingArticles.find(d => d.id === id);
    if (!post) return;
    addLog(`Ativando: ${post.title}...`);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...post, status: 'published', date: new Date().toLocaleDateString('pt-BR') })
      });
      const data = await res.json();
      if (data.success) {
        addLog("Insight Ativado.");
        setEditingArticle(null);
        loadAllContent();
        setActiveMode('manage');
      }
    } catch (e) { addLog("Erro ao publicar."); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <form onSubmit={handleLogin} className="p-10 rounded-[3rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Terminal CMBDIGITAL</h1>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="E-mail" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="Senha" required />
          <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-cyan/20">{isLoggingIn ? 'Verificando...' : 'Acessar Terminal'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Hub de <span className="text-brand-cyan">Gestão</span></h1>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => setActiveMode('generate')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'generate' ? 'bg-brand-cyan text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Curadoria IA</button>
              <button onClick={() => setActiveMode('manage')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'manage' ? 'bg-brand-cyan text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Produção ({publishedArticles.length})</button>
              <button onClick={() => setActiveMode('setup')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'setup' ? 'bg-brand-amber text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Reparar Banco</button>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="px-8 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:text-red-500 transition-colors">Sair</button>
        </div>

        {activeMode === 'setup' && (
          <div className="animate-in fade-in duration-500 space-y-10">
            <div className="p-10 rounded-[3rem] bg-brand-graphite border border-brand-amber/30">
               <h2 className="text-2xl font-black text-brand-amber mb-6 uppercase tracking-tighter">Correção de Schema Cache</h2>
               <p className="text-sm text-brand-muted mb-8 leading-relaxed">Se o terminal reporta que a tabela 'public.posts' não foi encontrada, copie o código abaixo e execute-o no <strong>SQL Editor</strong> do seu dashboard Supabase. Em seguida, clique em 'Settings' > 'API' > 'Reload Schema' para forçar o reconhecimento.</p>
               <pre className="bg-brand-obsidian p-8 rounded-2xl text-[11px] font-mono text-brand-cyan overflow-x-auto border border-brand-graphite mb-8">
                 {SQL_FIX_SCRIPT}
               </pre>
               <button onClick={() => { navigator.clipboard.writeText(SQL_FIX_SCRIPT); alert("SQL Copiado!"); }} className="bg-brand-amber text-brand-obsidian px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest">Copiar Script SQL</button>
            </div>
          </div>
        )}

        {activeMode === 'generate' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 p-10 rounded-[3rem] bg-brand-graphite/40 border border-brand-graphite/50">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Foco de Curadoria</label>
                <textarea value={themes} onChange={(e) => setThemes(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-6 text-sm focus:border-brand-cyan outline-none min-h-[140px]" placeholder="Temas para IA..." />
                <button onClick={generateDailyPosts} disabled={isGenerating} className="w-full mt-6 py-6 rounded-2xl font-black text-xs uppercase bg-brand-cyan text-brand-obsidian shadow-xl shadow-brand-cyan/20">
                  {isGenerating ? 'IA em Operação...' : 'Processar Nova Curadoria'}
                </button>
              </div>
              <div className="p-8 rounded-[3rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 overflow-y-auto h-[280px]">
                <div className="mb-4 text-white font-black border-b border-brand-graphite pb-2 uppercase text-[9px]">Terminal de Sistema</div>
                {logs.length === 0 ? <div className="text-brand-muted italic">Aguardando comandos...</div> : logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-4">
                Fila de Aprovação
                <span className="bg-brand-graphite px-3 py-1 rounded-full text-[10px] text-brand-cyan">{pendingArticles.length}</span>
              </h2>
              {pendingArticles.map(article => (
                <div key={article.id} className="p-6 rounded-3xl bg-brand-graphite/20 border border-brand-graphite flex items-center gap-6 group hover:border-brand-cyan transition-all">
                  <img src={article.image} className="w-24 h-24 rounded-2xl object-cover bg-brand-obsidian" />
                  <div className="flex-grow">
                    <h3 className="text-lg font-black text-white">{article.title}</h3>
                    <p className="text-[10px] text-brand-muted uppercase font-bold">{article.category} • {article.status}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setEditingArticle(article)} className="text-[9px] font-black bg-white text-brand-obsidian px-5 py-3 rounded-xl">Revisar</button>
                    <button onClick={() => handlePublish(article.id)} className="text-[9px] font-black bg-brand-cyan text-brand-obsidian px-5 py-3 rounded-xl">Aprovar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <h2 className="text-xl font-black uppercase tracking-widest text-brand-cyan">Publicações Ativas</h2>
             {publishedArticles.map(article => (
                <div key={article.id} className="p-6 rounded-3xl bg-brand-graphite/20 border border-brand-graphite/30 flex items-center gap-6">
                  <img src={article.image} className="w-20 h-20 rounded-2xl object-cover" />
                  <div className="flex-grow">
                    <h3 className="text-md font-black text-white">{article.title}</h3>
                    <p className="text-[9px] text-brand-muted uppercase tracking-widest">{article.date}</p>
                  </div>
                  <button onClick={() => setEditingArticle(article)} className="text-[9px] font-black border border-brand-graphite px-5 py-3 rounded-xl">Editar</button>
                </div>
             ))}
          </div>
        )}

        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-4xl p-12 rounded-[3.5rem] border border-brand-graphite shadow-2xl space-y-8 my-10 relative">
              <button onClick={() => setEditingArticle(null)} className="absolute top-8 right-8 text-brand-muted hover:text-white text-4xl">×</button>
              <h2 className="text-2xl font-black uppercase text-brand-cyan">Refinar Insight</h2>
              <div className="space-y-6">
                <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-white font-bold" />
                <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-6 text-sm h-96 font-mono leading-relaxed" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => handlePublish(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-6 rounded-2xl font-black uppercase text-xs tracking-widest">Finalizar e Publicar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
