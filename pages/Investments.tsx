
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { UserProfile, Investment, ASSET_TYPES } from '../types';
import { Plus, TrendingUp, DollarSign, Trash2, Edit3, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface InvestmentsProps {
  user: UserProfile;
}

const Investments: React.FC<InvestmentsProps> = ({ user }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    assetName: '',
    type: ASSET_TYPES[0],
    quantity: '',
    buyPrice: '',
    currentPrice: '',
    totalDividends: '0',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsub = db.collection('usuarios').doc(user.uid).collection('investimentos')
      .onSnapshot((snapshot) => {
        setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
      });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (deletingId) {
      const timer = setTimeout(() => setDeletingId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deletingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.collection('usuarios').doc(user.uid).collection('investimentos').add({
        ...formData,
        quantity: parseFloat(formData.quantity),
        buyPrice: parseFloat(formData.buyPrice),
        currentPrice: parseFloat(formData.currentPrice || formData.buyPrice),
        totalDividends: parseFloat(formData.totalDividends || '0'),
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({
        assetName: '',
        type: ASSET_TYPES[0],
        quantity: '',
        buyPrice: '',
        currentPrice: '',
        totalDividends: '0',
        date: format(new Date(), 'yyyy-MM-dd')
      });
    } catch (err) {
      console.error("Erro ao salvar investimento:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      try {
        await db.collection('usuarios').doc(user.uid).collection('investimentos').doc(id).delete();
        setDeletingId(null);
      } catch (err) {
        console.error("Erro ao deletar investimento:", err);
      }
    } else {
      setDeletingId(id);
    }
  };

  const updatePrice = async (id: string, currentPrice: number) => {
    const newPrice = prompt("Novo preço atual:", currentPrice.toString());
    if (newPrice) {
      await db.collection('usuarios').doc(user.uid).collection('investimentos').doc(id).update({
        currentPrice: parseFloat(newPrice)
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Carteira de Investimentos</h2>
          <p className="text-gray-500 text-sm">Acompanhe a evolução do seu patrimônio.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Ativo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments.map((inv) => {
          const invested = inv.quantity * inv.buyPrice;
          const current = inv.quantity * inv.currentPrice;
          const profit = current - invested + inv.totalDividends;
          const profitPercent = (profit / (invested || 1)) * 100;

          return (
            <div key={inv.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full mb-2 inline-block">
                    {inv.type}
                  </span>
                  <h4 className="text-lg font-bold text-gray-900">{inv.assetName}</h4>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => updatePrice(inv.id!, inv.currentPrice)} className="p-1.5 text-gray-400 hover:text-indigo-600 bg-gray-50 rounded-lg">
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(inv.id!)} 
                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${deletingId === inv.id ? 'bg-rose-500 text-white animate-pulse' : 'text-gray-400 hover:text-rose-600 bg-gray-50'}`}
                  >
                    {deletingId === inv.id ? <Check size={16} /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Qtd / Preço Médio</span>
                  <span className="font-medium">{inv.quantity} / R$ {(inv.buyPrice || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor Atual</span>
                  <span className="font-medium">R$ {(current || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Lucro Total</p>
                    <p className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      R$ {(profit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-bold ${profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {investments.length === 0 && (
          <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center justify-center text-gray-400">
            <TrendingUp size={48} className="mb-4 opacity-20" />
            <p>Sua carteira está vazia. Comece a investir!</p>
          </div>
        )}
      </div>

      {/* Modal Investment */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Cadastrar Investimento</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nome do Ativo (Ticker/Empresa)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: PETR4, AAPL, CDB Banco X..."
                  value={formData.assetName}
                  onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Ativo</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {ASSET_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Quantidade</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Preço de Compra</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.buyPrice}
                  onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rendimentos Totais</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.totalDividends}
                  onChange={(e) => setFormData({ ...formData, totalDividends: e.target.value })}
                />
              </div>

              <div className="col-span-full flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md active:scale-95 transition-all"
                >
                  Salvar Ativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Investments;
