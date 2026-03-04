
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, Transaction, Category } from '../../types';
import { 
  Plus, Minus, ChevronLeft, ChevronRight, LayoutGrid, Loader2, 
  ArrowUpCircle, ArrowDownCircle, CreditCard, Home, TrendingUp, Scale
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const MonthlyTotals: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rows, setRows] = useState<{ category: string; subcategory: string }[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubConfig = db.collection('usuarios').doc(user.uid).collection('configuracoes_matriz')
      .doc('layout_atual')
      .onSnapshot(doc => {
        if (doc.exists) setRows(doc.data()?.rows || []);
        else setRows([{ category: '', subcategory: '' }]);
        setLoadingConfig(false);
      });

    const unsubCat = db.collection('usuarios').doc(user.uid).collection('categorias')
      .onSnapshot(snap => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category))));
    
    const unsubTx = dbService.listenCollection(user.uid, 'transacoes', (items) => {
      const filtered = items.filter(t => t.year === year || dbService.getYearFromDate(t.date) === year.toString());
      setTransactions(filtered);
    });

    return () => { unsubConfig(); unsubCat(); unsubTx(); };
  }, [user.uid, year]);

  const saveConfig = async (currentRows: typeof rows) => {
    if (!user?.uid) return;
    await db.collection('usuarios').doc(user.uid).collection('configuracoes_matriz')
      .doc('layout_atual').set({ rows: currentRows });
  };

  const addRow = () => {
    const newRows = [...rows, { category: '', subcategory: '' }];
    setRows(newRows);
    saveConfig(newRows);
  };

  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    saveConfig(newRows);
  };

  const updateRow = (index: number, field: 'category' | 'subcategory', value: string) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    if (field === 'category') newRows[index].subcategory = '';
    setRows(newRows);
    saveConfig(newRows);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const uniqueCategoryNames = Array.from(new Set(categories.map(c => c.name))).sort();

  const getSubcategoriesFor = (catName: string) => {
    return categories.filter(c => c.name === catName).flatMap(c => c.subcategories || []).sort();
  };

  const getMonthlyCellValue = (month: number, catName: string, subName: string) => {
    return transactions
      .filter(t => t.month === month && (!catName || t.category === catName) && (!subName || t.subcategory === subName))
      .reduce((acc, curr) => acc + (curr.type === 'income' ? Number(curr.amount) : -Number(curr.amount)), 0);
  };

  // CÁLCULO RELATIVO AOS ITENS DA MATRIZ
  const getMatrixTotal = (month: number, type: 'income' | 'expense' | 'balance') => {
    return rows.reduce((acc, row) => {
      if (!row.category) return acc;
      
      const catInfo = categories.find(c => c.name === row.category);
      if (!catInfo) return acc;

      const val = getMonthlyCellValue(month, row.category, row.subcategory);

      if (type === 'balance') return acc + val;
      if (type === 'income' && catInfo.type === 'income') return acc + val;
      // Despesas são mostradas como negativo na célula, mas o totalizador as quer positivas
      if (type === 'expense' && catInfo.type === 'expense') return acc + Math.abs(val);
      
      return acc;
    }, 0);
  };

  const annualStats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    const card = transactions.filter(t => t.category === 'Cartão').reduce((acc, t) => acc + Number(t.amount), 0);
    const house = transactions.filter(t => t.category === 'Moradia' || t.category === 'Casa').reduce((acc, t) => acc + Number(t.amount), 0);
    return { income, expense, card, house };
  }, [transactions]);

  const chartData = useMemo(() => {
    return months.map(m => ({
      name: new Date(0, m - 1).toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
      income: getMatrixTotal(m, 'income'),
      expense: getMatrixTotal(m, 'expense')
    }));
  }, [rows, transactions, months, categories]);

  if (loadingConfig) return null;

  return (
    <div className="p-4 md:p-8 max-w-full mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <LayoutGrid className="text-indigo-600" size={28} />
            Matriz de Fluxo {year}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] ml-11">Consolidação Anual de Resultados</p>
        </div>
        <div className="flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <button onClick={() => setYear(year - 1)} className="p-3 hover:bg-slate-50 border-r border-slate-200 text-slate-400 transition-colors"><ChevronLeft size={20} /></button>
          <span className="px-6 py-3 font-black text-slate-700 text-sm tracking-widest">{year}</span>
          <button onClick={() => setYear(year + 1)} className="p-3 hover:bg-slate-50 border-l border-slate-200 text-slate-400 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </header>

      {/* Matriz Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden ring-1 ring-slate-100 mx-2">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-4 text-[12px] font-black text-slate-400 uppercase tracking-widest w-[320px] sticky left-0 bg-slate-50 z-50 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">Filtros de Linha</th>
                {months.map(m => (
                  <th key={m} className="p-2 py-3 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100">
                    {new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                  </th>
                ))}
                <th className="p-3 w-[60px] border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={idx} className="group hover:bg-indigo-50/10 transition-colors">
                  <td className="p-1.5 sticky left-0 bg-white z-40 border-r border-slate-50 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                    <div className="flex gap-2 items-center">
                      <select className="bg-slate-50 border-none rounded-lg px-2 py-1 text-[11px] font-black text-slate-700 outline-none uppercase cursor-pointer w-1/2" value={row.category} onChange={e => updateRow(idx, 'category', e.target.value)}>
                        <option value="">(CATEGORIA)</option>
                        {uniqueCategoryNames.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      <select className="bg-white border border-slate-100 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 outline-none uppercase disabled:opacity-20 cursor-pointer w-1/2" value={row.subcategory} onChange={e => updateRow(idx, 'subcategory', e.target.value)} disabled={!row.category}>
                        <option value="">(SUB)</option>
                        {getSubcategoriesFor(row.category).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </td>
                  {months.map(m => {
                    const val = getMonthlyCellValue(m, row.category, row.subcategory);
                    return (
                      <td key={m} className={`p-2 text-center text-[13px] font-black tabular-nums ${val > 0 ? 'text-emerald-500' : val < 0 ? 'text-rose-500' : 'text-slate-200'}`}>
                          {val !== 0 ? Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
                        </td>
                    );
                  })}
                  <td className="p-4 text-center">
                    <button onClick={() => removeRow(idx)} className="text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Minus size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200">
              <tr className="bg-emerald-50/30">
                <td className="p-4 px-6 sticky left-0 bg-emerald-50 z-40 border-r border-emerald-100 font-black text-[10px] text-emerald-600 uppercase tracking-widest flex items-center gap-3">
                  <ArrowUpCircle size={14} /> Receita da Matriz
                </td>
                {months.map(m => {
                  const val = getMatrixTotal(m, 'income');
                  return (
                    <td key={m} className="p-4 text-center text-[11px] font-black text-emerald-600 tabular-nums">
                      R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </td>
                  );
                })}
                <td className="p-4"></td>
              </tr>
              <tr className="bg-rose-50/30">
                <td className="p-4 px-6 sticky left-0 bg-rose-50 z-40 border-r border-rose-100 font-black text-[10px] text-rose-600 uppercase tracking-widest flex items-center gap-3">
                  <ArrowDownCircle size={14} /> Despesa da Matriz
                </td>
                {months.map(m => {
                  const val = getMatrixTotal(m, 'expense');
                  return (
                    <td key={m} className="p-4 text-center text-[11px] font-black text-rose-600 tabular-nums">
                      R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </td>
                  );
                })}
                <td className="p-4"></td>
              </tr>
              <tr className="bg-slate-900">
                <td className="p-4 px-6 sticky left-0 bg-slate-900 z-40 border-r border-slate-800 font-black text-[10px] text-white uppercase tracking-widest flex items-center gap-3 shadow-[4px_0_15px_rgba(0,0,0,0.2)]">
                  <Scale size={14} /> Saldo Filtrado
                </td>
                {months.map(m => {
                  const bal = getMatrixTotal(m, 'balance');
                  return (
                    <td key={m} className={`p-4 text-center text-[11px] font-black tabular-nums ${bal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {bal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </td>
                  );
                })}
                <td className="p-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <button onClick={addRow} className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-slate-200 p-5 rounded-[2rem] text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white hover:border-indigo-200 hover:text-indigo-500 transition-all group shadow-sm mx-2">
        <Plus size={20} className="group-hover:scale-110 transition-transform" />
        <span>Adicionar Novo Filtro à Matriz</span>
      </button>

      {/* Annual Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
        <AnnualCard title="Receita Anual" value={annualStats.income} color="emerald" icon={ArrowUpCircle} />
        <AnnualCard title="Despesa Anual" value={annualStats.expense} color="rose" icon={ArrowDownCircle} />
        <AnnualCard title="Gastos Cartão" value={annualStats.card} color="indigo" icon={CreditCard} />
        <AnnualCard title="Habitação" value={annualStats.house} color="amber" icon={Home} />
      </div>

      {/* Charts Section */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8 mx-2">
        <div className="flex items-center gap-3 px-2">
          <TrendingUp className="text-indigo-600" size={24} />
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em]">Evolução de Fluxo da Matriz</h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} cursor={{ fill: '#f8fafc' }} />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="income" name="Entradas (Matriz)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Saídas (Matriz)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const AnnualCard = ({ title, value, color, icon: Icon }: any) => {
  const colors: any = { emerald: 'bg-emerald-600', rose: 'bg-rose-600', indigo: 'bg-indigo-600', amber: 'bg-amber-500' };
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:border-indigo-100 transition-all group">
      <div className={`p-4 rounded-2xl ${colors[color]} text-white shadow-lg group-hover:scale-105 transition-transform`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-xl font-black text-slate-900 tabular-nums">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
      </div>
    </div>
  );
};

export default MonthlyTotals;
