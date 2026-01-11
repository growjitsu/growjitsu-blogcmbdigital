
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ArticleView from './pages/ArticleView';
import AdminDashboard from './pages/AdminDashboard';
import { About, Privacy, Terms, Contact } from './pages/Institutional';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/artigo/:slug" element={<ArticleView />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/privacidade" element={<Privacy />} />
          <Route path="/termos" element={<Terms />} />
          <Route path="/contato" element={<Contact />} />
          {/* Rota Oculta para Automação */}
          <Route path="/curadoria-oculta" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
