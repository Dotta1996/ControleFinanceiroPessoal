
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, Transaction, Category } from '../../types';
import { 
  CheckCircle2, 
  Calendar, 
  FileText, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Scale,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  Filter,
  Circle
} from 'lucide-react';

// Helpers para extração robusta de data e prevenção de desvios de fuso horário
const parseTxDate = (dateVal: any): { year: number; month: number; day: number } | null => {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    // YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
    const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
      return {
        year: parseInt(ymd[1], 10),
        month: parseInt(ymd[2], 10),
        day: parseInt(ymd[3], 10)
      };
    }
    // DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmy) {
      return {
        day: parseInt(dmy[1], 10),
        month: parseInt(dmy[2], 10),
        year: parseInt(dmy[3], 10)
      };
    }
    // Fallback com meio-dia para evitar deslocamento UTC
    const d = new Date(trimmed.includes('T') ? trimmed : `${trimmed}T12:00:00`);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate()
      };
    }
  }
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return {
      year: dateVal.getFullYear(),
      month: dateVal.getMonth() + 1,
      day: dateVal.getDate()
    };
  }
  return null;
};

const getTxDateInfo = (tx: Transaction): { year: number; month: number } => {
  const parsed = parseTxDate(tx.date);
  if (parsed) {
    return { year: parsed.year, month: parsed.month };
  }
  const yearFromDate = parseInt(dbService.getYearFromDate(tx.date), 10);
  const monthFromDate = dbService.getMonthFromDate(tx.date);
  return {
    year: Number(tx.year) || (!isNaN(yearFromDate) ? yearFromDate : new Date().getFullYear()),
    month: Number(tx.month) || (!isNaN(monthFromDate) ? monthFromDate : (new Date().getMonth() + 1))
  };
};

const formatDisplayDate = (dateVal: any): string => {
  const parsed = parseTxDate(dateVal);
  if (!parsed) {
    return typeof dateVal === 'string' ? dateVal : '—';
  }
  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  const yyyy = String(parsed.year);
  return `${dd}/${mm}/${yyyy}`;
};

