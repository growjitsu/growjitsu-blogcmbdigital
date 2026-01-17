
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc1ODYsImV4cCI6MjA4Mzc1MzU4Nn0.jJQpw4suKZof8caOsQ41PBOegESYqi-iLatK1qk4GzQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SQL_FIX_SCRIPT = `-- SCRIPT DEFINITIVO DE CRIAÇÃO - EXECUTE NO SQL EDITOR DO SUPABASE
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  slug TEXT UNIQUE,
  content TEXT,
  excerpt TEXT,
  category TEXT,
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
);

-- HABILITAR ACESSO PÚBLICO DE LEITURA (OPCIONAL SE USAR SERVICE KEY)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública para todos" ON public.posts FOR SELECT USING (true);
`;

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeMode, setActiveMode] = useState<'generate' | 'manage' | 'setup' | 'manual'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [themes, setThemes] = useState('');
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [schemaError, setSchemaError] = useState(false);
  
  // Estados para edição/upload de imagem
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Post Manual
  const [manualPost, setManualPost] = useState({
    title: '',
    category: 'Tecnologia',
    excerpt: '',
    content: '',
    status: 'published' as 'published' | 'pending'
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();
    
    // Listener para mudanças de auth (corrige o botão de encerrar operação)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (event === 'SIGNED_OUT') {
        addLog("Sessão encerrada com segurança.");
      }
    });

    loadAllContent();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadAllContent = async () => {
    try {
      const resPending = await fetch('/api/posts?status=pending');
      const dataPending = await resPending.json();
      
      if (dataPending.success) {
        setPendingArticles(dataPending.articles || []);
        setSchemaError(false);
      } else if (dataPending.error?.includes('not find the table') || dataPending.error?.includes('cache')) {
        setSchemaError(true);
        addLog("ALERTA: Tabela 'posts' não detectada no banco de dados.");
      }

      const resPub = await fetch('/api/posts?status=published');
      const dataPub = await resPub.json();
      if (dataPub.success) setPublishedArticles(dataPub.articles || []);
      
    } catch (e: any) {
      addLog(`Erro de Conexão: ${e.message}`);
    }
  };

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      loadAllContent();
    } catch (error: any) { 
      alert(`Erro: ${error.message}`); 
    } finally { 
      setIsLoggingIn(false); 
    }
  };

  const generateDailyPosts = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    addLog("Sincronizando com a Inteligência Editorial...");
    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: themes.split('\n').filter(t => t.trim()) })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`${data.count} novos rascunhos injetados como 'PENDENTE'.`);
        setThemes('');
        loadAllContent();
      } else throw new Error(data.error);
    } catch (error: any) { 
      addLog(`ERRO: ${error.message}`);
      if (error.message.includes('not find the table')) setActiveMode('setup');
    } finally { 
      setIsGenerating(false); 
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSaveManualPost = async () => {
    if (!manualPost.title || !manualPost.content) {
      alert("Título e Conteúdo são obrigatórios.");
      return;
    }

    setIsUploading(true);
    addLog("Iniciando criação de post manual...");
    
    try {
      let imageUrl = '';
      const slug = generateSlug(manualPost.title);

      if (newImageFile) {
        addLog("Fazendo upload da imagem...");
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: newImageFile,
          headers: {
            'x-file-name': `${slug}-${Date.now()}.${newImageFile.name.split('.').pop()}`,
            'content-type': newImageFile.type
          }
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imageUrl = uploadData.image_url;
        } else throw new Error(uploadData.error);
      } else {
        imageUrl = `https://images.unsplash.com/featured/?${encodeURIComponent(manualPost.category)}`;
      }

      const payload = {
        title: manualPost.title,
        slug: slug,
        content: manualPost.content,
        excerpt: manualPost.excerpt || manualPost.title,
        category: manualPost.category,
        status: manualPost.status,
        image_url: imageUrl,
        image: imageUrl,
        author: 'CMBDIGITAL',
        date: new Date().toLocaleDateString('pt-BR'),
        tags: [manualPost.category.toLowerCase()]
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        addLog("Post manual criado com sucesso.");
        setManualPost({ title: '', category: 'Tecnologia', excerpt: '', content: '', status: 'published' });
        setNewImageFile(null);
        setImagePreview(null);
        loadAllContent();
        setActiveMode('manage');
      } else throw new Error(data.error);

    } catch (e: any) {
      addLog(`Erro: ${e.message}`);
      alert(`Falha ao criar post: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePublish = async (id: string) => {
    let post = editingArticle || pendingArticles.find(d => d.id === id);
    if (!post) return;

    setIsUploading(true);
    addLog(`Iniciando sincronização de: ${post.title}...`);

    try {
      let finalImageUrl = post.image || post.image_url;

      if (newImageFile) {
        addLog("Fazendo upload da nova mídia...");
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: newImageFile,
          headers: {
            'x-file-name': `${post.slug}-${Date.now()}.${newImageFile.name.split('.').pop()}`,
            'content-type': newImageFile.type
          }
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          finalImageUrl = uploadData.image_url;
          addLog("Mídia atualizada com sucesso.");
        } else {
          throw new Error(uploadData.error || "Erro no upload da imagem.");
        }
      }

      const payload = { 
        ...post, 
        image_url: finalImageUrl,
        image: finalImageUrl,
        status: 'published', 
        date: post.status === 'published' ? post.date : new Date().toLocaleDateString('pt-BR') 
      };

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        addLog("Protocolo Ativado e sincronizado.");
        setEditingArticle(null);
        setNewImageFile(null);
        setImagePreview(null);
        loadAllContent();
        setActiveMode('manage');
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) { 
      addLog(`Falha técnica: ${e.message}`);
      alert(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (article: Article) => {
    setEditingArticle(article);
    setImagePreview(null);
    setNewImageFile(null);
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <form onSubmit={handleLogin} className="p-10 rounded-[3rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Terminal Central</h1>
          <div className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="Acesso" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-5 text-white outline-none focus:border-brand-cyan" placeholder="Senha" required />
          </div>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-white transition-all">{isLoggingIn ? 'Iniciando Sessão...' : 'Conectar ao Terminal'}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Centro de <span className="text-brand-cyan">Operações</span></h1>
            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={() => setActiveMode('generate')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'generate' ? 'bg-brand-cyan text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Curadoria IA</button>
              <button onClick={() => setActiveMode('manual')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'manual' ? 'bg-brand-purple text-white' : 'bg-brand-graphite text-brand-muted'}`}>Post Manual</button>
              <button onClick={() => setActiveMode('manage')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMode === 'manage' ? 'bg-brand-cyan text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>Insights Ativos ({publishedArticles.length})</button>
              <button onClick={() => setActiveMode('setup')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeMode === 'setup' ? 'bg-brand-amber text-brand-obsidian' : 'bg-brand-graphite text-brand-muted'}`}>
                Reparar Banco
                {schemaError && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
              </button>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="px-8 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-500 transition-all">Encerrar Operação</button>
        </div>

        {activeMode === 'manual' && (
          <div className="animate-in fade-in duration-500 space-y-10">
            <div className="p-10 rounded-[3rem] bg-brand-graphite/40 border border-brand-graphite/50 backdrop-blur-sm space-y-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Criar Postagem Manual</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Título</label>
                    <input type="text" value={manualPost.title} onChange={e => setManualPost({...manualPost, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-brand-cyan" placeholder="Ex: Guia Completo de Marketing 2025" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Conteúdo (HTML)</label>
                    <textarea value={manualPost.content} onChange={e => setManualPost({...manualPost, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-sm h-96 font-mono outline-none focus:border-brand-cyan" placeholder="<h2>Subtítulo</h2><p>Texto...</p>" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Capa</label>
                    <div className="aspect-video rounded-3xl bg-brand-obsidian border border-brand-graphite flex flex-col items-center justify-center overflow-hidden relative group">
                      {imagePreview ? (
                        <img src={imagePreview} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-brand-muted text-[10px] uppercase font-bold tracking-widest text-center px-4">Nenhuma imagem selecionada</span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => fileInputRef.current?.click()} className="bg-brand-cyan text-brand-obsidian px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Escolher Arquivo</button>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Categoria</label>
                    <select value={manualPost.category} onChange={e => setManualPost({...manualPost, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-white text-xs font-bold outline-none focus:border-brand-cyan">
                      <option>Tecnologia</option>
                      <option>Inteligência Artificial</option>
                      <option>Marketing Digital</option>
                      <option>Produtividade</option>
                      <option>Renda Online</option>
                      <option>Ferramentas</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Resumo (Excerpt)</label>
                    <textarea value={manualPost.excerpt} onChange={e => setManualPost({...manualPost, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-xs h-32 outline-none focus:border-brand-cyan" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Status de Publicação</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setManualPost({...manualPost, status: 'published'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${manualPost.status === 'published' ? 'bg-brand-cyan border-brand-cyan text-brand-obsidian' : 'bg-transparent border-brand-graphite text-brand-muted'}`}>Publicado</button>
                      <button onClick={() => setManualPost({...manualPost, status: 'pending'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${manualPost.status === 'pending' ? 'bg-brand-amber border-brand-amber text-brand-obsidian' : 'bg-transparent border-brand-graphite text-brand-muted'}`}>Rascunho</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <button onClick={handleSaveManualPost} disabled={isUploading} className="w-full py-6 rounded-2xl bg-brand-cyan text-brand-obsidian font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-cyan/20 hover:scale-[1.01] transition-all disabled:opacity-50">
                {isUploading ? 'Processando Protocolo...' : 'Efetivar Postagem Manual'}
              </button>
            </div>
          </div>
        )}

        {activeMode === 'setup' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-10">
            <div className={`p-10 rounded-[3rem] border transition-all ${schemaError ? 'bg-red-500/5 border-red-500/20' : 'bg-brand-graphite border-brand-amber/30'}`}>
               <h2 className={`text-2xl font-black mb-6 uppercase tracking-tighter ${schemaError ? 'text-red-400' : 'text-brand-amber'}`}>
                 {schemaError ? 'Tabela Não Localizada!' : 'Protocolo de Manutenção'}
               </h2>
               <p className="text-sm text-brand-muted mb-8 leading-relaxed max-w-2xl">
                 A base de dados Supabase requer a estrutura correta para operar. Copie o script abaixo, acesse seu <strong>Dashboard do Supabase</strong>, abra o <strong>SQL Editor</strong>, cole o código e clique em <strong>Run</strong>.
               </p>
               <div className="relative">
                 <pre className="bg-brand-obsidian p-8 rounded-3xl text-[11px] font-mono text-brand-cyan overflow-x-auto border border-brand-graphite mb-8 leading-relaxed">
                   {SQL_FIX_SCRIPT}
                 </pre>
                 <button onClick={() => { navigator.clipboard.writeText(SQL_FIX_SCRIPT); alert("Protocolo copiado para a área de transferência!"); }} className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/10 transition-all">Copiar</button>
               </div>
               <div className="flex gap-4">
                 <button onClick={loadAllContent} className="bg-brand-cyan text-brand-obsidian px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">Verificar Novamente</button>
                 <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="bg-brand-graphite text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest border border-brand-graphite hover:border-white/20 transition-all flex items-center">Acessar Supabase Dashboard ↗</a>
               </div>
            </div>
          </div>
        )}

        {activeMode === 'generate' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 p-10 rounded-[3rem] bg-brand-graphite/40 border border-brand-graphite/50 backdrop-blur-sm">
                <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Direcionamento Editorial</label>
                <textarea value={themes} onChange={(e) => setThemes(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-6 text-sm focus:border-brand-cyan outline-none min-h-[140px] text-brand-soft" placeholder="Ex: Tendências de IA para E-commerce em 2025..." />
                <button onClick={generateDailyPosts} disabled={isGenerating} className="w-full mt-6 py-6 rounded-2xl font-black text-xs uppercase bg-brand-cyan text-brand-obsidian shadow-xl shadow-brand-cyan/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50">
                  {isGenerating ? 'Curadoria em Processo...' : 'Sincronizar Novos Insights'}
                </button>
              </div>
              <div className="p-8 rounded-[3rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 overflow-y-auto h-[280px]">
                <div className="mb-4 text-white font-black border-b border-brand-graphite pb-2 uppercase text-[9px] flex justify-between">
                  Log de Operações
                  <span className="animate-pulse">● ONLINE</span>
                </div>
                {logs.length === 0 ? <div className="text-brand-muted italic">Aguardando pautas...</div> : logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-4">
                Protocolos Aguardando Revisão
                <span className="bg-brand-graphite px-4 py-1.5 rounded-full text-[10px] text-brand-cyan border border-brand-graphite">{pendingArticles.length}</span>
              </h2>
              {pendingArticles.length === 0 && !isGenerating && (
                <div className="py-20 text-center border-2 border-dashed border-brand-graphite/30 rounded-[4rem]">
                  <p className="text-brand-muted uppercase font-black text-[10px] tracking-widest">Nenhum rascunho pendente no momento</p>
                </div>
              )}
              {pendingArticles.map(article => (
                <div key={article.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex items-center gap-8 group hover:border-brand-cyan transition-all">
                  <img src={article.image} className="w-24 h-24 rounded-2xl object-cover bg-brand-obsidian shadow-2xl" />
                  <div className="flex-grow">
                    <h3 className="text-xl font-black text-white mb-2">{article.title}</h3>
                    <p className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">{article.category} • PENDENTE</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEditing(article)} className="text-[9px] font-black bg-white text-brand-obsidian px-6 py-3.5 rounded-xl hover:bg-brand-cyan transition-all">Revisar</button>
                    <button onClick={() => handlePublish(article.id)} className="text-[9px] font-black bg-brand-cyan text-brand-obsidian px-6 py-3.5 rounded-xl hover:bg-brand-purple hover:text-white transition-all">Aprovar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMode === 'manage' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <h2 className="text-xl font-black uppercase tracking-widest text-brand-cyan mb-10">Artigos Publicados</h2>
             <div className="grid grid-cols-1 gap-4">
               {publishedArticles.map(article => (
                  <div key={article.id} className="p-6 rounded-[2.5rem] bg-brand-graphite/20 border border-brand-graphite/30 flex items-center gap-6 hover:bg-brand-graphite/40 transition-all">
                    <img src={article.image} className="w-20 h-20 rounded-2xl object-cover" />
                    <div className="flex-grow">
                      <h3 className="text-md font-bold text-white">{article.title}</h3>
                      <p className="text-[9px] text-brand-muted uppercase tracking-widest font-mono">{article.date} • {article.category}</p>
                    </div>
                    <button onClick={() => startEditing(article)} className="text-[9px] font-black border border-brand-graphite px-6 py-3 rounded-xl hover:border-brand-cyan hover:text-brand-cyan transition-all">Editar</button>
                  </div>
               ))}
             </div>
          </div>
        )}

        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-5xl p-10 md:p-16 rounded-[4rem] border border-brand-graphite shadow-2xl space-y-10 my-10 relative animate-in zoom-in duration-300">
              <button onClick={() => setEditingArticle(null)} className="absolute top-10 right-10 text-brand-muted hover:text-white text-4xl">×</button>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-cyan">Refinamento de Protocolo</span>
                <h2 className="text-3xl font-black uppercase text-white tracking-tighter">Editor Editorial</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                  <div className="space-y-4">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">Título do Insight</label>
                    <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-8 py-5 text-white font-bold outline-none focus:border-brand-cyan transition-all" />
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">Conteúdo Estruturado (HTML)</label>
                    <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-3xl px-8 py-8 text-sm h-96 font-mono leading-relaxed outline-none focus:border-brand-cyan text-brand-soft shadow-inner transition-all" />
                  </div>
                </div>

                <div className="space-y-8">
                   <div className="space-y-6">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">Capa do Insight</label>
                      <div className="relative group aspect-video rounded-3xl overflow-hidden border border-brand-graphite bg-brand-obsidian flex items-center justify-center">
                        <img 
                          src={imagePreview || editingArticle.image || editingArticle.image_url} 
                          alt="Capa" 
                          className={`w-full h-full object-cover transition-opacity duration-500 ${isUploading ? 'opacity-30' : 'opacity-100'}`} 
                        />
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                           <button onClick={() => fileInputRef.current?.click()} className="bg-brand-cyan text-brand-obsidian p-3 rounded-xl hover:scale-110 transition-transform">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                           </button>
                        </div>
                      </div>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      <p className="text-[9px] text-brand-muted italic leading-relaxed">
                        Dica: Se você não selecionar uma nova imagem, a atual será mantida. Imagens devem ser preferencialmente 16:9.
                      </p>
                   </div>

                   <div className="space-y-4">
                     <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">Categoria</label>
                     <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-brand-cyan" />
                   </div>

                   <div className="space-y-4">
                     <label className="block text-[9px] font-black uppercase tracking-widest text-brand-muted">Resumo (Excerpt)</label>
                     <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-2xl px-6 py-4 text-xs h-32 outline-none focus:border-brand-cyan" />
                   </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-brand-graphite">
                <button 
                  onClick={() => handlePublish(editingArticle.id)} 
                  disabled={isUploading}
                  className="flex-grow bg-brand-cyan text-brand-obsidian py-7 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-brand-cyan/20 hover:bg-brand-purple hover:text-white transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Sincronizando Dados...' : 'Finalizar e Sincronizar Insight'}
                </button>
                <button onClick={() => setEditingArticle(null)} className="sm:w-1/4 border border-brand-graphite text-brand-muted py-7 rounded-3xl font-black uppercase text-xs tracking-widest hover:text-white transition-all">Descartar Alterações</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
