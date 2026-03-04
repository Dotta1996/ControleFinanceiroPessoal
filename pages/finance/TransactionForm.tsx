
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, Transaction, Category } from '../../types';
import { Plus, Trash2, Tag, Layers, Edit3, X, DollarSign, Loader2, List, Calendar, FileText, AlertTriangle, Hash } from 'lucide-react';
import { format, addMonths, parseISO, isValid } from 'date-fns';

const TransactionForm: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteYear, setDeleteYear] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: '',
    amount: '0,00',
    category: '',
    subcategory: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    repeat: '1' // Campo de Quantidade / Parcelas
  });

  useEffect(() => {
    if (!user?.uid) return;

    const unsubCat = db.collection('usuarios').doc(user.uid).collection('categorias')
      .onSnapshot(snap => {
        setCategories(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category)));
      });
    
    const unsubTx = dbService.listenCollection(user.uid, 'transacoes', (items) => {
      const sorted = items.sort((a, b) => {
        try {
          const ta = a.createdAt ? Date.parse(a.createdAt) : (a.date ? parseISO(a.date).getTime() : 0);
          const tb = b.createdAt ? Date.parse(b.createdAt) : (b.date ? parseISO(b.date).getTime() : 0);
          return tb - ta;
        } catch {
          return 0;
        }
      });
      setTransactions(sorted.slice(0, 50)); // Aumentado um pouco o limite
    });

    return () => { unsubCat(); unsubTx(); };
  }, [user.uid]);

  const location = useLocation();

  // Se a rota recebeu um editId via navigation state, carregar a transação
  useEffect(() => {
    const state: any = (location && (location.state as any)) || null;
    const editId = state?.editId;
    if (!editId || !user?.uid) return;
    (async () => {
      try {
        const tx = await dbService.getItemById(user.uid, 'transacoes', editId);
        if (tx) handleEdit(tx);
      } catch (err) {
        console.error('Erro ao carregar transação via location.state:', err);
      }
    })();
  }, [location, user?.uid]);

  // Ouvir evento global para edição a partir de outros componentes
  useEffect(() => {
    const handler = async (e: Event) => {
      const custom = e as CustomEvent<string>;
      const txId = custom?.detail;
      if (!txId || !user?.uid) return;
      try {
        const tx = await dbService.getItemById(user.uid, 'transacoes', txId);
        if (tx) handleEdit(tx);
      } catch (err) {
        console.error('Erro ao carregar transação para edição:', err);
      }
    };
    window.addEventListener('edit-transaction', handler as EventListener);
    return () => window.removeEventListener('edit-transaction', handler as EventListener);
  }, [user?.uid]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
      setFormData({ ...formData, amount: "0,00" });
      return;
    }
    const floatVal = parseInt(value) / 100;
    const formatted = floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData({ ...formData, amount: formatted });
  };

  const handleEdit = (tx: Transaction) => {
    if (!tx.id) return;
    setEditingId(tx.id);
    setFormData({
      description: tx.description || '',
      amount: (tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      category: tx.category || '',
      subcategory: tx.subcategory || '',
      date: tx.date || format(new Date(), 'yyyy-MM-dd'),
      repeat: '1'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      description: '', 
      amount: '0,00', 
      category: '', 
      subcategory: '', 
      date: format(new Date(), 'yyyy-MM-dd'),
      repeat: '1' 
    });
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteYear || !user?.uid) return;
    try {
      await dbService.deleteItem(user.uid, 'transacoes', deleteId, deleteYear);
      if (editingId === deleteId) handleCancelEdit();
      setDeleteId(null);
      setDeleteYear(null);
    } catch (err) {
      console.error("Erro ao excluir transação:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !user?.uid) return;

    const categoryInfo = categories.find(c => c.name === formData.category);
    if (!categoryInfo) return;

    setLoading(true);
    const count = Math.max(1, parseInt(formData.repeat) || 1);
    const amountVal = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));
    
    try {
      const baseDate = parseISO(formData.date);
      if (!isValid(baseDate)) throw new Error("Data inválida");

      if (editingId) {
        // Para edição, precisamos do ano original
        const originalTx = transactions.find(t => t.id === editingId);
        const originalYear = originalTx ? dbService.getYearFromDate(originalTx.date) : dbService.getYearFromDate(formData.date);
        
        await dbService.updateItem(user.uid, 'transacoes', editingId, originalYear, {
          description: formData.description,
          amount: amountVal,
          category: formData.category,
          subcategory: formData.subcategory,
          date: formData.date,
          month: baseDate.getMonth() + 1,
          year: baseDate.getFullYear(),
          type: categoryInfo.type,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Novo Lançamento com Replicação (Parcelas)
        const newItems = [];
        for (let i = 0; i < count; i++) {
          const currentDate = addMonths(baseDate, i);
          newItems.push({
            description: formData.description + (count > 1 ? ` (${i + 1}/${count})` : ''),
            amount: amountVal,
            category: formData.category,
            subcategory: formData.subcategory,
            date: format(currentDate, 'yyyy-MM-dd'),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear(),
            type: categoryInfo.type,
            isPaid: false,
            createdAt: new Date().toISOString()
          });
        }
        await dbService.saveItems(user.uid, 'transacoes', newItems);
      }
      handleCancelEdit();
    } catch (err) {
      console.error("Erro ao salvar lançamento:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentSubcats = categories.find(c => c.name === formData.category)?.subcategories || [];

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300 pb-24 relative">
      <header className="flex items-center gap-4">
        <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
          <List size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{editingId ? 'Editar Registro' : 'Lançar Transação'}</h2>
         
        </div>
      </header>

      <div className={`bg-white p-6 md:p-10 rounded-[2.5rem] border-2 shadow-sm transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-200'}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><DollarSign size={12}/> Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">R$</span>
              <input
                type="text"
                inputMode="numeric"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
                value={formData.amount}
                onChange={handleCurrencyChange}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><FileText size={12}/> Descrição</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
              placeholder="Almoço, Internet..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Calendar size={12}/> Data Inicial</label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none text-sm cursor-pointer focus:bg-white focus:border-indigo-500 transition-all"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              onClick={(e) => (e.target as any).showPicker?.()}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Tag size={12}/> Categoria</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer text-sm focus:bg-white focus:border-indigo-500 transition-all"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
              required
            >
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Layers size={12}/> Subcategoria</label>
            <select
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer text-sm disabled:opacity-30 focus:bg-white focus:border-indigo-500 transition-all"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              disabled={!formData.category || currentSubcats.length === 0}
            >
              <option value="">Selecione...</option>
              {currentSubcats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Hash size={12}/> Quantidade / Parcelas</label>
            <input
              type="number"
              min="1"
              max="60"
              disabled={!!editingId}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all disabled:opacity-30"
              value={formData.repeat}
              onChange={(e) => setFormData({ ...formData, repeat: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex items-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <X size={16}/> Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`flex-[2] py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={16} /> : editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-auto">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="p-3 text-[9px] font-black text-slate-400 uppercase text-center">Data</th>
                  <th className="p-3 text-[9px] font-black text-slate-400 uppercase text-center">Descrição</th>
                  <th className="p-3 text-[9px] font-black text-slate-400 uppercase text-center">Cat / Sub</th>
                  <th className="p-3 text-[9px] font-black text-slate-400 uppercase text-center">Valor</th>
                  <th className="p-3 text-[9px] font-black text-slate-400 uppercase text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                   <tr><td colSpan={5} className="p-10 text-center text-slate-400 italic font-medium">Nenhum registro recente.</td></tr>
                ) : (
                  transactions.map(tx => (
                    <tr key={tx.id} className={`hover:bg-indigo-50/10 transition-colors ${editingId === tx.id ? 'bg-indigo-50/40' : ''}`}>
                      <td className="p-3 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">
                        {tx.date.split('-').reverse().join('/')}
                      </td>
                      <td className="p-3 text-center text-[11px] font-bold text-slate-800 line-clamp-1">{tx.description || 'S/ Descrição'}</td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-indigo-500 uppercase">{tx.category}</span>
                          {tx.subcategory && <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{tx.subcategory}</span>}
                        </div>
                      </td>
                      <td className={`p-3 text-center text-[11px] font-black tabular-nums whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(tx)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit3 size={16} /></button>
                          <button onClick={() => { setDeleteId(tx.id!); setDeleteYear(dbService.getYearFromDate(tx.date)); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação Customizado */}
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

export default TransactionForm;
