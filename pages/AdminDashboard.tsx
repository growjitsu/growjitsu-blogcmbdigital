
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc1ODYsImV4cCI6MjA4Mzc1MzU4Nn0.jJQpw4suKZof8caOsQ41PBOegESYqi-iLatK1qk4GzQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeMode, setActiveMode] = useState<'generate' | 'manage'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [themes, setThemes] = useState('');
  const [drafts, setDrafts] = useState<Article[]>([]);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setIsAuthenticated(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const loadAllContent = async () => {
    try {
      const resDrafts = await fetch('/api/posts?status=draft');
      const dataDrafts = await resDrafts.json();
      if (dataDrafts.success) setDrafts(dataDrafts.articles || []);

      const resPub = await fetch('/api/posts?status=published');
      const dataPub = await resPub.json();
      if (dataPub.success) setPublishedArticles(dataPub.articles || []);
    } catch (e) {
      addLog("Erro de Sincronização: Falha na comunicação com o banco de dados.");
    }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-15));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error: any) { alert(error.message); } finally { setIsLoggingIn(false); }
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
        addLog(`${data.count} rascunhos gerados e persistidos no Supabase.`);
        if (data.drafts && data.drafts.length > 0) {
          // Garante que o frontend receba os novos rascunhos imediatamente
          setDrafts(prev => [...data.drafts, ...prev]);
        } else {
          addLog("AVISO: Nenhum rascunho retornado pela API.");
        }
        setThemes('');
      } else {
        throw new Error(data.error || "Erro técnico na geração de conteúdo.");
      }
    } catch (error: any) { 
      addLog(`FALHA NO PROTOCOLO: ${error.message}`); 
    } finally { 
      setIsGenerating(false); 
      // Opcional: Recarregar para garantir sincronia total
      setTimeout(loadAllContent, 1000);
    }
  };

  const saveToCloud = async (article: Article) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article)
      });
      const data = await response.json();
      return data.success;
    } catch (e) { return false; }
  };

  const handlePublish = async (id: string) => {
    const post = editingArticle && editingArticle.id === id 
      ? editingArticle 
      : drafts.find(d => d.id === id);

    if (!post) return;

    addLog(`Lançando Protocolo: ${post.title}...`);
    const publishedPost: Article = { 
      ...post, 
      status: 'published' as const,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    };

    const ok = await saveToCloud(publishedPost);
    if (ok) {
      addLog("Insight Ativado em Produção.");
      loadAllContent();
      setEditingArticle(null);
      setActiveMode('manage');
    } else {
      addLog("Erro ao publicar: Verifique logs de rede.");
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Confirmar deleção permanente do Banco de Dados?")) return;
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addLog("Protocolo removido da nuvem.");
        loadAllContent();
      }
    } catch (e) { addLog("Erro ao apagar registro."); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;
    setIsUploading(true);
    addLog("Iniciando upload para Cloud Storage...");
    try {
      const fileName = `${editingArticle.slug}-${Date.now()}.${file.name.split('.').pop()}`;
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-file-name': fileName, 'content-type': file.type },
        body: file
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.reason || "Falha no upload");
      setEditingArticle({ ...editingArticle, image: data.image_url });
      addLog("Imagem sincronizada com sucesso.");
    } catch (e: any) { 
      alert(e.message); 
      addLog(`Erro no Storage: ${e.message}`);
    } finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <form onSubmit={handleLogin} className="p-10 rounded-[3rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Terminal de Dados</h1>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="E-mail" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="Senha" required />
          <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-cyan/20 transition-all active:scale-95">{isLoggingIn ? 'Autenticando...' : 'Acessar Terminal'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Centro de <span className="text-brand-cyan">Curation</span></h1>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setActiveMode('generate')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'generate' ? 'bg-brand-cyan text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Curadoria IA</button>
              <button onClick={() => setActiveMode('manage')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'manage' ? 'bg-brand-cyan text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Live Database ({publishedArticles.length})</button>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="px-8 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:text-red-500 transition-colors">Logoff</button>
        </div>

        {activeMode === 'generate' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 p-10 rounded-[3rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-2xl">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Pautas Estratégicas</label>
                <textarea value={themes} onChange={(e) => setThemes(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm focus:border-brand-cyan outline-none min-h-[140px] text-brand-soft leading-relaxed" placeholder="Ex: SEO para E-commerce, IA em 2025, Marketing de Influência..." />
                <button onClick={generateDailyPosts} disabled={isGenerating} className="w-full mt-6 py-6 rounded-2xl font-black text-xs uppercase bg-brand-cyan text-brand-obsidian shadow-xl shadow-brand-cyan/20 hover:bg-brand-purple hover:text-white transition-all disabled:opacity-50">
                  {isGenerating ? 'Executando Protocolo...' : 'Gerar Novos Insights'}
                </button>
              </div>
              <div className="p-8 rounded-[3rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 overflow-y-auto max-h-[300px] shadow-inner">
                <div className="mb-4 text-white font-black border-b border-brand-graphite pb-2 uppercase text-[9px]">Terminal Editorial</div>
                {logs.length === 0 ? <div className="text-brand-muted italic">Aguardando comando...</div> : logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
              </div>
            </div>
            
            <div className="space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-brand-graphite pb-6 flex justify-between items-center">
                Rascunhos Pendentes
                <span className="bg-brand-graphite px-4 py-1 rounded-full text-[10px] font-mono text-brand-cyan">{drafts.length} itens</span>
              </h2>
              
              {drafts.length === 0 && !isGenerating && (
                <div className="py-24 text-center border-2 border-dashed border-brand-graphite/30 rounded-[4rem]">
                   <p className="text-brand-muted uppercase font-black text-[10px] tracking-widest">Nenhum rascunho em cache</p>
                </div>
              )}
              
              {drafts.map(draft => (
                <div key={draft.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-8 items-center group hover:border-brand-cyan transition-all animate-in zoom-in duration-300">
                  <img src={draft.image} className="w-40 h-28 rounded-2xl object-cover bg-brand-obsidian shadow-lg" />
                  <div className="flex-grow">
                    <h3 className="text-xl font-black text-white mb-2 leading-tight">{draft.title}</h3>
                    <p className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">{draft.category} • {draft.date}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setEditingArticle(draft)} className="text-[9px] font-black bg-white text-brand-obsidian px-6 py-3 rounded-xl hover:bg-brand-cyan transition-all">Revisar</button>
                    <button onClick={() => handlePublish(draft.id)} className="text-[9px] font-black bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl shadow-lg hover:bg-brand-purple hover:text-white transition-all">Ativar</button>
                    <button onClick={() => deleteArticle(draft.id)} className="text-brand-muted hover:text-red-500 text-xl transition-colors">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'manage' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black uppercase tracking-widest text-brand-cyan border-b border-brand-cyan/20 pb-6">Insights em Produção</h2>
            <div className="grid grid-cols-1 gap-6">
              {publishedArticles.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-brand-graphite/30 rounded-[4rem]">
                   <p className="text-brand-muted uppercase font-black text-[10px] tracking-widest">Aguardando primeira publicação</p>
                </div>
              ) : publishedArticles.map(article => (
                <div key={article.id} className="p-8 rounded-[3rem] bg-brand-cyan/5 border border-brand-cyan/10 flex flex-col md:flex-row gap-8 items-center group hover:bg-brand-cyan/10 transition-all">
                  <img src={article.image} className="w-32 h-24 rounded-2xl object-cover bg-brand-obsidian shadow-xl" />
                  <div className="flex-grow">
                    <h3 className="text-lg font-black text-white mb-1 leading-tight">{article.title}</h3>
                    <p className="text-[9px] text-brand-muted uppercase tracking-[0.2em] font-mono">{article.date} • {article.slug}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setEditingArticle(article)} className="text-[9px] font-black bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl hover:bg-brand-purple hover:text-white transition-all">Editar</button>
                    <button onClick={() => deleteArticle(article.id)} className="text-brand-muted hover:text-red-500 text-xl transition-colors">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto backdrop-blur-sm">
            <div className="bg-brand-graphite w-full max-w-5xl p-10 md:p-14 rounded-[3.5rem] border border-brand-graphite shadow-2xl space-y-8 my-8 relative animate-in fade-in zoom-in duration-300">
              <div className="flex justify-between items-center border-b border-brand-graphite pb-6">
                <h2 className="text-3xl font-black uppercase text-brand-cyan tracking-tighter">Editor de Conteúdo</h2>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted hover:text-white text-3xl">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Título do Protocolo</label>
                  <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 outline-none focus:border-brand-cyan text-brand-soft font-bold shadow-inner" />
                  
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Sumário (Excerpt)</label>
                  <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 outline-none h-28 text-sm text-brand-soft leading-relaxed shadow-inner" />
                </div>
                <div className="space-y-6">
                  <div className="rounded-[2.5rem] overflow-hidden border border-brand-graphite h-52 bg-brand-obsidian relative group shadow-2xl">
                    <img src={editingArticle.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => fileInputRef.current?.click()} className="bg-white text-brand-obsidian px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-brand-cyan transition-all">Substituir Arte</button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    {isUploading && <div className="absolute inset-0 bg-brand-obsidian/60 backdrop-blur-sm flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>}
                  </div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Categoria de Dados</label>
                  <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 outline-none focus:border-brand-cyan text-brand-soft font-bold shadow-inner" />
                </div>
              </div>

              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-muted ml-1">Corpo do Post (Protocolo HTML)</label>
              <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-3xl px-8 py-8 outline-none h-80 font-mono text-sm leading-relaxed text-brand-soft shadow-inner" />

              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-brand-graphite">
                <button onClick={async () => {
                   addLog("Persistindo rascunho em cache...");
                   const ok = await saveToCloud(editingArticle);
                   if (ok) { addLog("Protocolo salvo com sucesso."); setEditingArticle(null); loadAllContent(); }
                   else addLog("Erro crítico na persistência.");
                }} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:border-white transition-all">Salvar Offline</button>
                <button onClick={() => handlePublish(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-6 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-brand-cyan/30 hover:bg-brand-purple hover:text-white transition-all transform active:scale-95">
                   Lançar no Ecossistema
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
