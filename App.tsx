
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';

// Páginas Financeiras
import FinanceDashboard from './pages/finance/FinanceDashboard';
import MonthlyTotals from './pages/finance/MonthlyTotals';
import TransactionForm from './pages/finance/TransactionForm';
import CategoryConfig from './pages/finance/CategoryConfig';
import FinanceReports from './pages/finance/FinanceReports';

// Páginas Investimentos
import InvestDashboard from './pages/invest/InvestDashboard';
import TickerConfig from './pages/invest/TickerConfig';
import InvestmentOperations from './pages/invest/InvestmentOperations';
import InvestReports from './pages/invest/InvestReports';
import Contributions from './pages/invest/Contributions';

// Páginas Compras/Sonhos
import CadastroCompras from './pages/compras/CadastroCompras';
import DashboardCompras from './pages/compras/DashboardCompras';
import RelatorioCompras from './pages/compras/RelatorioCompras';
import GastosCarro from './pages/compras/GastosCarro';

// Ferramentas
import BulkImport from './pages/tools/BulkImport';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Busca dados adicionais do usuário no Firestore se necessário
        const userDoc = await db.collection('usuarios').doc(firebaseUser.uid).get();
        const userData: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || userDoc.data()?.displayName || 'Usuário',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.email}`
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="font-black text-[10px] uppercase tracking-widest opacity-50">Carregando Sistema...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {user && (
          <Sidebar user={user} />
        )}
        <main className={`flex-1 overflow-auto ${user ? 'pb-20 md:pb-0' : ''}`}>
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            
            {/* Finance Routes */}
            <Route path="/finance/dashboard" element={user ? <FinanceDashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/finance/monthly" element={user ? <MonthlyTotals user={user} /> : <Navigate to="/login" />} />
            <Route path="/finance/transactions" element={user ? <TransactionForm user={user} /> : <Navigate to="/login" />} />
            <Route path="/finance/categories" element={user ? <CategoryConfig user={user} /> : <Navigate to="/login" />} />
            <Route path="/finance/reports" element={user ? <FinanceReports user={user} /> : <Navigate to="/login" />} />

            {/* Invest Routes */}
            <Route path="/invest/dashboard" element={user ? <InvestDashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/invest/tickers" element={user ? <TickerConfig user={user} /> : <Navigate to="/login" />} />
            <Route path="/invest/operations" element={user ? <InvestmentOperations user={user} /> : <Navigate to="/login" />} />
            <Route path="/invest/reports" element={user ? <InvestReports user={user} /> : <Navigate to="/login" />} />
            <Route path="/invest/contributions" element={user ? <Contributions user={user} /> : <Navigate to="/login" />} />

            {/* Compras/Sonhos Routes */}
            <Route path="/compras/cadastro" element={user ? <CadastroCompras user={user} /> : <Navigate to="/login" />} />
            <Route path="/compras/dashboard" element={user ? <DashboardCompras user={user} /> : <Navigate to="/login" />} />
            <Route path="/compras/relatorio" element={user ? <RelatorioCompras user={user} /> : <Navigate to="/login" />} />
            <Route path="/compras/carro" element={user ? <GastosCarro user={user} /> : <Navigate to="/login" />} />

            {/* Tools Routes */}
            <Route path="/tools/import" element={user ? <BulkImport user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
