
import React from 'react';

const PageWrapper: React.FC<{ children: React.ReactNode; badge: string; title: React.ReactNode }> = ({ children, badge, title }) => (
  <div className="py-40 min-h-screen transition-colors duration-300 dark:bg-brand-obsidian bg-brand-lightBg">
    <div className="container mx-auto px-4 max-w-5xl">
      <div className="inline-block px-6 py-2 bg-brand-purple/10 border border-brand-purple/20 rounded-full mb-12 text-brand-purple text-[10px] font-black uppercase tracking-[0.5em] backdrop-blur-sm">
        {badge}
      </div>
      <h1 className="text-6xl md:text-9xl font-black mb-20 tracking-tighter leading-[0.85] dark:text-brand-soft text-slate-900">
        {title}
      </h1>
      <div className="prose prose-invert prose-xl max-w-none text-brand-muted article-content">
        {children}
      </div>
    </div>
  </div>
);

export const About: React.FC = () => (
  <PageWrapper badge="Nossa Gênese" title={<>Sinal vs.<br/><span className="text-brand-cyan font-serif italic lowercase font-light">Ruído.</span></>}>
    <p className="text-3xl font-bold leading-[1.3] mb-12 tracking-tighter max-w-3xl dark:text-brand-soft text-slate-800">A CMBDIGITAL não é apenas uma plataforma de conteúdo; é um oráculo tecnológico para a nova economia digital brasileira.</p>
    <p>Nascemos no epicentro da transformação algorítmica. Em um cenário onde a informação é comoditizada e superficial, nossa missão é extrair o <strong>Ouro Digital</strong> — insights técnicos rigorosos embalados em estratégias de mercado aplicáveis.</p>
    
    <h2>Nosso Core Operacional</h2>
    <p>Operamos sob três protocolos fundamentais que guiam cada linha de código e cada palavra publicada no blogcmbdigital:</p>
    <ul>
      <li><strong>Arquitetura de Valor:</strong> Não publicamos novidades; publicamos utilidade. Se não escala seu negócio ou sua mente, não tem lugar aqui.</li>
      <li><strong>Validação Empírica:</strong> Nosso laboratório testa cada ferramenta de IA e cada framework de marketing antes da curadoria.</li>
      <li><strong>Transparência Radical:</strong> Em um mundo de promessas automatizadas, entregamos a verdade técnica por trás da inovação.</li>
    </ul>
    
    <div className="mt-20 pt-16 border-t flex flex-col md:flex-row justify-between items-center gap-10 dark:border-brand-graphite border-slate-200">
      <div className="text-center md:text-left">
        <h4 className="font-black text-5xl tracking-tighter dark:text-brand-soft text-slate-900">150k+</h4>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 dark:text-brand-muted text-slate-400">Leitores Mensais</p>
      </div>
      <div className="text-center md:text-left">
        <h4 className="font-black text-5xl tracking-tighter dark:text-brand-soft text-slate-900">12</h4>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 dark:text-brand-muted text-slate-400">Protocolos Ativos</p>
      </div>
      <div className="text-center md:text-left">
        <h4 className="font-black text-5xl tracking-tighter dark:text-brand-soft text-slate-900">Global</h4>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-2 dark:text-brand-muted text-slate-400">Presença Digital</p>
      </div>
    </div>
  </PageWrapper>
);

