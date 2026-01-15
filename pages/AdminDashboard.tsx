
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc1ODYsImV4cCI6MjA4Mzc1MzU4Nn0.jJQpw4suKZof8caOsQ41PBOegESYqi-iLatK1qk4GzQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const parseDate = (dateStr: string) => {
  const months: { [key: string]: number } = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  const cleanStr = dateStr.toLowerCase().replace(' de ', ' ');
  const parts = cleanStr.split(' ');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), months[parts[1].replace(',', '')], parseInt(parts[0]));
  }
  return new Date(dateStr);
};

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [themes, setThemes] = useState('');
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();

    // Carregamento Unificado
    const savedDrafts = JSON.parse(localStorage.getItem('cmb_drafts') || '[]');
    const savedPublished = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    
    // Mesclar estáticos com publicados do storage para edição universal
    const storageSlugs = new Set(savedPublished.map((a: Article) => a.slug));
    const staticPosts = STATIC_ARTICLES.filter(a => !storageSlugs.has(a.slug)).map(a => ({...a, status: 'published' as const}));
    
    const combinedPublished = [...savedPublished, ...staticPosts].sort((a, b) => 
      parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );

    setDrafts(savedDrafts);
    setPublishedArticles(combinedPublished);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error: any) { alert(error.message); } finally { setIsLoggingIn(false); }
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

  // FIX: Added missing startEditing function to handle UI callbacks
  const startEditing = (article: Article) => {
    setEditingArticle(article);
    addLog(`Iniciando edição de: ${article.title}`);
  };

  const saveEdit = () => {
    if (!editingArticle) return;
    if (editingArticle.status === 'published') {
      const updated = publishedArticles.map(a => a.id === editingArticle.id ? editingArticle : a);
      setPublishedArticles(updated);
      // Salvar apenas os que não são idênticos aos estáticos ou salvar todos para garantir edição
      localStorage.setItem('cmb_published', JSON.stringify(updated));
      addLog(`Asset "${editingArticle.title}" sincronizado.`);
    } else {
      const updated = drafts.map(d => d.id === editingArticle.id ? editingArticle : d);
      setDrafts(updated);
      localStorage.setItem('cmb_drafts', JSON.stringify(updated));
      addLog(`Rascunho atualizado.`);
    }
    setEditingArticle(null);
  };

  const publishArticle = (id: string) => {
    const post = drafts.find(d => d.id === id) || publishedArticles.find(a => a.id === id) || (editingArticle?.id === id ? editingArticle : null);
    if (!post) return;

    const publishedPost = { ...post, status: 'published' as const };
    const filteredPublished = publishedArticles.filter(a => a.id !== id);
    const newPublished = [publishedPost, ...filteredPublished].sort((a, b) => 
      parseDate(b.date).getTime() - parseDate(a.date).getTime()
    );

    setPublishedArticles(newPublished);
    localStorage.setItem('cmb_published', JSON.stringify(newPublished));
    
    setDrafts(drafts.filter(d => d.id !== id));
    localStorage.setItem('cmb_drafts', JSON.stringify(drafts.filter(d => d.id !== id)));
    
    addLog(`Post Live: ${publishedPost.title}`);
    setEditingArticle(null);
  };

  const unpublishArticle = (id: string) => {
    const post = publishedArticles.find(a => a.id === id);
    if (!post) return;
    const draftPost = { ...post, status: 'draft' as const };
    setPublishedArticles(publishedArticles.filter(a => a.id !== id));
    localStorage.setItem('cmb_published', JSON.stringify(publishedArticles.filter(a => a.id !== id)));
    setDrafts([draftPost, ...drafts]);
    localStorage.setItem('cmb_drafts', JSON.stringify([draftPost, ...drafts]));
    addLog("Post movido para rascunhos.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;
    setIsUploading(true);
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
      addLog("Imagem atualizada no storage.");
    } catch (e: any) { alert(e.message); } finally { setIsUploading(false); }
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <form onSubmit={handleLogin} className="p-8 rounded-[2.5rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-6 w-full max-w-md">
          <h1 className="text-2xl font-black text-white text-center uppercase">Motor Editorial</h1>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-white outline-none" placeholder="Admin E-mail" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-white outline-none" placeholder="Senha" />
          <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-4 rounded-xl font-black uppercase">{isLoggingIn ? 'Acessando...' : 'Entrar'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Gestão <span className="text-brand-cyan">Unificada</span></h1>
            <p className="text-brand-muted font-mono text-xs uppercase tracking-widest">Todos os posts (Legados + Novos) são editáveis</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="px-6 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500">Sair</button>
        </div>

        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-5xl p-8 md:p-12 rounded-[3.5rem] border border-brand-graphite shadow-2xl space-y-8 my-8 relative">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase text-brand-cyan">Editor Global</h2>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted text-3xl">×</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none" placeholder="Título" />
                  <input type="text" value={editingArticle.slug} readOnly className="w-full bg-brand-obsidian/50 border border-brand-graphite rounded-xl px-5 py-4 text-brand-muted cursor-not-allowed font-mono text-xs" />
                  <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none h-24 text-sm" placeholder="Resumo" />
                </div>
                <div className="space-y-6">
                  <div className="rounded-[2rem] overflow-hidden border border-brand-graphite h-48 bg-brand-obsidian relative group">
                    <img src={editingArticle.image} className="w-full h-full object-cover" alt="Editor" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => fileInputRef.current?.click()} className="bg-white text-brand-obsidian px-6 py-3 rounded-xl font-black text-xs uppercase">Trocar Imagem</button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none" placeholder="Categoria" />
                </div>
              </div>
              <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-8 py-8 outline-none h-80 font-mono text-sm leading-relaxed" placeholder="Conteúdo HTML" />
              <div className="flex gap-4 pt-8 border-t border-brand-graphite">
                <button onClick={saveEdit} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-6 rounded-2xl font-black uppercase">Salvar Alterações</button>
                <button onClick={() => publishArticle(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-6 rounded-2xl font-black uppercase shadow-2xl">Lançar Atualização</button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-12">
          {/* Seção de Publicados - Agora inclui os posts estáticos */}
          <div className="space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-brand-cyan border-b border-brand-cyan/20 pb-6">Ativos Publicados ({publishedArticles.length})</h2>
            <div className="grid grid-cols-1 gap-4">
              {publishedArticles.map(article => (
                <div key={article.id} className="p-6 rounded-3xl bg-brand-cyan/5 border border-brand-cyan/10 flex flex-col md:flex-row gap-8 items-center group">
                  <img src={article.image} className="w-32 h-20 rounded-2xl object-cover bg-brand-obsidian" />
                  <div className="flex-grow">
                    <h3 className="text-lg font-black text-white">{article.title}</h3>
                    <p className="text-[10px] text-brand-muted font-mono">{article.date} • {article.slug}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEditing(article)} className="text-[9px] font-black uppercase bg-brand-cyan text-brand-obsidian px-5 py-3 rounded-xl">✏️ Editar</button>
                    <button onClick={() => unpublishArticle(article.id)} className="text-[9px] font-black uppercase border border-brand-cyan/30 text-brand-cyan px-5 py-3 rounded-xl">Despublicar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção de Rascunhos */}
          <div className="space-y-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-brand-graphite pb-6">Fila de Rascunhos ({drafts.length})</h2>
            {drafts.map(draft => (
              <div key={draft.id} className="p-6 rounded-3xl bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-8 items-center">
                <img src={draft.image} className="w-32 h-20 rounded-2xl object-cover" />
                <div className="flex-grow"><h3 className="text-lg font-black text-white">{draft.title}</h3></div>
                <button onClick={() => startEditing(draft)} className="text-[9px] font-black uppercase bg-white text-brand-obsidian px-5 py-3 rounded-xl">Revisar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
