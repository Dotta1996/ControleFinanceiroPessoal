
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, InvestmentOperation, Ticker } from '../../types';
import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  Briefcase, 
  DollarSign, 
  Target, 
  Search,
  X
} from 'lucide-react';

const InvestReports: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [ops, setOps] = useState<InvestmentOperation[]>([]);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  
  // Filtros
  const [month, setMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;

    // Busca tickers para o filtro
    const unsubTickers = db.collection('usuarios').doc(user.uid).collection('tickers')
      .onSnapshot(snap => setTickers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ticker))));

    // Busca operações
    const unsubOps = dbService.listenCollection(user.uid, 'investimentos', (items) => {
      setOps(items.sort((a, b) => b.date.localeCompare(a.date)));
    });

    return () => { unsubTickers(); unsubOps(); };
  }, [user.uid]);

  // Filtragem Lógica
  const filteredOps = useMemo(() => {
    return ops.filter(op => {
      const date = new Date(op.date + 'T12:00:00');
      const mMatch = month === 'all' || (date.getMonth() + 1) === month;
      const yMatch = year === 'all' || date.getFullYear() === year;
      const tMatch = !selectedTicker || op.ticker === selectedTicker;
      const opMatch = !selectedType || op.type === selectedType;
      
      return mMatch && yMatch && tMatch && opMatch;
    });
  }, [ops, month, year, selectedTicker, selectedType]);

  // Cálculos dos Cards
  const summary = useMemo(() => {
    return filteredOps.reduce((acc, op) => {
      const val = Number(op.totalValue) || 0;
      const qty = Number(op.quantity) || 0;

      if (op.type === 'Rendimento') {
        acc.totalDividends += val;
      } else if (op.type === 'Compra') {
        acc.totalVolume += val;
        acc.totalQty += qty; // SOMA COMPRA
      } else if (op.type === 'Venda') {
        acc.totalVolume += val;
        acc.totalQty -= qty; // DIMINUI VENDA
      }
      
      return acc;
    }, { totalQty: 0, totalVolume: 0, totalDividends: 0 });
  }, [filteredOps]);

  const monthsList = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Relatório de Ativos</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-14">Análise detalhada de movimentações</p>
        </div>

        {/* Filtros de Tempo Rápidos */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100">
            <Calendar size={14} className="text-slate-400" />
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer py-1" 
              value={year} 
              onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos Anos</option>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <select 
              className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer py-1" 
              value={month} 
              onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos Meses</option>
              {monthsList.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          title="Quantidade de Cotas" 
          value={summary.totalQty} 
          isCurrency={false}
          color="slate" 
          icon={Briefcase} 
          subtitle="Soma Compra / Subtrai Venda"
        />
        <SummaryCard 
          title="Volume Negociado" 
          value={summary.totalVolume} 
          isCurrency={true}
          color="indigo" 
          icon={DollarSign} 
        />
        <SummaryCard 
          title="Total Rendimentos" 
          value={summary.totalDividends} 
          isCurrency={true}
          color="emerald" 
          icon={Target} 
        />
      </div>

      {/* Filtros Avançados */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Search size={12} /> Filtrar por Ativo
          </label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
          >
            <option value="">TODOS OS TICKERS</option>
            {tickers.map(t => <option key={t.id} value={t.symbol}>{t.symbol} - {t.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Filter size={12} /> Tipo de Operação
          </label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">TODAS AS OPERAÇÕES</option>
            <option value="Compra">COMPRAS</option>
            <option value="Venda">VENDAS</option>
            <option value="Rendimento">RENDIMENTOS / DIVIDENDOS</option>
          </select>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">Data</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Ativo</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Preço Unit.</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-40">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-400 font-medium italic">Nenhuma movimentação encontrada para estes filtros.</td>
                </tr>
              ) : (
                filteredOps.map(op => (
                  <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 text-center whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                        {op.date.split('-').reverse().join('/')}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{op.ticker}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">
                          {tickers.find(t => t.symbol === op.ticker)?.name || '---'}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                        op.type === 'Compra' ? 'bg-indigo-50 text-indigo-600' : 
                        op.type === 'Venda' ? 'bg-rose-50 text-rose-600' : 
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {op.type}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-xs font-bold text-slate-600 tabular-nums">{op.quantity}</span>
                    </td>
                    <td className="p-5 text-right whitespace-nowrap">
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                        R$ {(op.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-5 text-right whitespace-nowrap">
                      <span className={`text-sm font-black tabular-nums ${op.type === 'Rendimento' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        R$ {(op.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
  );
};

const SummaryCard = ({ title, value, isCurrency, color, icon: Icon, subtitle }: any) => {
  const colors: any = { 
    slate: 'bg-slate-900 text-slate-900', 
    indigo: 'bg-indigo-600 text-indigo-600', 
    emerald: 'bg-emerald-500 text-emerald-500' 
  };
  
  return (
    <div className="bg-white p-6 rounded-[2.2rem] border border-slate-200 shadow-sm flex items-center gap-5 transition-all hover:translate-y-[-2px] hover:shadow-md">
      <div className={`p-4 rounded-2xl ${colors[color].split(' ')[0]} text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-black text-slate-900 tabular-nums">
          {isCurrency ? 'R$ ' : ''}{value.toLocaleString('pt-BR', { minimumFractionDigits: isCurrency ? 2 : 0 })}
        </p>
        {subtitle && <p className="text-[8px] font-bold text-slate-300 uppercase mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

export default InvestReports;