export const Privacy: React.FC = () => (
  <PageWrapper badge="Segurança de Dados" title={<>Política de<br/><span className="text-brand-purple">Privacidade.</span></>}>
    <p className="text-2xl font-bold leading-relaxed mb-10 tracking-tight dark:text-brand-soft text-slate-800">Sua privacidade é nossa prioridade absoluta.</p>
    <p>Na <strong>CMBDIGITAL</strong>, acessível em blogcmbdigital, uma de nossas principais prioridades é a privacidade de nossos visitantes. Este documento de Política de Privacidade contém tipos de informações que são coletadas e registradas por nós e como as utilizamos.</p>
    
    <h2>Lei Geral de Proteção de Dados (LGPD)</h2>
    <p>Estamos em total conformidade com a LGPD. Coletamos apenas as informações necessárias para fornecer nossos serviços de conteúdo e newsletter, sempre com o seu consentimento explícito.</p>
    
    <h2>Arquivos de Log</h2>
    <p>O blogcmbdigital segue um procedimento padrão de uso de arquivos de log. Esses arquivos registram os visitantes quando eles visitam sites. As informações coletadas incluem endereços de protocolo de internet (IP), tipo de navegador, Provedor de Serviços de Internet (ISP), carimbo de data e hora, páginas de referência/saída e possivelmente o número de cliques.</p>
    
    <h2>Google AdSense e Cookies DART</h2>
    <p>O Google é um dos fornecedores terceiros em nosso site. Ele também usa cookies, conhecidos como cookies DART, para veicular anúncios aos visitantes do nosso site com base em sua visita ao blogcmbdigital e a outros sites na internet. Os visitantes podem optar por recusar o uso de cookies DART visitando a Política de Privacidade da rede de anúncios e conteúdo do Google.</p>
    
    <h2>Nossos Parceiros de Publicidade</h2>
    <p>Alguns anunciantes em nosso site podem usar cookies e web beacons. Nossos parceiros de publicidade incluem o Google AdSense. Cada um de nossos parceiros de publicidade tem sua própria Política de Privacidade para suas políticas de dados do usuário.</p>
    
    <h2>Consentimento</h2>
    <p>Ao utilizar nosso site, você consente com nossa Política de Privacidade e concorda com seus Termos e Condições.</p>
  </PageWrapper>
);

export const Terms: React.FC = () => (
  <PageWrapper badge="Conformidade" title={<>Termos de<br/><span className="text-brand-purple">Uso.</span></>}>
    <p className="text-2xl font-bold leading-relaxed mb-10 tracking-tight dark:text-brand-soft text-slate-800">Diretrizes para o uso do ecossistema CMBDIGITAL.</p>
    <p>Bem-vindo ao blogcmbdigital. Ao acessar este site, presumimos que você aceita estes termos e condições integralmente. Não continue a usar a CMBDIGITAL se não concordar com todos os termos e condições estabelecidos nesta página.</p>
    
    <h2>Licença de Conteúdo</h2>
    <p>Salvo indicação em contrário, a CMBDIGITAL e/ou seus licenciadores detêm os direitos de propriedade intelectual de todo o material no blogcmbdigital. Todos os direitos de propriedade intelectual são reservados. Você pode acessar isso no blogcmbdigital para seu uso pessoal, sujeito às restrições definidas nestes termos e condições.</p>
    
    <p>Você não deve:</p>
    <ul>
      <li>Republicar material do blogcmbdigital</li>
      <li>Vender, alugar ou sublicenciar material do blogcmbdigital</li>
      <li>Reproduzir, duplicar ou copiar material do blogcmbdigital</li>
      <li>Redistribuir conteúdo da CMBDIGITAL</li>
    </ul>

    <h2>Isenção de Responsabilidade</h2>
    <p>As informações fornecidas neste blog são apenas para fins informativos e educacionais. Embora nos esforcemos para manter as informações atualizadas e corretas, não fazemos representações ou garantias de qualquer tipo, expressas ou implícitas, sobre a integridade, precisão, confiabilidade ou disponibilidade em relação ao site ou às informações, produtos ou serviços contidos no site para qualquer finalidade.</p>
    
    <h2>Limitação de Responsabilidade</h2>
    <p>Em nenhum caso seremos responsáveis por qualquer perda ou dano, incluindo, sem limitação, perda ou dano indireto ou consequente, ou qualquer perda ou dano resultante da perda de dados ou lucros decorrentes de, ou em conexão com, o uso deste blog.</p>
  </PageWrapper>
);