const FinanceReports: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteYear, setDeleteYear] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const [month, setMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubCat = db.collection('usuarios').doc(user.uid).collection('categorias')
      .onSnapshot(
        snap => setCategories(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category))),
        err => console.warn('Erro ao carregar categorias:', err)
      );

    const unsubTx = dbService.listenCollection(user.uid, 'transacoes', (items) => {
      setAllTransactions(items);
    });

    return () => { unsubCat(); unsubTx(); };
  }, [user.uid]);

  // Lista dinâmica de anos disponíveis nos registros
  const yearsList = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    years.add(2024);
    years.add(2025);
    years.add(2026);
    allTransactions.forEach(tx => {
      const info = getTxDateInfo(tx);
      if (info.year && !isNaN(info.year)) years.add(info.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [allTransactions]);

  // Filtro estrito de Mês e Ano baseado na data real da transação
  const periodTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const info = getTxDateInfo(tx);
      const yearMatch = year === 'all' || info.year === year;
      const monthMatch = month === 'all' || info.month === month;
      return yearMatch && monthMatch;
    });
  }, [allTransactions, year, month]);

  // Filtro por categorias e subcategorias selecionadas
  const filteredTransactions = useMemo(() => {
    return periodTransactions
      .filter(tx => {
        const catMatch = selectedCats.length === 0 || selectedCats.includes(tx.category);
        const subMatch = selectedSubs.length === 0 || selectedSubs.includes(tx.subcategory);
        return catMatch && subMatch;
      })
      .sort((a, b) => {
        const parsedA = parseTxDate(a.date);
        const parsedB = parseTxDate(b.date);
        if (parsedA && parsedB) {
          const timeA = new Date(parsedA.year, parsedA.month - 1, parsedA.day).getTime();
          const timeB = new Date(parsedB.year, parsedB.month - 1, parsedB.day).getTime();
          return timeB - timeA;
        }
        return (b.date || '').localeCompare(a.date || '');
      });
  }, [periodTransactions, selectedCats, selectedSubs]);

  const availableSubcategories = useMemo(() => {
    if (selectedCats.length === 0) return [];
    return categories.filter(c => selectedCats.includes(c.name)).flatMap(c => c.subcategories || []);
  }, [categories, selectedCats]);

  const toggleCategory = (catName: string) => {
    setSelectedCats(prev => {
      const next = prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName];
      if (prev.includes(catName)) {
        const catObj = categories.find(c => c.name === catName);
        const subsToRemove = catObj?.subcategories || [];
        setSelectedSubs(sPrev => sPrev.filter(s => !subsToRemove.includes(s)));
      }
      return next;
    });
  };

  const toggleSubcategory = (subName: string) => {
    setSelectedSubs(prev => prev.includes(subName) ? prev.filter(s => s !== subName) : [...prev, subName]);
  };

  const togglePaid = async (tx: Transaction) => {
    if (!tx.id || !user?.uid) return;
    const txDocKey = dbService.getDocKey('transacoes', tx.date);
    await dbService.updateItem(user.uid, 'transacoes', tx.id, txDocKey, { 
      isPaid: !tx.isPaid 
    });
  };

  const handleEdit = (tx: Transaction) => {
    if (!tx.id) return;
    setEditingId(tx.id);
    try { navigate('/finance/transactions', { state: { editId: tx.id } }); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteYear || !user?.uid) return;
    try {
      await dbService.deleteItem(user.uid, 'transacoes', deleteId, deleteYear);
      if (editingId === deleteId) setEditingId(null);
      setDeleteId(null);
      setDeleteYear(null);
    } catch (err) {
      console.error("Erro ao excluir transação:", err);
    }
  };

  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="p-4 md:p-10 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-xl">
              <FileText size={22} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Relatórios de Caixa</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100 group">
            <Calendar size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <select className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer py-1 text-slate-700" value={year} onChange={e => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">Todos os Anos</option>
              {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <select className="bg-transparent font-black text-[10px] uppercase outline-none cursor-pointer py-1 text-slate-700" value={month} onChange={e => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              <option value="all">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2025, i, 1).toLocaleString('pt-BR', { month: 'long' })}</option>)}
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
        <SummaryCard title="Receitas" value={totalIncome} color="emerald" icon={ArrowUpCircle} />
        <SummaryCard title="Despesas" value={totalExpense} color="rose" icon={ArrowDownCircle} />
        <SummaryCard title="Saldo Filtrado" value={balance} color="slate" icon={Scale} />
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mx-2">
        <div className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Filter size={12} /> Filtro de Categorias</label>
           <p className="text-[11px] text-slate-400 font-medium">Selecione as categorias abaixo para filtrar os resultados na tabela em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat.id} onClick={() => toggleCategory(cat.name)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${selectedCats.includes(cat.name) ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
              {cat.name}
            </button>
          ))}
          {selectedCats.length > 0 && <button onClick={() => {setSelectedCats([]); setSelectedSubs([]);}} className="px-4 py-2.5 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-100 transition-colors"><X size={14} /> Limpar</button>}
        </div>
        {availableSubcategories.length > 0 && (
          <div className="pt-4 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap gap-2">
              {availableSubcategories.map(sub => (
                <button key={sub} onClick={() => toggleSubcategory(sub)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border ${selectedSubs.includes(sub) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-indigo-50/30 border-transparent text-indigo-400 hover:bg-indigo-50'}`}>{sub}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden ring-1 ring-slate-100 mx-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Status</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Data</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Categoria</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Subcategoria</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Descrição</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-44">Valor</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={7} className="p-24 text-center text-slate-300 font-bold uppercase text-[10px] tracking-[0.3em]">Nenhum registro encontrado</td></tr>
              ) : (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className={`group transition-all hover:bg-slate-50/30 ${tx.isPaid ? 'opacity-40' : ''}`}>
                    <td className="p-6 text-center">
                      <button onClick={() => togglePaid(tx)} className={`p-2.5 rounded-2xl transition-all active:scale-90 border-2 ${tx.isPaid ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-slate-200 bg-white border-slate-100 hover:text-indigo-400 hover:border-indigo-100'}`}><CheckCircle2 size={20} /></button>
                    </td>
                    <td className="p-6 text-center whitespace-nowrap"><span className="text-[10px] font-black text-slate-400 tabular-nums uppercase">{formatDisplayDate(tx.date)}</span></td>
                    <td className="p-6"><div className="flex items-center gap-2"><Circle size={6} className={tx.type === 'income' ? 'text-emerald-500 fill-emerald-500' : 'text-rose-500 fill-rose-500'} /><span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{tx.category}</span></div></td>
                    <td className="p-6"><span className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter opacity-70">{tx.subcategory || '—'}</span></td>
                    <td className="p-6"><span className="text-[11px] font-bold text-slate-500 italic truncate block w-24" title={tx.description}>{tx.description || '—'}</span></td>
                    <td className="p-6 text-right whitespace-nowrap"><div className="flex flex-col items-end"><span className={`text-sm font-black tabular-nums ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.type === 'income' ? '+' : '-'} R$ {(Number(tx.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Valor Líquido</span></div></td>
                    <td className="p-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(tx)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit3 size={16} /></button>
                        <button onClick={() => { setDeleteId(tx.id!); setDeleteYear(dbService.getDocKey('transacoes', tx.date)); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-rose-50 p-4 rounded-3xl text-rose-500">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Excluir Lançamento?</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Esta ação é permanente e não poderá ser desfeita no seu histórico financeiro.</p>
              </div>
              <div className="flex w-full gap-3 pt-4">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, color, icon: Icon }: any) => {
  const colors: any = { slate: 'bg-slate-900 text-slate-900', emerald: 'bg-emerald-600 text-emerald-600', rose: 'bg-rose-600 text-rose-600' };
  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-xl flex items-center gap-6 hover:translate-y-[-4px] transition-all">
      <div className={`p-4 rounded-[1.5rem] ${colors[color].split(' ')[0]} text-white shadow-lg`}><Icon size={26} /></div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{title}</p>
        <p className={`text-2xl font-black tabular-nums tracking-tighter ${value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>R$ {Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  );
};

export default FinanceReports;
