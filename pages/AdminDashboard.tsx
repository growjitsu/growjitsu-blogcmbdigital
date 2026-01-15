
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc1ODYsImV4cCI6MjA4Mzc1MzU4Nn0.jJQpw4suKZof8caOsQ41PBOegESYqi-iLatK1qk4GzQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date(0);
  const months: { [key: string]: number } = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  try {
    const cleanStr = dateStr.toLowerCase().replace(/ de /g, ' ').replace(/,/g, '').trim();
    const parts = cleanStr.split(/\s+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]];
      const year = parseInt(parts[2]);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
    }
    const fallbackDate = new Date(dateStr);
    return isNaN(fallbackDate.getTime()) ? new Date(0) : fallbackDate;
  } catch (e) { return new Date(0); }
};

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

  const loadAllContent = () => {
    const savedDrafts = JSON.parse(localStorage.getItem('cmb_drafts') || '[]');
    const savedPublished = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    const storageSlugs = new Set(savedPublished.map((a: Article) => a.slug));
    const staticPosts = STATIC_ARTICLES.filter(a => !storageSlugs.has(a.slug)).map(a => ({...a, status: 'published' as const}));
    const combinedPublished = [...savedPublished, ...staticPosts].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
    setDrafts(savedDrafts);
    setPublishedArticles(combinedPublished);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error: any) { alert(error.message); } finally { setIsLoggingIn(false); }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

  const generateDailyPosts = async () => {
    if (!themes.trim()) return alert("Digite temas para IA.");
    setIsGenerating(true);
    addLog("Iniciando Varredura IA...");
    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: themes.split('\n').filter(t => t.trim()) })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      const updatedDrafts = [...(data.articles || []), ...drafts];
      setDrafts(updatedDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(updatedDrafts));
      setThemes('');
      addLog(`Sucesso: ${data.articles.length} rascunhos gerados.`);
    } catch (error: any) { addLog(`ERRO: ${error.message}`); } finally { setIsGenerating(false); }
  };

  const startEditing = (article: Article) => {
    setEditingArticle({ ...article });
    addLog(`Editor aberto: ${article.title}`);
  };

  const persistPublished = (articles: Article[]) => {
    // Only save to localStorage what is NOT exactly the same as static data to save space,
    // but ensures that all overrides and new posts are kept.
    const toSave = articles.filter(a => {
      const staticMatch = STATIC_ARTICLES.find(s => s.id === a.id);
      return !staticMatch || JSON.stringify(staticMatch) !== JSON.stringify(a);
    });
    localStorage.setItem('cmb_published', JSON.stringify(toSave));
  };

  const saveEdit = () => {
    if (!editingArticle) return;
    
    if (editingArticle.status === 'published') {
      const updated = publishedArticles.map(a => a.id === editingArticle.id ? editingArticle : a);
      setPublishedArticles(updated);
      persistPublished(updated);
      addLog(`Post vivo "${editingArticle.title}" atualizado.`);
    } else {
      const updated = drafts.map(d => d.id === editingArticle.id ? editingArticle : d);
      setDrafts(updated);
      localStorage.setItem('cmb_drafts', JSON.stringify(updated));
      addLog(`Rascunho atualizado.`);
    }
    setEditingArticle(null);
  };

  const handlePublish = (id: string) => {
    // Priority: 1. Data currently in editor (if matches id), 2. Drafts list, 3. Published list (for re-dates)
    const currentPost = (editingArticle && editingArticle.id === id) 
      ? editingArticle 
      : (drafts.find(d => d.id === id) || publishedArticles.find(a => a.id === id));

    if (!currentPost) {
      addLog("ERRO: Artigo não localizado para publicação.");
      return;
    }

    // Refresh date to ensure it hits the top of the feed (Feature synchronization)
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const publishedPost: Article = { 
      ...currentPost, 
      status: 'published' as const,
      date: formattedDate
    };

    // Update States
    const newDrafts = drafts.filter(d => d.id !== id && d.slug !== publishedPost.slug);
    const otherPublished = publishedArticles.filter(a => a.id !== id && a.slug !== publishedPost.slug);
    const newPublished = [publishedPost, ...otherPublished].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    setDrafts(newDrafts);
    setPublishedArticles(newPublished);

    // Persist to Local Storage
    localStorage.setItem('cmb_drafts', JSON.stringify(newDrafts));
    persistPublished(newPublished);
    
    addLog(`STATUS: "${publishedPost.title}" agora está LIVE.`);
    setEditingArticle(null);
    if (activeMode === 'generate') setActiveMode('manage');
  };

  const unpublishArticle = (id: string) => {
    if (!confirm("Despublicar este artigo?")) return;
    const post = publishedArticles.find(a => a.id === id);
    if (!post) return;
    
    const draftPost = { ...post, status: 'draft' as const };
    const newPublished = publishedArticles.filter(a => a.id !== id);
    const newDrafts = [draftPost, ...drafts];

    setPublishedArticles(newPublished);
    setDrafts(newDrafts);

    persistPublished(newPublished);
    localStorage.setItem('cmb_drafts', JSON.stringify(newDrafts));
    
    addLog("Ativo movido para rascunhos.");
  };

  const deleteArticle = (id: string, from: 'draft' | 'published') => {
    if (!confirm("Excluir permanentemente? Esta ação não pode ser desfeita.")) return;
    if (from === 'draft') {
      const remaining = drafts.filter(d => d.id !== id);
      setDrafts(remaining);
      localStorage.setItem('cmb_drafts', JSON.stringify(remaining));
    } else {
      const remaining = publishedArticles.filter(a => a.id !== id);
      setPublishedArticles(remaining);
      persistPublished(remaining);
    }
    addLog("Removido com sucesso.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;
    setIsUploading(true);
    addLog("Fazendo upload de nova imagem...");
    try {
      const fileName = `${editingArticle.slug}-${Date.now()}.${file.name.split('.').pop()}`;
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-file-name': fileName, 'content-type': file.type },
        body: file
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.reason);
      setEditingArticle({ ...editingArticle, image: data.image_url });
      addLog("Imagem sincronizada com sucesso.");
    } catch (e: any) { 
      alert(e.message); 
      addLog(`Erro no Upload: ${e.message}`);
    } finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <form onSubmit={handleLogin} className="p-10 rounded-[3rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-8 w-full max-w-md">
          <h1 className="text-3xl font-black text-white text-center uppercase tracking-tighter">Terminal Editorial</h1>
          <div className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="Admin E-mail" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="Senha" required />
          </div>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-xl shadow-brand-cyan/20">
            {isLoggingIn ? 'Autenticando...' : 'Iniciar Protocolo'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Gestão <span className="text-brand-cyan">Editorial</span></h1>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setActiveMode('generate')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'generate' ? 'bg-brand-cyan text-brand-obsidian shadow-lg shadow-brand-cyan/20' : 'bg-brand-graphite text-brand-muted border border-brand-graphite/50'}`}>Fábrica IA</button>
              <button onClick={() => setActiveMode('manage')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'manage' ? 'bg-brand-cyan text-brand-obsidian shadow-lg shadow-brand-cyan/20' : 'bg-brand-graphite text-brand-muted border border-brand-graphite/50'}`}>Biblioteca ({publishedArticles.length})</button>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="px-8 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500 hover:text-red-500 transition-all">Sair do Painel</button>
        </div>

        {activeMode === 'generate' && (
          <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 p-10 rounded-[3rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-2xl">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Temas para Curadoria Digital</label>
                <textarea value={themes} onChange={(e) => setThemes(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm focus:border-brand-cyan outline-none min-h-[140px] text-brand-soft" placeholder="Digite temas separados por linha (ex: Tendências de Marketing 2025, IA Generativa...)" />
                <button onClick={generateDailyPosts} disabled={isGenerating} className="w-full mt-6 py-6 rounded-2xl font-black text-xs uppercase bg-brand-cyan text-brand-obsidian shadow-xl shadow-brand-cyan/20 hover:bg-brand-purple hover:text-white transition-all disabled:opacity-50">
                  {isGenerating ? 'Curadoria em Progresso...' : 'Gerar Protocolos de Conteúdo'}
                </button>
              </div>
              <div className="p-8 rounded-[3rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 overflow-y-auto max-h-[300px]">
                <div className="mb-4 text-white font-black border-b border-brand-graphite pb-2 uppercase text-[9px] tracking-widest">Terminal de Sincronização</div>
                {logs.length === 0 ? <p className="opacity-30 italic">Aguardando comandos editoriais...</p> : logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
              </div>
            </div>
            <div className="space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-brand-graphite pb-6 flex justify-between items-center">
                Fila de Validação
                <span className="bg-brand-graphite px-4 py-1 rounded-full text-[10px] font-mono">{drafts.length} rascunhos</span>
              </h2>
              {drafts.length === 0 ? (
                <div className="py-20 text-center bg-brand-graphite/10 rounded-[3rem] border border-dashed border-brand-graphite">
                  <p className="text-brand-muted italic font-bold">Nenhum rascunho pendente de revisão no momento.</p>
                </div>
              ) : drafts.map(draft => (
                <div key={draft.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-8 items-center group hover:border-brand-cyan transition-all">
                  <img src={draft.image} className="w-40 h-28 rounded-2xl object-cover bg-brand-obsidian" />
                  <div className="flex-grow">
                    <h3 className="text-xl font-black text-white mb-2">{draft.title}</h3>
                    <p className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">{draft.category} • {draft.date}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => startEditing(draft)} className="text-[9px] font-black bg-white text-brand-obsidian px-6 py-3 rounded-xl hover:bg-brand-cyan transition-colors">Revisar</button>
                    <button onClick={() => handlePublish(draft.id)} className="text-[9px] font-black bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl shadow-lg hover:bg-brand-purple hover:text-white transition-all">Publicar</button>
                    <button onClick={() => deleteArticle(draft.id, 'draft')} className="text-brand-muted hover:text-red-500 text-xl transition-colors">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'manage' && (
          <div className="space-y-12">
            <h2 className="text-2xl font-black uppercase tracking-widest text-brand-cyan border-b border-brand-cyan/20 pb-6">Biblioteca de Ativos em Produção ({publishedArticles.length})</h2>
            <div className="grid grid-cols-1 gap-6">
              {publishedArticles.map(article => (
                <div key={article.id} className="p-8 rounded-[3rem] bg-brand-cyan/5 border border-brand-cyan/10 flex flex-col md:flex-row gap-8 items-center group hover:bg-brand-cyan/10 transition-all">
                  <img src={article.image} className="w-32 h-24 rounded-2xl object-cover bg-brand-obsidian shadow-lg" />
                  <div className="flex-grow">
                    <h3 className="text-lg font-black text-white mb-1">{article.title}</h3>
                    <p className="text-[9px] text-brand-muted uppercase tracking-widest font-mono">{article.date} • {article.slug}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => startEditing(article)} className="text-[9px] font-black bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl hover:scale-105 transition-all">✏️ Editar</button>
                    <button onClick={() => unpublishArticle(article.id)} className="text-[9px] font-black border border-brand-cyan/30 text-brand-cyan px-6 py-3 rounded-xl hover:bg-brand-cyan/10 transition-all">Despublicar</button>
                    <button onClick={() => deleteArticle(article.id, 'published')} className="text-brand-muted hover:text-red-500 text-xl transition-colors">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto backdrop-blur-sm">
            <div className="bg-brand-graphite w-full max-w-5xl p-10 md:p-14 rounded-[3.5rem] border border-brand-graphite shadow-2xl space-y-8 my-8 relative animate-in fade-in zoom-in duration-300">
              {isUploading && (
                <div className="absolute inset-0 bg-brand-obsidian/80 z-[110] flex flex-col items-center justify-center rounded-[3.5rem]">
                  <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand-cyan animate-pulse">Sincronizando Ativo no Storage...</p>
                </div>
              )}
              
              <div className="flex justify-between items-center border-b border-brand-graphite pb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black uppercase text-brand-cyan tracking-tighter">Editor Hub</h2>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${editingArticle.status === 'published' ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-brand-amber/30 bg-brand-amber/10 text-brand-amber'}`}>
                    {editingArticle.status === 'published' ? 'LIVE' : 'RASCUNHO'}
                  </span>
                </div>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted hover:text-white transition-colors text-3xl">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-2 block">Título do Insight</label>
                    <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 outline-none focus:border-brand-cyan text-brand-soft" placeholder="Título atraente e SEO-friendly" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-2 block">URL Amigável (Fixo)</label>
                    <input type="text" value={editingArticle.slug} readOnly className="w-full bg-brand-obsidian/50 border border-brand-graphite rounded-2xl px-6 py-5 text-brand-muted font-mono text-xs cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-2 block">Resumo Curto (Search Snippet)</label>
                    <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 outline-none h-28 text-sm text-brand-soft" placeholder="Breve descrição para atrair o clique..." />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="rounded-[2.5rem] overflow-hidden border border-brand-graphite h-52 bg-brand-obsidian relative group shadow-2xl">
                    <img src={editingArticle.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview de Capa" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => fileInputRef.current?.click()} className="bg-white text-brand-obsidian px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-brand-cyan transition-colors">Trocar Imagem</button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-2 block">Segmentação de Categoria</label>
                    <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 outline-none focus:border-brand-cyan text-brand-soft" placeholder="Ex: IA, Marketing Digital, Tech..." />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-2 block">Conteúdo Editorial (HTML Estruturado)</label>
                <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-3xl px-8 py-8 outline-none h-80 font-mono text-sm leading-relaxed text-brand-soft" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-brand-graphite">
                <button onClick={saveEdit} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:border-white transition-all">Sincronizar Rascunho</button>
                <button onClick={() => handlePublish(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-6 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-brand-cyan/30 hover:bg-brand-purple hover:text-white transition-all transform hover:-translate-y-1">
                   {editingArticle.status === 'published' ? 'Atualizar Publicação' : '🚀 Lançar e Publicar Agora'}
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
