
import React, { useState } from 'react';
import { Wallet, Lock, ShieldCheck, ArrowRight, Loader2, KeyRound, AlertCircle, User as UserIcon, Mail } from 'lucide-react';
import { auth, db } from '../firebase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    setSubmitting(true);

    try {
      // Login
      await auth.signInWithEmailAndPassword(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        setError('Erro ao processar autenticação. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 font-['Plus_Jakarta_Sans']">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-5 bg-white/5 backdrop-blur-2xl rounded-[2rem] mb-6 shadow-2xl ring-1 ring-white/10">
            <Wallet className="text-indigo-400 w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Bem-vindo
          </h1>
          <p className="text-slate-400 font-medium text-xs uppercase tracking-widest px-8 leading-relaxed">
            Insira suas credenciais para acessar seu dashboard.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">E-mail</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-indigo-500/50 focus:outline-none transition-all text-white font-bold text-sm"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Senha</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-white/5 border-2 border-transparent rounded-2xl focus:bg-white/10 focus:border-indigo-500/50 focus:outline-none transition-all text-white font-bold text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-[11px] font-bold flex items-center gap-3 animate-in shake duration-300">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-indigo-900/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-3 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center space-x-2 text-slate-500">
            <ShieldCheck size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Autenticação Firebase Ativa</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
