
import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../../services/dbService';
import { UserProfile, CompraSonho } from '../../types';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  ShoppingCart,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

const RelatorioCompras: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [compras, setCompras] = useState<CompraSonho[]>([]);
  const [month, setMonth] = useState<number | 'all'>('all');
  const [year, setYear] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = dbService.listenCollection(user.uid, 'compras_sonhos', (items) => {
      setCompras(items);
    });

    return () => unsub();
  }, [user.uid]);

  const filteredCompras = useMemo(() => {
    return compras.filter(c => {
      const date = new Date(c.date + 'T12:00:00');
      const mMatch = month === 'all' || (date.getMonth() + 1) === month;
      const yMatch = year === 'all' || date.getFullYear() === year;
      return mMatch && yMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [compras, month, year]);

  const totalFiltered = useMemo(() => {
    return filteredCompras.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredCompras]);

  const monthsList = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const yearsList = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    compras.forEach(c => {
      const y = new Date(c.date + 'T12:00:00').getFullYear();
      if (!isNaN(y)) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [compras]);

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-lg">
              <FileText size={24} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatório de Compras</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-14">Extrato Detalhado de Sonhos</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100 group">
            <Filter size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer py-1 text-slate-700" 
              value={year} 
              onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos os Anos</option>
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer py-1 text-slate-700" 
              value={month} 
              onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos os Meses</option>
              {monthsList.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Card de Resumo */}
      <div className="px-4">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex items-center gap-6 max-w-sm hover:border-indigo-200 transition-all group">
          <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Total no Período</p>
            <p className="text-2xl font-black tabular-nums text-slate-900 tracking-tighter">
              R$ {totalFiltered.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">{filteredCompras.length} itens encontrados</p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="px-4">
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Data</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item / Sonho</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompras.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em]">
                      Nenhum registro para este período
                    </td>
                  </tr>
                ) : (
                  filteredCompras.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="p-6 text-center whitespace-nowrap">
                        <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase">
                          {c.date.split('-').reverse().join('/')}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <ShoppingCart size={14} className="text-indigo-500" />
                          <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{c.item}</span>
                        </div>
                      </td>
                      <td className="p-6 text-right whitespace-nowrap">
                        <span className="text-sm font-black text-slate-900 tabular-nums">
                          R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="text-[11px] font-bold text-slate-500 italic">
                          {c.description || '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatorioCompras;
