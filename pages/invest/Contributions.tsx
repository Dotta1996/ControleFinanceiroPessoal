
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, Aporte } from '../../types';
import { Edit3, Loader2, Trash2, X, PiggyBank, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const Contributions: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteYear, setDeleteYear] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '0,00'
  });

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = dbService.listenCollection(user.uid, 'aportes', (items) => {
      const sorted = items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAportes(sorted);
    });
    return unsub;
  }, [user.uid]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ 
      date: format(new Date(), 'yyyy-MM-dd'), 
      amount: '0,00' 
    });
  };

  const confirmDelete = async () => {
    if (!deleteId || !deleteYear || !user?.uid) return;
    try {
      await dbService.deleteItem(user.uid, 'aportes', deleteId, deleteYear);
      if (editingId === deleteId) handleCancelEdit();
      setDeleteId(null);
      setDeleteYear(null);
    } catch (err) {
      console.error("Erro ao excluir aporte:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !user?.uid) return;
    setLoading(true);
    try {
      const amountClean = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));
      const payload = {
        date: formData.date,
        amount: amountClean,
        updatedAt: new Date().toISOString()
      };
      
      if (editingId) {
        const originalAp = aportes.find(a => a.id === editingId);
        const originalYear = originalAp ? dbService.getYearFromDate(originalAp.date) : dbService.getYearFromDate(formData.date);
        await dbService.updateItem(user.uid, 'aportes', editingId, originalYear, payload);
      } else {
        await dbService.saveItem(user.uid, 'aportes', {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      handleCancelEdit();
    } catch (err) {
      console.error("Erro ao salvar aporte:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ap: Aporte) => {
    if (!ap.id) return;
    setEditingId(ap.id);
    setFormData({ 
      date: ap.date, 
      amount: ap.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300 pb-24 relative">
      <header className="flex items-center gap-4">
        <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
          <PiggyBank size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Aportes</h2>
        </div>
      </header>

      <div className={`bg-white p-8 rounded-[3rem] border-2 transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-200 shadow-sm'}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Calendar size={12}/> Data do Aporte</label>
            <input 
              type="date" 
              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all cursor-pointer" 
              value={formData.date} 
              onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
              required 
              onClick={(e) => (e.target as any).showPicker?.()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><DollarSign size={12}/> Valor do Aporte</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">R$</span>
              <input 
                type="text" 
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                placeholder="0,00" 
                value={formData.amount} 
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "");
                  if (!val) { setFormData({...formData, amount: "0,00"}); return; }
                  setFormData({...formData, amount: (parseInt(val) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })});
                }} 
                required 
              />
            </div>
          </div>
          <div className="md:col-span-2 flex gap-3">
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <X size={16} /> Cancelar
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className={`flex-[2] py-5 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : editingId ? 'Salvar Alterações' : 'Registrar Novo Aporte'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Valor do Aporte</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aportes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-20 text-center text-slate-400 font-medium italic">Nenhum aporte registrado ainda.</td>
                </tr>
              ) : (
                aportes.map(ap => (
                  <tr key={ap.id} className={`hover:bg-slate-50/50 transition-colors ${editingId === ap.id ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-5 text-center">
                      <span className="text-[11px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                        {ap.date.split('-').reverse().join('/')}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-[14px] font-black text-slate-900 tabular-nums">
                        R$ {ap.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(ap)} 
                          className={`p-2 transition-colors ${editingId === ap.id ? 'text-indigo-600 bg-indigo-50 rounded-xl' : 'text-slate-300 hover:text-indigo-600'}`}
                          title="Editar"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => { setDeleteId(ap.id!); setDeleteYear(dbService.getYearFromDate(ap.date)); }} 
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
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
                <h3 className="text-xl font-black text-slate-900">Excluir Aporte?</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Este registro será removido permanentemente do seu histórico de injeção de capital.</p>
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

export default Contributions;