export const Contact: React.FC = () => (
  <div className="py-40 min-h-screen transition-colors duration-300 dark:bg-brand-obsidian bg-brand-lightBg">
    <div className="container mx-auto px-4 max-w-7xl">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-32">
          <div>
            <div className="inline-block px-6 py-2 bg-brand-cyan/10 border border-brand-cyan/20 rounded-full mb-12 text-brand-cyan text-[10px] font-black uppercase tracking-[0.5em] backdrop-blur-sm">
              Conexão Direta
            </div>
            <h1 className="text-6xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.85] dark:text-brand-soft text-slate-900">Sincronize sua<br/><span className="text-brand-purple lowercase font-serif italic font-light">visão.</span></h1>
            <p className="text-2xl mb-20 leading-relaxed font-medium tracking-tight max-w-xl dark:text-brand-muted text-slate-500">
              Parcerias de marca, sugestões de Deep Dive ou suporte técnico. Estamos operacionais via canais digitais.
            </p>
            <div className="space-y-16">
               <div className="flex items-start space-x-10 group">
                  <div className="p-6 rounded-[2rem] border transition-colors shadow-2xl dark:bg-brand-graphite dark:border-brand-graphite dark:group-hover:border-brand-cyan/40 bg-white border-slate-200 group-hover:border-brand-purple/40">
                    <svg className="w-10 h-10 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.5em] mb-4 dark:text-brand-muted text-slate-400">Protocolo Direto</h4>
                    <p className="text-3xl font-bold hover:text-brand-cyan transition-colors cursor-pointer dark:text-brand-soft text-slate-900">contatocmbdigital@gmail.com</p>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="p-12 md:p-20 rounded-[5rem] border shadow-2xl relative overflow-hidden group dark:bg-brand-graphite dark:border-brand-graphite bg-white border-slate-200">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-cyan/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-brand-cyan/10 transition-colors"></div>
            
            <form className="space-y-10 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[10px] font-black mb-5 uppercase tracking-[0.3em] dark:text-brand-muted text-slate-500">Identidade</label>
                  <input type="text" className="w-full border focus:border-brand-cyan focus:ring-0 rounded-[2rem] px-8 py-6 font-bold tracking-tight transition-all dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft dark:placeholder-brand-muted bg-slate-50 border-slate-100 text-slate-900 placeholder-slate-400" placeholder="Como devemos te chamar?" />
                </div>
                <div>
                  <label className="block text-[10px] font-black mb-5 uppercase tracking-[0.3em] dark:text-brand-muted text-slate-500">Endereço Digital</label>
                  <input type="email" className="w-full border focus:border-brand-cyan focus:ring-0 rounded-[2rem] px-8 py-6 font-bold tracking-tight transition-all dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft dark:placeholder-brand-muted bg-slate-50 border-slate-100 text-slate-900 placeholder-slate-400" placeholder="seu@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black mb-5 uppercase tracking-[0.3em] dark:text-brand-muted text-slate-500">Escopo da Comunicação</label>
                <input type="text" className="w-full border focus:border-brand-cyan focus:ring-0 rounded-[2rem] px-8 py-6 font-bold tracking-tight transition-all dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft dark:placeholder-brand-muted bg-slate-50 border-slate-100 text-slate-900 placeholder-slate-400" placeholder="Qual o seu objetivo estratégico?" />
              </div>
              <div>
                <label className="block text-[10px] font-black mb-5 uppercase tracking-[0.3em] dark:text-brand-muted text-slate-500">Detalhamento</label>
                <textarea rows={6} className="w-full border focus:border-brand-cyan focus:ring-0 rounded-[2.5rem] px-8 py-8 font-bold tracking-tight transition-all resize-none dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft dark:placeholder-brand-muted bg-slate-50 border-slate-100 text-slate-900 placeholder-slate-400" placeholder="Descreva sua necessidade técnica ou proposta..."></textarea>
              </div>
              <button className="w-full bg-brand-cyan text-brand-obsidian py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-brand-purple hover:text-white hover:scale-105 transition-all shadow-2xl shadow-brand-cyan/20">
                Estabelecer Conexão
              </button>
            </form>
          </div>
       </div>
    </div>
  </div>
);
