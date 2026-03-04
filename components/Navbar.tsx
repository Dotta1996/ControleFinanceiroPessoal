
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Wallet, LogOut, TrendingUp } from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transações', icon: ReceiptText },
    { to: '/investments', label: 'Investimentos', icon: TrendingUp },
  ];

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Controle Financeiro</h1>
        </div>

        <nav className="flex space-x-8">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-2 font-medium transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 leading-none">{user.displayName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <img
            src={user.photoURL || 'https://picsum.photos/40'}
            alt="User"
            className="w-10 h-10 rounded-full border border-gray-200 bg-indigo-50"
          />
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-indigo-600 border-t-2 border-indigo-600' : 'text-gray-400'
              }`
            }
          >
            <item.icon size={22} />
            <span className="text-[10px] mt-1 uppercase tracking-wider font-semibold">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400"
        >
          <LogOut size={22} />
          <span className="text-[10px] mt-1 uppercase tracking-wider font-semibold">Sair</span>
        </button>
      </nav>
    </>
  );
};

export default Navbar;
