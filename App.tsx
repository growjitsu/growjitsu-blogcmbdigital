import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ArticleView from './pages/ArticleView';
import AdminDashboard from './pages/AdminDashboard';
import { About, Privacy, Terms, Contact } from './pages/Institutional';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Rota Pai com Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/artigo/:slug" element={<ArticleView />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/contato" element={<Contact />} />
          {/* Rota Oculta para Automação */}
          <Route path="/curadoria-oculta" element={<AdminDashboard />} />
          
          {/* Fallback para evitar tela branca em rotas inexistentes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;