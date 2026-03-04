
import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { UserProfile, Transaction } from '../../types';
import { CreditCard, ArrowUpRight, ArrowDownRight, Wallet, BarChart2, PieChart as PieIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';

const FinanceDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = dbService.listenCollection(user.uid, 'transacoes', (items) => {
      const filtered = items.filter(t => {
        const yearMatch = t.year === year || dbService.getYearFromDate(t.date) === year.toString();
        const monthMatch = t.month === month || (new Date(t.date).getMonth() + 1) === month;
        return yearMatch && monthMatch;
      });
      setTransactions(filtered);
    });
    return unsub;
  }, [user.uid, month, year]);

  const totalReceitas = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalDespesas = transactions.filter(t => t.type === 'expense' && t.category !== 'Cartão Itens').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalCartao = transactions.filter(t => t.category === 'Cartão').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const saldoFinal = totalReceitas - totalDespesas;

  const barData = [
    { name: 'Entradas', value: totalReceitas, color: '#10b981' },
    { name: 'Saídas', value: totalDespesas, color: '#ef4444' }
  ];

  const pieData = Array.from(transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc.set(t.category, (acc.get(t.category) || 0) + t.amount);
      return acc;
    }, new Map()).entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];
  const monthsList = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Financeiro</h2>
          
        </div>
        
        <div className="flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-4 py-2.5 text-[10px] font-black text-slate-700 bg-transparent outline-none border-r border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors uppercase"
          >
            {monthsList.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input 
            type="number" 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24 px-4 py-2.5 text-[10px] font-black text-slate-700 bg-transparent outline-none hover:bg-slate-50 transition-colors text-center"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Gastos Cartão" value={totalCartao} icon={CreditCard} color="indigo" />
        <StatCard title="Total Receitas" value={totalReceitas} icon={ArrowUpRight} color="emerald" />
        <StatCard title="Total Despesas" value={totalDespesas} icon={ArrowDownRight} color="rose" />
        <StatCard title="Saldo Final" value={saldoFinal} icon={Wallet} color={saldoFinal >= 0 ? "indigo" : "rose"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <BarChart2 className="text-indigo-600" size={20} />
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Balanço do Mês</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                  {barData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <PieIcon className="text-rose-500" size={20} />
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Gastos por Categoria</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={5}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: number, icon: any, color: string }> = ({ title, value, icon: Icon, color }) => {
  const colors: any = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-500', rose: 'bg-rose-500' };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl transition-all hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${colors[color]} text-white shadow-lg`}><Icon size={20} /></div>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-black text-slate-900 tabular-nums">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
};

export default FinanceDashboard;
