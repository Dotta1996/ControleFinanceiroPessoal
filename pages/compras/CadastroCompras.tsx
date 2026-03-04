
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, CompraSonho } from '../../types';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  ShoppingCart, 
  Calendar, 
  Tag, 
  DollarSign, 
  Loader2, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

const CadastroCompras: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [compras, setCompras] = useState<CompraSonho[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteYear, setDeleteYear] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    item: '',
    amount: '0,00',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = dbService.listenCollection(user.uid, 'compras_sonhos', (items) => {
      const sorted = items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCompras(sorted);
    });

    return () => unsub();
  }, [user.uid]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item || !formData.amount || !user?.uid) return;

    setLoading(true);
    const amountVal = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));

    try {
      const payload = {
        item: formData.item,
        amount: amountVal,
        date: formData.date,
        description: formData.description,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const originalCompra = compras.find(c => c.id === editingId);
        const originalYear = originalCompra ? dbService.getYearFromDate(originalCompra.date) : dbService.getYearFromDate(formData.date);
        await dbService.updateItem(user.uid, 'compras_sonhos', editingId, originalYear, payload);
      } else {
        await dbService.saveItem(user.uid, 'compras_sonhos', {
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

  const handleEdit = (compra: CompraSonho) => {
    if (!compra.id) return;
    setEditingId(compra.id);
    setFormData({
      item: compra.item,
      amount: (compra.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      date: compra.date || format(new Date(), 'yyyy-MM-dd'),
      description: compra.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      item: '', 
      amount: '0,00', 
      date: format(new Date(), 'yyyy-MM-dd'), 
      description: '' 
    });
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteYear || !user?.uid) return;
    try {
      await dbService.deleteItem(user.uid, 'compras_sonhos', deleteId, deleteYear);
      if (editingId === deleteId) handleCancelEdit();
      setDeleteId(null);
      setDeleteYear(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300 pb-24 relative">
      <header className="flex items-center gap-4">
        <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
          <ShoppingCart size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            {editingId ? 'Editar Compra' : 'Cadastro de Compras'}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Planejamento e Aquisições</p>
        </div>
      </header>

      {/* Formulário */}
      <div className={`bg-white p-6 md:p-10 rounded-[2.5rem] border-2 shadow-sm transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-200'}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Tag size={12}/> Item / Sonho</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
              placeholder="Ex: Macbook M3, Viagem Japão..."
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              required
            />
          </div>

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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Calendar size={12}/> Data</label>
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><FileText size={12}/> Descrição (Opcional)</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
              placeholder="Mais detalhes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-8 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <X size={16}/> Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`px-12 py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-32">Data</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-left">Item / Sonho</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Valor</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-left hidden md:table-cell">Descrição</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">Nenhuma compra cadastrada</td>
                </tr>
              ) : (
                compras.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${editingId === c.id ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-4 text-center">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                        {c.date.split('-').reverse().join('/')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-black text-slate-900">{c.item}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-black text-slate-900 tabular-nums">
                        R$ {c.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="text-xs font-bold text-slate-400 italic truncate max-w-[200px]">
                        {c.description || '—'}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEdit(c)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit3 size={16} /></button>
                        <button onClick={() => { setDeleteId(c.id!); setDeleteYear(dbService.getYearFromDate(c.date)); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Deletar */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-rose-50 p-4 rounded-3xl text-rose-500">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Excluir Registro?</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Você removerá este item do seu planejamento permanentemente.</p>
              </div>
              <div className="flex w-full gap-3 pt-4">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-rose-100">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroCompras;
