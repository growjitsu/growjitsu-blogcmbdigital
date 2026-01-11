
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

  // Fecha o menu mobile e rola para o topo em cada mudança de página
  // Isso resolve o problema de clicar em links do rodapé e continuar no final da página
  useEffect(() => {
    setIsMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleSubscribeClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('newsletter');
        if (el) {
          const yOffset = -100;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 200);
    } else {
      const el = document.getElementById('newsletter');
      if (el) {
        const yOffset = -100;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${isDark ? 'bg-brand-obsidian' : 'bg-brand-lightBg'}`}>
      {/* Header */}
      <header className={`border-b transition-colors border-opacity-50 sticky top-0 z-50 backdrop-blur-md ${isDark ? 'bg-brand-obsidian/80 border-brand-graphite' : 'bg-white/80 border-slate-200'}`}>
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${isDark ? 'bg-brand-cyan shadow-brand-cyan/20' : 'bg-brand-purple shadow-brand-purple/20'}`}>
              <span className={`font-black text-xl ${isDark ? 'text-brand-obsidian' : 'text-white'}`}>C</span>
            </div>
            <span className={`text-2xl font-black tracking-tighter ${isDark ? 'text-brand-soft' : 'text-slate-900'}`}>CMBDIGITAL</span>
          </Link>

          {/* Navegação Desktop */}
          <nav className={`hidden lg:flex space-x-8 text-xs font-bold uppercase tracking-[0.2em] ${isDark ? 'text-brand-muted' : 'text-slate-500'}`}>
            <Link to="/" className="hover:text-brand-cyan transition-colors">Início</Link>
            <Link to="/sobre" className="hover:text-brand-cyan transition-colors">Sobre Nós</Link>
            <Link to="/contato" className="hover:text-brand-cyan transition-colors">Contato</Link>
            <Link to="/termos" className="hover:text-brand-cyan transition-colors">Termos</Link>
          </nav>

          <div className="flex items-center space-x-6">
            <button 
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all hover:scale-110 ${isDark ? 'border-brand-graphite text-brand-cyan bg-brand-graphite/30' : 'border-slate-200 text-brand-purple bg-slate-50'}`}
              aria-label="Alternar Tema"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.657 7.657l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>

            <div className="hidden md:block">
              <button 
                onClick={handleSubscribeClick}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all transform hover:-translate-y-0.5 shadow-lg ${isDark ? 'bg-brand-cyan text-brand-obsidian shadow-brand-cyan/10' : 'bg-brand-purple text-white shadow-brand-purple/10'}`}
              >
                Assinar News
              </button>
            </div>

            <button className={`lg:hidden ${isDark ? 'text-brand-soft' : 'text-slate-900'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className={`lg:hidden absolute w-full left-0 p-6 flex flex-col space-y-6 shadow-2xl transition-colors ${isDark ? 'bg-brand-obsidian border-b border-brand-graphite' : 'bg-white border-b border-slate-200'}`}>
            <Link to="/" className={`font-bold text-lg ${isDark ? 'text-brand-soft' : 'text-slate-900'}`}>Início</Link>
            <Link to="/sobre" className={`font-bold text-lg ${isDark ? 'text-brand-soft' : 'text-slate-900'}`}>Sobre Nós</Link>
            <Link to="/contato" className={`font-bold text-lg ${isDark ? 'text-brand-soft' : 'text-slate-900'}`}>Contato</Link>
            <Link to="/termos" className={`font-bold text-lg ${isDark ? 'text-brand-soft' : 'text-slate-900'}`}>Termos de Uso</Link>
            <div className={`pt-4 border-t flex flex-col space-y-4 ${isDark ? 'border-brand-graphite' : 'border-slate-100'}`}>
              <button 
                onClick={handleSubscribeClick}
                className={`text-left font-bold text-lg ${isDark ? 'text-brand-cyan' : 'text-brand-purple'}`}
              >
                Assinar News
              </button>
              <Link to="/privacidade" className="text-brand-muted text-sm font-medium">Privacidade</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      {/* Rodapé */}
      <footer className={`border-t transition-colors pt-20 pb-10 ${isDark ? 'bg-brand-obsidian border-brand-graphite text-brand-soft' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <h2 className={`text-4xl font-black mb-6 tracking-tighter ${isDark ? 'text-brand-cyan' : 'text-brand-purple'}`}>CMBDIGITAL</h2>
              <p className={`max-w-md text-lg leading-relaxed ${isDark ? 'text-brand-muted' : 'text-slate-500'}`}>
                Autoridade em Tecnologia, IA e Marketing Digital. Nossa missão é transformar conhecimento complexo em resultados reais para empreendedores brasileiros.
              </p>
            </div>
            <div>
              <h3 className={`font-bold uppercase tracking-[0.2em] text-xs mb-8 text-brand-purple`}>Explorar</h3>
              <ul className={`space-y-4 ${isDark ? 'text-brand-muted' : 'text-slate-500'}`}>
                <li><Link to="/sobre" className="hover:text-brand-cyan transition-colors">Sobre Nós</Link></li>
                <li><Link to="/contato" className="hover:text-brand-cyan transition-colors">Contato</Link></li>
                <li><Link to="/privacidade" className="hover:text-brand-cyan transition-colors">Privacidade</Link></li>
                <li><Link to="/termos" className="hover:text-brand-cyan transition-colors">Termos de Uso</Link></li>
              </ul>
            </div>
            <div>
              <h3 className={`font-bold uppercase tracking-[0.2em] text-xs mb-8 text-brand-purple`}>Suporte</h3>
              <ul className={`space-y-4 ${isDark ? 'text-brand-muted' : 'text-slate-500'}`}>
                <li className="flex items-center space-x-2">
                  <span className="text-brand-cyan">📧</span>
                  <span className="text-sm">contatocmbdigital@gmail.com</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-brand-cyan">🌐</span>
                  <span className="text-sm">Autoridade Digital Global</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className={`border-t pt-10 flex flex-col md:flex-row justify-between items-center text-xs font-medium uppercase tracking-widest ${isDark ? 'border-brand-graphite text-brand-muted' : 'border-slate-200 text-slate-400'}`}>
            <p>&copy; 2025 CMBDIGITAL. Tecnologia & Inovação. Alinhado ao Google AdSense Brasil.</p>
            <div className="mt-6 md:mt-0 flex space-x-8">
              <a href="#" className="hover:text-brand-cyan transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-brand-cyan transition-colors">Twitter</a>
              <a href="#" className="hover:text-brand-cyan transition-colors">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
