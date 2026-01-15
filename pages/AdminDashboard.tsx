
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
  const [loginError, setLoginError] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [themes, setThemes] = useState('');
  const [drafts, setDrafts] = useState<Article[]>([]);
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
      const { error } = await supabase.auth.signInWithPassword({
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

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

  const generateDailyPosts = async () => {
    setIsGenerating(true);
    setLogs([]);
    addLog("Iniciando Protocolo de Curadoria...");
    const themesList = themes.split('\n').filter(t => t.trim() !== '');

    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: themesList })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Erro no servidor.");

      const newArticles = data.articles || [];
      const updatedDrafts = [...newArticles, ...drafts];
      setDrafts(updatedDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(updatedDrafts));
      setThemes('');
      addLog(`Sucesso: ${newArticles.length} rascunhos gerados.`);
    } catch (error: any) {
      addLog(`FALHA: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (article: Article) => {
    setEditingArticle({ ...article });
  };

  const saveEdit = () => {
    if (!editingArticle) return;
    const updatedDrafts = drafts.map(d => d.id === editingArticle.id ? editingArticle : d);
    setDrafts(updatedDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(updatedDrafts));
    setEditingArticle(null);
    addLog("Rascunho atualizado localmente.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Erro: Limite de 2MB.");
      return;
    }

    setIsUploading(true);
    addLog(`Enviando imagem via Proxy Administrativo...`);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingArticle.slug || 'post'}-${Date.now()}.${fileExt}`;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-file-name': fileName,
          'content-type': file.type,
        },
        body: file
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.reason || data.error || "Erro de permissão no Storage.");
      }

      setEditingArticle({ 
        ...editingArticle, 
        image: data.image_url, 
        image_source: 'upload' 
      });
      
      addLog("SUCESSO: Imagem persistida com bypass RLS.");
      
    } catch (error: any) {
      addLog(`FALHA NO STORAGE: ${error.message}`);
      alert(`Erro crítico no Storage:\n\n${error.message}\n\n1. Verifique se o bucket 'blog-images' existe.\n2. Verifique se a chave Service Role está correta no backend.`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const regenerateImage = async () => {
    if (!editingArticle) return;
    setIsRegeneratingImage(true);
    addLog("Regenerando imagem via IA...");
    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'regenerate_image', 
          title: editingArticle.title,
          category: editingArticle.category
        })
      });
      const data = await response.json();
      if (data.success) {
        setEditingArticle({ 
          ...editingArticle, 
          image: data.image, 
          image_source: 'ai' 
        });
        addLog("Nova imagem persistida.");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      addLog(`Erro: ${error.message}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const publishArticle = (id: string) => {
    if (editingArticle && editingArticle.id === id) saveEdit();
    
    const articleToPublish = drafts.find(d => d.id === id) || (editingArticle?.id === id ? editingArticle : null);
    if (!articleToPublish) return;

    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    const newPublished = [{ ...articleToPublish, status: 'published' }, ...published];
    localStorage.setItem('cmb_published', JSON.stringify(newPublished));
    
    const remainingDrafts = drafts.filter(d => d.id !== id);
    setDrafts(remainingDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    
    addLog("Artigo publicado com sucesso.");
    alert("Publicado!");
    if (editingArticle?.id === id) setEditingArticle(null);
  };

  const deleteDraft = (id: string) => {
    if (!confirm("Excluir?")) return;
    const remaining = drafts.filter(d => d.id !== id);
    setDrafts(remaining);
    localStorage.setItem('cmb_drafts', JSON.stringify(remaining));
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-black text-brand-soft uppercase tracking-tighter mb-8 text-white">Terminal Editorial</h1>
          <form onSubmit={handleLogin} className="p-8 rounded-[2.5rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-6">
            {loginError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">{loginError}</div>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-soft outline-none focus:border-brand-cyan" placeholder="E-mail" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-soft outline-none focus:border-brand-cyan" placeholder="Senha" required />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-4 rounded-xl font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-xl shadow-brand-cyan/20">{isLoggingIn ? 'Autenticando...' : 'Acessar Terminal'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-2 text-white">Motor <span className="text-brand-cyan">Editorial</span></h1>
            <p className="text-brand-muted font-mono text-xs uppercase tracking-widest">Persistência Garantida (Service Role)</p>
          </div>
          <button onClick={handleLogout} className="px-6 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500 transition-all">Sair</button>
        </div>

        {/* MODAL DE EDIÇÃO */}
        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-4xl p-8 md:p-12 rounded-[3rem] border border-brand-graphite shadow-2xl space-y-8 my-8 relative">
              
              {isUploading && (
                <div className="absolute inset-0 bg-brand-obsidian/80 z-[110] flex flex-col items-center justify-center rounded-[3rem] backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-black text-xs uppercase tracking-widest text-brand-cyan animate-pulse text-center">Bypass RLS: Validando Bucket 'blog-images'...</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-cyan">Revisão Editorial</h2>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted hover:text-white transition-colors text-3xl">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" placeholder="Título" />
                  <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-24" placeholder="Resumo" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none" placeholder="Categoria" />
                    <input type="text" value={editingArticle.slug} onChange={(e) => setEditingArticle({...editingArticle, slug: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none" placeholder="Slug" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl overflow-hidden border border-brand-graphite h-52 bg-brand-obsidian relative group shadow-2xl">
                    <img src={editingArticle.image} className="w-full h-full object-cover" alt="Editor" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4 p-4">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-[220px] bg-white text-brand-obsidian px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">📤 Upload Manual</button>
                      <button onClick={regenerateImage} disabled={isRegeneratingImage} className="w-full max-w-[220px] bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">🔄 IA Image</button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <input type="text" value={editingArticle.image} readOnly className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-muted text-[10px] font-mono truncate" />
                </div>
              </div>

              <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-64 font-mono text-sm" placeholder="Conteúdo HTML/Markdown" />

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-brand-graphite">
                <button onClick={saveEdit} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-5 rounded-2xl font-black uppercase tracking-widest">Salvar</button>
                <button onClick={() => publishArticle(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest">🚀 Publicar</button>
              </div>
            </div>
          </div>
        )}

        {/* GRID DE RASCUNHOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-xl">
            <textarea value={themes} onChange={(e) => setThemes(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm focus:border-brand-cyan outline-none" placeholder="Temas..." rows={3} />
            <button onClick={generateDailyPosts} disabled={isGenerating} className="w-full mt-6 py-5 rounded-2xl font-black text-xs uppercase bg-brand-cyan text-brand-obsidian">{isGenerating ? 'Gerando...' : 'Gerar Posts'}</button>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 overflow-y-auto max-h-[200px]">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>

        <div className="space-y-8">
          {drafts.map(draft => (
            <div key={draft.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-8">
              <img src={draft.image} className="md:w-48 h-32 rounded-2xl object-cover bg-brand-obsidian" />
              <div className="flex-grow">
                <h3 className="text-xl font-black mb-2 text-white">{draft.title}</h3>
                <div className="flex gap-3">
                  <button onClick={() => startEditing(draft)} className="text-[10px] font-black uppercase tracking-widest bg-white text-brand-obsidian px-4 py-2 rounded-lg">Editar</button>
                  <button onClick={() => publishArticle(draft.id)} className="text-[10px] font-black uppercase tracking-widest bg-brand-cyan text-brand-obsidian px-4 py-2 rounded-lg">Publicar</button>
                  <button onClick={() => deleteDraft(draft.id)} className="text-[10px] font-black uppercase tracking-widest border border-brand-graphite text-brand-muted px-4 py-2 rounded-lg">Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
