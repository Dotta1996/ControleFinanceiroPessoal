
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { 
  LayoutDashboard, 
  ReceiptText, 
  TrendingUp, 
  LogOut, 
  Wallet,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Circle,
  Menu,
  X,
  ShoppingCart,
  Star,
  FileText,
  Car,
  Settings,
  DatabaseZap
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  user: UserProfile;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });

  React.useEffect(() => {
    try { localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false'); } catch {}
  }, [collapsed]);

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]);
  };

  const handleLogout = () => {
    auth.signOut();
  };

  const financeSub = [
    { to: '/finance/dashboard', label: 'Dashboard' },
    { to: '/finance/monthly', label: 'Totais Mensais' },
    { to: '/finance/transactions', label: 'Transações' },
    { to: '/finance/categories', label: 'Categorias' },
    { to: '/finance/reports', label: 'Relatórios' },
  ];

  const investSub = [
    { to: '/invest/dashboard', label: 'Dashboard' },
    { to: '/invest/tickers', label: 'Ativos' },
    { to: '/invest/operations', label: 'Lançamentos' },
    { to: '/invest/reports', label: 'Relatórios' },
    { to: '/invest/contributions', label: 'Aportes' },
  ];

  const comprasSub = [
    { to: '/compras/cadastro', label: 'Cadastro de Compras' },
    { to: '/compras/dashboard', label: 'Dashboard Compras' },
    { to: '/compras/relatorio', label: 'Relatório Compras' },
    { to: '/compras/carro', label: 'Gastos com o Carro' },
  ];

  const toolsSub = [
    { to: '/tools/import', label: 'Importação em Massa' },
  ];

  const NavContent = () => (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 text-slate-400">
      <NavLink
        to="/"
        onClick={() => setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all ${
            isActive ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-800'
          }`
        }
      >
        <LayoutDashboard size={18} />
        {!collapsed && <span className="font-semibold text-sm">Dashboard Geral</span>}
      </NavLink>

      {/* Finanças */}
      <div>
        <button
          onClick={() => toggleMenu('finance')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-slate-800 transition-all`}
        >
          <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
            <ReceiptText size={18} />
            {!collapsed && <span className="font-semibold text-sm">Finanças</span>}
          </div>
          {!collapsed && (openMenus.includes('finance') ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        {openMenus.includes('finance') && !collapsed && (
          <div className="mt-1 ml-4 border-l border-slate-800 space-y-1">
            {financeSub.map(sub => (
              <NavLink
                key={sub.to}
                to={sub.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-xs font-medium transition-all hover:text-white ${
                    isActive ? 'text-indigo-400' : 'text-slate-500'
                  }`
                }
              >
                <Circle size={6} fill={location.pathname === sub.to ? 'currentColor' : 'none'} />
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Investimentos */}
      <div>
        <button
          onClick={() => toggleMenu('invest')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-slate-800 transition-all`}
        >
          <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
            <TrendingUp size={18} />
            {!collapsed && <span className="font-semibold text-sm">Investimentos</span>}
          </div>
          {!collapsed && (openMenus.includes('invest') ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        {openMenus.includes('invest') && !collapsed && (
          <div className="mt-1 ml-4 border-l border-slate-800 space-y-1">
            {investSub.map(sub => (
              <NavLink
                key={sub.to}
                to={sub.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-xs font-medium transition-all hover:text-white ${
                    isActive ? 'text-indigo-400' : 'text-slate-500'
                  }`
                }
              >
                <Circle size={6} fill={location.pathname === sub.to ? 'currentColor' : 'none'} />
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Compras / Sonhos */}
      <div>
        <button
          onClick={() => toggleMenu('compras')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-slate-800 transition-all`}
        >
          <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
            <ShoppingCart size={18} />
            {!collapsed && <span className="font-semibold text-sm">Compras/Sonhos</span>}
          </div>
          {!collapsed && (openMenus.includes('compras') ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        {openMenus.includes('compras') && !collapsed && (
          <div className="mt-1 ml-4 border-l border-slate-800 space-y-1">
            {comprasSub.map(sub => (
              <NavLink
                key={sub.to}
                to={sub.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-xs font-medium transition-all hover:text-white ${
                    isActive ? 'text-indigo-400' : 'text-slate-500'
                  }`
                }
              >
                <Circle size={6} fill={location.pathname === sub.to ? 'currentColor' : 'none'} />
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Ferramentas */}
      <div>
        <button
          onClick={() => toggleMenu('tools')}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl hover:bg-slate-800 transition-all`}
        >
          <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
            <Settings size={18} />
            {!collapsed && <span className="font-semibold text-sm">Ferramentas</span>}
          </div>
          {!collapsed && (openMenus.includes('tools') ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </button>
        {openMenus.includes('tools') && !collapsed && (
          <div className="mt-1 ml-4 border-l border-slate-800 space-y-1">
            {toolsSub.map(sub => (
              <NavLink
                key={sub.to}
                to={sub.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-2 text-xs font-medium transition-all hover:text-white ${
                    isActive ? 'text-indigo-400' : 'text-slate-500'
                  }`
                }
              >
                <Circle size={6} fill={location.pathname === sub.to ? 'currentColor' : 'none'} />
                <span>{sub.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-20' : 'w-72'} bg-slate-900 h-screen sticky top-0 text-slate-300 border-r border-slate-800 shrink-0`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
          <div className={`flex items-center ${collapsed ? 'space-x-0' : 'space-x-3'}`}>
            <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Wallet className="text-white w-5 h-5" />
            </div>
            {!collapsed && <span className="text-sm font-black text-white tracking-tight uppercase">Controle Financeiro</span>}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            className="text-slate-300 hover:text-white p-2"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

          <NavContent />

        <div className="p-4 border-t border-slate-800/50 bg-slate-950/50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-slate-700 p-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all font-bold"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-72 bg-slate-900 h-full shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-500 p-2 rounded-xl">
                  <Wallet className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white uppercase text-[12px]">Controle Financeiro</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-2">
                <X size={24} />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-50 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        <NavLink to="/finance/transactions" className={({ isActive }) => `flex flex-col items-center flex-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter">Início</span>
        </NavLink>
        
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center flex-1 text-slate-400`}
        >
          <Menu size={22} className="text-indigo-600" />
          <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter">Menu</span>
        </button>

        <NavLink to="/finance/dashboard" className={({ isActive }) => `flex flex-col items-center flex-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
          <ReceiptText size={20} />
          <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter">Finanças</span>
        </NavLink>
        
        <NavLink to="/invest/dashboard" className={({ isActive }) => `flex flex-col items-center flex-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
          <TrendingUp size={20} />
          <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter">Invest</span>
        </NavLink>
      </nav>
    </>
  );
};

export default Sidebar;
