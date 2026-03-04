
import React, { useEffect, useState, useMemo } from 'react';
import { dbService } from '../services/dbService';
import { UserProfile, Transaction, InvestmentOperation } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Briefcase, ExternalLink, ArrowUpRight, ArrowDownRight, CreditCard, DollarSign } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investOps, setInvestOps] = useState<InvestmentOperation[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user?.uid) return;

    const unsubTx = dbService.listenCollection(user.uid, 'transacoes', (items) => {
      // Filtrar apenas o ano atual para o dashboard principal
      const filtered = items.filter(t => t.year === currentYear || dbService.getYearFromDate(t.date) === currentYear.toString());
      setTransactions(filtered);
    });

    const unsubInv = dbService.listenCollection(user.uid, 'investimentos', (items) => {
      setInvestOps(items);
    });

    setTimeout(() => setLoading(false), 800);
    return () => { unsubTx(); unsubInv(); };
  }, [user.uid, currentYear]);

  const statsYTD = useMemo(() => {
    const revenue = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const cardSpend = transactions.filter(t => t.category === 'Cartão' || t.category === 'Cartão Itens').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    
    const ytdInvestOps = investOps.filter(op => {
      const opDate = new Date(op.date + 'T12:00:00');
      return opDate.getFullYear() === currentYear;
    });

    const totalInvested = ytdInvestOps.filter(op => op.type === 'Compra').reduce((acc, op) => acc + (Number(op.totalValue) || 0), 0);
    const totalDividends = ytdInvestOps.filter(op => op.type === 'Rendimento').reduce((acc, op) => acc + (Number(op.totalValue) || 0), 0);

    return { revenue, expenses, cardSpend, totalInvested, totalDividends };
  }, [transactions, investOps, currentYear]);

  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], curr) => {
      const existing = acc.find(a => a.name === curr.category);
      if (existing) existing.value += (Number(curr.amount) || 0);
      else acc.push({ name: curr.category, value: (Number(curr.amount) || 0) });
      return acc;
    }, []);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) return null;

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Anual {currentYear}</h2>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Valores Acumulados no Ano</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Receitas Totais" value={statsYTD.revenue} icon={ArrowUpRight} color="emerald" />
        <StatCard title="Despesas Totais" value={statsYTD.expenses} icon={ArrowDownRight} color="rose" />
        <StatCard title="Gastos Cartões" value={statsYTD.cardSpend} icon={CreditCard} color="indigo" />
        <StatCard title="Total Investido" value={statsYTD.totalInvested} icon={Briefcase} color="amber" />
        <StatCard title="Rendimentos" value={statsYTD.totalDividends} icon={DollarSign} color="emerald" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-8 uppercase tracking-widest">Distribuição de Despesas Anuais</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                {expenseByCategory.length > 0 ? (
                  <BarChart data={expenseByCategory.sort((a,b) => b.value - a.value)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                ) : <div className="h-full flex items-center justify-center text-slate-300 italic">Sem dados este ano</div>}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Categorias de Gasto</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {expenseByCategory.length > 0 ? (
                    <PieChart>
                      <Pie data={expenseByCategory} innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={8}>
                        {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    </PieChart>
                  ) : <div className="h-full flex items-center justify-center text-slate-300 italic">Sem despesas</div>}
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Balanço de Caixa Líquido</p>
                <h4 className="text-4xl font-black">R$ {(statsYTD.revenue - statsYTD.expenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                <div className="flex items-center mt-2 space-x-2 text-indigo-400 text-sm font-bold">
                  <TrendingUp size={16} />
                  <span>Fluxo Acumulado</span>
                </div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-4">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rendimento Passivo no Ano</p>
                 <p className="text-xl font-black text-emerald-400">R$ {statsYTD.totalDividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Lançamentos Recentes</h3>
            <ExternalLink size={16} className="text-slate-400" />
          </div>
          <div className="divide-y divide-slate-50">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate max-w-[120px]">{tx.description || '-'}</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase">{tx.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    R$ {(Number(tx.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: any; color: string }> = ({ title, value, icon: Icon, color }) => {
  const colors: any = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-500' };
  const val = Number(value) || 0;
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${colors[color]} text-white shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-black text-slate-900">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
};

export default Dashboard;
