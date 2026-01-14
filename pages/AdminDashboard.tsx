
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

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
  const [themes, setThemes] = useState('');
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

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
    addLog("Iniciando Protocolo de Curadoria (PT-BR)...");

    const themesList = themes.split('\n').filter(t => t.trim() !== '');

    try {
      if (themesList.length > 0) {
        addLog(`Temas detectados: ${themesList.length}. Focando produção...`);
      } else {
        addLog("Nenhum tema manual. Usando curadoria automática de tendências...");
      }
      
      addLog("Solicitando geração de texto e imagens reais...");
      
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: themesList })
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.details || data.error || "Erro no servidor.");
      }

      const newArticles = data.articles || [];
      addLog(`Sucesso: ${newArticles.length} artigos e imagens gerados.`);
      
      const updatedDrafts = [...newArticles, ...drafts];
      setDrafts(updatedDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(updatedDrafts));
      
      setThemes(''); // Limpar temas após sucesso
      addLog("FINALIZADO: Conteúdo em Português pronto para publicação.");

    } catch (error: any) {
      console.error(error);
      addLog(`FALHA: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishArticle = (id: string) => {
    const articleToPublish = drafts.find(d => d.id === id);
    if (!articleToPublish) return;
    const formattedContent = articleToPublish.content.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');
    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    localStorage.setItem('cmb_published', JSON.stringify([{ ...articleToPublish, content: formattedContent, status: 'published' }, ...published]));
    const remainingDrafts = drafts.filter(d => d.id !== id);
    setDrafts(remainingDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    alert("Publicado no Hub!");
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
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-black text-brand-soft uppercase tracking-tighter mb-8">Terminal Editorial</h1>
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
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-2">Motor <span className="text-brand-cyan">Editorial</span></h1>
            <p className="text-brand-muted font-mono text-xs uppercase">Curadoria Premium: Ativa (PT-BR + Imagens Reais)</p>
          </div>
          <button onClick={handleLogout} className="px-6 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500 transition-all">Sair</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-[2.5rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-xl">
              <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Configuração Estratégica (Temas)</label>
              <textarea 
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm font-medium focus:border-brand-cyan outline-none transition-all placeholder:text-brand-muted/30"
                placeholder="Ex: Inteligência Artificial para pequenos negócios&#10;Marketing Digital em 2026&#10;Tendências de Tecnologia no Brasil"
                rows={4}
              />
              <p className="mt-4 text-[9px] text-brand-muted uppercase font-bold tracking-widest">Dica: Escreva um tema por linha para gerar múltiplos artigos específicos.</p>
              
              <button 
                onClick={generateDailyPosts} 
                disabled={isGenerating} 
                className={`w-full mt-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${isGenerating ? 'bg-brand-graphite cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:scale-[1.02] shadow-brand-cyan/20'}`}
              >
                {isGenerating ? 'Executando Protocolo...' : 'Adicionar Varredura Neural'}
              </button>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 min-h-[250px] shadow-inner flex flex-col">
            <span className="mb-4 pb-2 border-b border-brand-graphite/30 uppercase font-black opacity-50">Terminal Editorial v2.5</span>
            <div className="flex-grow">
              {logs.length === 0 ? '> Pronto para curadoria...' : logs.map((log, i) => <div key={i} className="mb-1 animate-fade-in">{log}</div>)}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="flex items-center justify-between border-b border-brand-graphite pb-8">
            <h2 className="text-2xl font-black uppercase tracking-widest">Fila de Rascunhos ({drafts.length})</h2>
          </div>
          {drafts.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-brand-graphite rounded-[3rem] text-brand-muted italic">Aguardando varredura neural para preencher a fila...</div>
          ) : (
            <div className="grid grid-cols-1 gap-10">
              {drafts.map(draft => (
                <div key={draft.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-10 hover:border-brand-cyan/40 transition-all group overflow-hidden">
                  <div className="md:w-64 h-48 rounded-[2rem] overflow-hidden border border-brand-graphite shrink-0 bg-brand-obsidian">
                    <img src={draft.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90" alt="Preview" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-brand-purple font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20">{draft.category}</span>
                      <span className="text-brand-muted font-mono text-[10px]">{draft.date}</span>
                    </div>
                    <h3 className="text-2xl font-black mb-4 tracking-tighter leading-tight group-hover:text-brand-cyan transition-colors">{draft.title}</h3>
                    <p className="text-brand-muted text-sm line-clamp-2 mb-8">{draft.excerpt}</p>
                    <div className="flex gap-4">
                      <button onClick={() => publishArticle(draft.id)} className="px-8 py-3.5 rounded-2xl bg-brand-cyan text-brand-obsidian font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-lg">Aprovar e Publicar</button>
                      <button onClick={() => deleteDraft(draft.id)} className="px-8 py-3.5 rounded-2xl border border-brand-graphite text-brand-muted font-black text-[10px] uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all">Descartar</button>
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
