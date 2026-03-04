
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, GastoCarro } from '../../types';
import { 
  Car, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Calendar, 
  Tag, 
  DollarSign, 
  Loader2, 
  AlertTriangle,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';

const GastosCarro: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [gastos, setGastos] = useState<GastoCarro[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteYear, setDeleteYear] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    item: '',
    quantity: '1',
    total: '0,00',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = dbService.listenCollection(user.uid, 'gastos_carro', (items) => {
      const sorted = items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setGastos(sorted);
    });

    return () => unsub();
  }, [user.uid]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
      setFormData({ ...formData, total: "0,00" });
      return;
    }
    const floatVal = parseInt(value) / 100;
    const formatted = floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData({ ...formData, total: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item || !formData.total || !user?.uid) return;

    setLoading(true);
    const totalVal = parseFloat(formData.total.replace(/\./g, '').replace(',', '.'));

    try {
      const payload = {
        item: formData.item,
        quantity: parseFloat(formData.quantity) || 1,
        total: totalVal,
        date: formData.date,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const originalGasto = gastos.find(g => g.id === editingId);
        const originalYear = originalGasto ? dbService.getYearFromDate(originalGasto.date) : dbService.getYearFromDate(formData.date);
        await dbService.updateItem(user.uid, 'gastos_carro', editingId, originalYear, payload);
      } else {
        await dbService.saveItem(user.uid, 'gastos_carro', {
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

  const handleEdit = (gasto: GastoCarro) => {
    if (!gasto.id) return;
    setEditingId(gasto.id);
    setFormData({
      item: gasto.item,
      quantity: (gasto.quantity || 1).toString(),
      total: (gasto.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      date: gasto.date || format(new Date(), 'yyyy-MM-dd')
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      item: '', 
      quantity: '1', 
      total: '0,00', 
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteYear || !user?.uid) return;
    try {
      await dbService.deleteItem(user.uid, 'gastos_carro', deleteId, deleteYear);
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
          <Car size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            {editingId ? 'Editar Gasto' : 'Gastos com o Carro'}
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Manutenção e Despesas Veiculares</p>
        </div>
      </header>

      {/* Formulário */}
      <div className={`bg-white p-6 md:p-10 rounded-[2.5rem] border-2 shadow-sm transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-200'}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Tag size={12}/> Item de Gasto</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
              placeholder="Ex: Combustível, Troca de Óleo, Seguro..."
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Hash size={12}/> Quantidade</label>
            <input
              type="number"
              step="any"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><DollarSign size={12}/> Valor Total</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">R$</span>
              <input
                type="text"
                inputMode="numeric"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none text-sm focus:bg-white focus:border-indigo-500 transition-all"
                value={formData.total}
                onChange={handleCurrencyChange}
                required
              />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-1">
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

          <div className="lg:col-span-2 flex items-end justify-end gap-3">
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
              {loading ? <Loader2 className="animate-spin" size={16} /> : editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
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
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-left">Item / Despesa</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Quantidade</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-right">Valor Total</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest">Nenhum gasto registrado</td>
                </tr>
              ) : (
                gastos.map(g => (
                  <tr key={g.id} className={`hover:bg-slate-50/50 transition-colors ${editingId === g.id ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-4 text-center">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                        {g.date.split('-').reverse().join('/')}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-black text-slate-900">{g.item}</p>
                    </td>
                    <td className="p-4 text-center">
                      <p className="text-sm font-bold text-slate-500 tabular-nums">{g.quantity}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm font-black text-slate-900 tabular-nums">
                        R$ {g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEdit(g)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit3 size={16} /></button>
                        <button onClick={() => { setDeleteId(g.id!); setDeleteYear(dbService.getYearFromDate(g.date)); }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
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
                <p className="text-sm text-slate-500 font-medium mt-2">Você removerá este gasto veicular permanentemente do seu histórico.</p>
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

export default GastosCarro;
