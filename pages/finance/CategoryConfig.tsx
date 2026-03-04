
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { UserProfile, Category } from '../../types';
import { Plus, Trash2, Tag, Layers, Edit3, X, Save, AlertCircle, AlertTriangle } from 'lucide-react';

const CategoryConfig: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [subName, setSubName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = db.collection('usuarios').doc(user.uid).collection('categorias')
      .onSnapshot(snap => {
        const data = snap.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as Category));
        setCategories(data.sort((a, b) => a.name.localeCompare(b.name)));
      });
    return unsub;
  }, [user.uid]);

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id || null);
    setName(cat.name);
    setType(cat.type);
    setSubName(cat.subcategories ? cat.subcategories.join(', ') : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setSubName('');
    setType('expense');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !user?.uid) return;
    setLoading(true);

    try {
      const processedSubs = subName.split(',')
        .map(s => s.trim())
        .filter(s => s !== '');

      const payload = {
        name: name.trim(),
        type,
        subcategories: processedSubs,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await db.collection('usuarios').doc(user.uid).collection('categorias').doc(editingId).update(payload);
      } else {
        await db.collection('usuarios').doc(user.uid).collection('categorias').add(payload);
      }
      
      handleCancel();
    } catch (err) {
      console.error('Erro ao salvar categoria:', err);
      alert('Erro ao salvar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !user?.uid) return;
    try {
      await db.collection('usuarios').doc(user.uid).collection('categorias').doc(deleteId).delete();
      setDeleteId(null);
    } catch (err) {
      console.error("Erro ao excluir categoria:", err);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-400 pb-24 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Categorias</h2>
        </div>
      </header>

      <div className={`bg-white p-8 rounded-[2.5rem] border-2 transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-200 shadow-sm'}`}>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="md:col-span-2 flex bg-slate-100 p-1.5 rounded-2xl">
            <button 
              type="button" 
              onClick={() => setType('income')} 
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'income' ? 'bg-white shadow-lg text-emerald-600' : 'text-slate-400'}`}
            >
              Entrada
            </button>
            <button 
              type="button" 
              onClick={() => setType('expense')} 
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'expense' ? 'bg-white shadow-lg text-rose-600' : 'text-slate-400'}`}
            >
              Saída
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Tag size={12} /> Nome da Categoria
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
              placeholder="Ex: Alimentação, Salário..."
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Layers size={12} /> Subcategorias (opcional)
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
              placeholder="Separe por vírgula. Ex: Mercado, Ifood, Restaurante" 
              value={subName} 
              onChange={(e) => setSubName(e.target.value)} 
            />
          </div>

          <div className="md:col-span-2 flex gap-4">
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : editingId ? 'Atualizar Categoria' : 'Criar Categoria'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancel}
                className="px-6 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Subcategorias</th>
                <th className="p-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400 font-medium italic">Nenhuma categoria cadastrada.</td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${cat.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {cat.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="p-5">
                      <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{cat.name}</p>
                    </td>
                    <td className="p-5 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                          cat.subcategories.map(sub => (
                            <span key={sub} className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase">{sub}</span>
                          ))
                        ) : (
                          <span className="text-[8px] text-slate-300 italic font-bold uppercase">Nenhuma sub</span>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleEdit(cat)} 
                          className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(cat.id!)} 
                          className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
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
                <h3 className="text-xl font-black text-slate-900">Excluir Categoria?</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Isso não removerá transações existentes, mas elas perderão o vínculo com esta categoria.</p>
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

export default CategoryConfig;
