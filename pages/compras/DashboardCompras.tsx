
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../../services/dbService';
import { UserProfile, CompraSonho } from '../../types';
import { 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Star, 
  BarChart2, 
  List,
  Calendar,
  Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Legend
} from 'recharts';
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval, min, max, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DashboardCompras: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [compras, setCompras] = useState<CompraSonho[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = dbService.listenCollection(user.uid, 'compras_sonhos', (items) => {
      setCompras(items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });
    return () => unsub();
  }, [user.uid]);

  const totalGeral = useMemo(() => compras.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0), [compras]);
  
  // Dados Evolução Mensal (Todo o histórico registrado)
  const monthlyEvolution = useMemo(() => {
    if (compras.length === 0) return [];
    
    const dates = compras.map(c => new Date(c.date + 'T12:00:00'));
    const start = startOfMonth(min(dates));
    const end = endOfMonth(max(dates));
    
    // Se tivermos apenas um mês, mostramos um pequeno intervalo para o gráfico não ficar vazio
    const intervalStart = compras.length === 1 ? subMonths(start, 1) : start;

    const months = eachMonthOfInterval({ start: intervalStart, end });

    return months.map(m => {
      const monthStart = startOfMonth(m);
      const monthEnd = endOfMonth(m);
      
      const total = compras
        .filter(c => {
          const cDate = new Date(c.date + 'T12:00:00');
          return isWithinInterval(cDate, { start: monthStart, end: monthEnd });
        })
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      return {
        name: format(m, 'MMM/yy', { locale: ptBR }).toUpperCase(),
        total
      };
    });
  }, [compras]);

  // Dados Evolução Anual (Todos os anos registrados)
  const yearlyEvolution = useMemo(() => {
    if (compras.length === 0) return [];
    
    const yearsSet = new Set<number>();
    compras.forEach(c => yearsSet.add(new Date(c.date + 'T12:00:00').getFullYear()));
    
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    return years.map(y => {
      const total = compras
        .filter(c => new Date(c.date + 'T12:00:00').getFullYear() === y)
        .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      return {
        name: y.toString(),
        total
      };
    });
  }, [compras]);

  const topItems = useMemo(() => {
    return [...compras]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map(c => ({
        name: c.item.length > 20 ? c.item.substring(0, 18) + '...' : c.item,
        valor: c.amount
      }));
  }, [compras]);

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-white">
              <Star size={22} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Dashboard de Sonhos</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-12 mt-1">Análise de Objetivos e Evolução</p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
        <StatCard title="Total Acumulado" value={totalGeral} icon={DollarSign} color="indigo" />
        <StatCard title="Objetivos Listados" value={compras.length} icon={List} color="emerald" isCurrency={false} />
        <StatCard title="Maior Aquisição" value={compras.length > 0 ? Math.max(...compras.map(c => c.amount)) : 0} icon={TrendingUp} color="amber" />
      </div>

      <div className="flex flex-col gap-10 px-4">
        {/* Gráfico Evolução Mensal - Largura Total */}
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                <BarChart2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em]">Fluxo de Compras Mensal</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Histórico completo de atividade mensal</p>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            {compras.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolution}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} />
                  <Tooltip 
                    cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '15px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' }}
                    formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Total Investido']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Nenhum dado para exibir</div>
            )}
          </div>
        </div>

        {/* Gráfico Evolução Anual - Largura Total */}
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 p-2 rounded-xl text-amber-600">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em]">Histórico Comparativo Anual</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Consolidação de todos os anos registrados</p>
              </div>
            </div>
          </div>
          <div className="h-[400px]">
            {compras.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="black" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '15px' }}
                    formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Acumulado']}
                  />
                  <Bar dataKey="total" radius={[15, 15, 0, 0]} barSize={80}>
                    {yearlyEvolution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === yearlyEvolution.length - 1 ? '#6366f1' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Nenhum dado para exibir</div>
            )}
          </div>
        </div>

        {/* Comparativo de Itens - Largura Total */}
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-10">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
              <Info size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em]">Top 10 Maiores Investimentos</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ranking de valores históricos</p>
            </div>
          </div>
          <div className="h-[450px]">
            {compras.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical" margin={{ left: 20, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} width={120} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`}
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="valor" radius={[0, 10, 10, 0]} barSize={25}>
                    {topItems.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Nenhum dado para exibir</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, isCurrency = true }: any) => {
  const colors: any = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-500', amber: 'bg-amber-500' };
  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-xl transition-all hover:translate-y-[-4px] hover:shadow-2xl group">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${colors[color]} text-white shadow-lg group-hover:scale-110 transition-transform`}><Icon size={20} /></div>
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter">
          {isCurrency ? 'R$ ' : ''}{value.toLocaleString('pt-BR', { minimumFractionDigits: isCurrency ? 2 : 0 })}
        </p>
      </div>
    </div>
  );
};

export default DashboardCompras;
