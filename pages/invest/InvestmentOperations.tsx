
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, Ticker, InvestmentOperation } from '../../types';
import { Trash2, Edit3, Loader2, X, TrendingUp, Calendar, Tag, Hash, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const InvestmentOperations: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [ops, setOps] = useState<InvestmentOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteYear, setDeleteYear] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Compra' as 'Compra' | 'Venda' | 'Rendimento',
    ticker: '',
    quantity: '',
    value: '0,00',
    taxes: '0,00'
  });

  useEffect(() => {
    if (!user?.uid) return;
    const unsubTickers = db.collection('usuarios').doc(user.uid).collection('tickers')
      .onSnapshot(snap => setTickers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ticker))));
    
    const unsubOps = dbService.listenCollection(user.uid, 'investimentos', (items) => {
      const sorted = items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOps(sorted);
    });

    return () => { unsubTickers(); unsubOps(); };
  }, [user.uid]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      date: format(new Date(), 'yyyy-MM-dd'), 
      type: 'Compra', 
      ticker: '', 
      quantity: '', 
      value: '0,00', 
      taxes: '0,00' 
    });
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteYear || !user?.uid) return;
    try {
      await dbService.deleteItem(user.uid, 'investimentos', deleteId, deleteYear);
      if (editingId === deleteId) handleCancelEdit();
      setDeleteId(null);
      setDeleteYear(null);
    } catch (err) {
      console.error("Erro ao excluir lançamento:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticker || !user?.uid) return;
    setLoading(true);
    try {
      const inputVal = parseFloat(formData.value.replace(/\./g, '').replace(',', '.'));
      const quantity = parseFloat(formData.quantity) || 0;
      
      let unitPrice = 0;
      let totalValue = 0;

      if (formData.type === 'Rendimento') {
        totalValue = inputVal;
        unitPrice = quantity > 0 ? totalValue / quantity : 0;
      } else {
        unitPrice = inputVal;
        totalValue = unitPrice * quantity;
      }

      const payload = {
        date: formData.date,
        type: formData.type,
        ticker: formData.ticker,
        quantity: quantity,
        unitPrice: unitPrice,
        totalValue: totalValue,
        value: inputVal,
        taxes: parseFloat(formData.taxes.replace(/\./g, '').replace(',', '.')) || 0,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const originalOp = ops.find(o => o.id === editingId);
        const originalYear = originalOp ? dbService.getYearFromDate(originalOp.date) : dbService.getYearFromDate(formData.date);
        await dbService.updateItem(user.uid, 'investimentos', editingId, originalYear, payload);
      } else {
        await dbService.saveItem(user.uid, 'investimentos', {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      handleCancelEdit();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (op: InvestmentOperation) => {
    setEditingId(op.id!);
    setFormData({
      date: op.date,
      type: op.type,
      ticker: op.ticker,
      quantity: op.quantity.toString(),
      value: op.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      taxes: op.taxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300 pb-24 relative">
      <header className="flex items-center gap-4">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
          <TrendingUp size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lançamentos</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Movimentações da Carteira</p>
        </div>
      </header>

      <div className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-200 shadow-sm'}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 flex bg-slate-100 p-1.5 rounded-2xl">
            {['Compra', 'Venda', 'Rendimento'].map(t => (
              <button 
                key={t} 
                type="button" 
                onClick={() => setFormData({ ...formData, type: t as any })} 
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === t ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
              >
                {t}
              </button>
            ))}
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Tag size={12}/> Ativo</label>
            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:bg-white focus:border-indigo-500" value={formData.ticker} onChange={(e) => setFormData({ ...formData, ticker: e.target.value })} required>
              <option value="">Selecione...</option>
              {tickers.map(t => <option key={t.id} value={t.symbol}>{t.symbol}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Calendar size={12}/> Data</label>
            <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-indigo-500 cursor-pointer" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} onClick={(e) => (e.target as any).showPicker?.()} required />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Hash size={12}/> Quantidade</label>
            <input type="number" step="any" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:bg-white focus:border-indigo-500" placeholder="0.00" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <DollarSign size={12}/> {formData.type === 'Rendimento' ? 'Valor Total' : 'Valor Unitário'}
            </label>
            <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:bg-white focus:border-indigo-500" placeholder="R$ 0,00" value={formData.value} onChange={(e) => {
              let val = e.target.value.replace(/\D/g, "");
              if (!val) { setFormData({...formData, value: "0,00"}); return; }
              const floatVal = parseInt(val) / 100;
              setFormData({...formData, value: floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })});
            }} required />
          </div>

          <div className="lg:col-span-3 flex gap-3">
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <X size={16}/> Cancelar
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className={`flex-[2] py-4 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ativo</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Qtd</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">V. Unitário</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">V. Total</th>
                <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ops.length === 0 ? (
                <tr><td colSpan={7} className="p-20 text-center text-slate-400 font-medium italic">Nenhum lançamento encontrado.</td></tr>
              ) : (
                ops.map(op => (
                  <tr key={op.id} className={`hover:bg-slate-50/50 transition-colors ${editingId === op.id ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-4 text-center text-[10px] font-bold text-slate-500">{op.date.split('-').reverse().join('/')}</td>
                    <td className="p-4 text-center">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${op.type === 'Compra' ? 'bg-indigo-50 text-indigo-600' : op.type === 'Venda' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {op.type}
                      </span>
                    </td>
                    <td className="p-4 text-center"><span className="text-[11px] font-black text-slate-900">{op.ticker}</span></td>
                    <td className="p-4 text-center"><span className="text-[11px] font-bold text-slate-500 tabular-nums">{op.quantity}</span></td>
                    <td className="p-4 text-right">
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                        R$ {(op.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-[11px] font-black text-slate-900 tabular-nums">
                        R$ {(op.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEdit(op)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit3 size={16} /></button>
                        <button onClick={() => { setDeleteId(op.id!); setDeleteYear(dbService.getYearFromDate(op.date)); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                <h3 className="text-xl font-black text-slate-900">Excluir Operação?</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Você removerá este lançamento do seu histórico de ativos permanentemente.</p>
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

export default InvestmentOperations;
