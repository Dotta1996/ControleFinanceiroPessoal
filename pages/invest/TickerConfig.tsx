
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { UserProfile, Ticker } from '../../types';
import { Trash2, Sparkles, AlertTriangle, Edit3, X, Loader2, Tag, Briefcase, DollarSign, RefreshCw } from 'lucide-react';

const TickerConfig: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [syncFailureModal, setSyncFailureModal] = useState(false);
  const [syncingTickerId, setSyncingTickerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = db.collection('usuarios').doc(user.uid).collection('tickers')
      .onSnapshot(snap => setTickers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ticker))));
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    // Verificar se há tickers com falha no localStorage
    const stored = localStorage.getItem('syncFailedTickers');
    if (stored) {
      try {
        const failed = JSON.parse(stored);
        setFailedTickers(failed);
        setSyncFailureModal(true);
      } catch (e) {
        console.warn('Erro ao ler syncFailedTickers:', e);
      }
    }
  }, []);

  const handleCancelEdit = () => {
    setEditingId(null);
    setSymbol('');
    setName('');
    setType('');
  };

  const handleEdit = (t: Ticker) => {
    setEditingId(t.id!);
    setSymbol(t.symbol);
    setName(t.name || '');
    setType(t.type || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !user?.uid) return;
    setLoading(true);

    try {
      let finalData: Partial<Ticker> = {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        type: type || 'Outros'
      };

      // Se não tiver nome ou tipo (ou for novo e só tiver o símbolo), tenta buscar via Brapi
      if (!editingId && (!name || !type)) {
        try {
          const apiKey = import.meta.env.VITE_BRAPI_API_KEY || '9ohxymKokgmQcyvkFTnhkx';
          const response = await fetch(`https://brapi.dev/api/quote/${symbol.toUpperCase()}?fundamental=false&dividends=false`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const result = data.results[0];
              const price = result.regularMarketPrice || result.lastPrice || 0;
              
              finalData = {
                symbol: symbol.toUpperCase(),
                name: result.shortName || result.longName || symbol.toUpperCase(),
                sector: result.sector || 'Outros',
                type: type || 'Ações',
                lastPrice: typeof price === 'number' ? price : (price ? parseFloat(String(price).replace(/,/g, '.')) : 0)
              };
            }
          }
        } catch (brapiErr) {
          console.warn('Erro ao buscar dados da Brapi:', brapiErr);
          // Se falhar na Brapi, mantém os valores padrão
        }
      }

      if (editingId) {
        await db.collection('usuarios').doc(user.uid).collection('tickers').doc(editingId).update(finalData);
      } else {
        await db.collection('usuarios').doc(user.uid).collection('tickers').add(finalData);
      }
      handleCancelEdit();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !user?.uid) return;
    try {
      await db.collection('usuarios').doc(user.uid).collection('tickers').doc(deleteId).delete();
      if (editingId === deleteId) handleCancelEdit();
      setDeleteId(null);
    } catch (err) {
      console.error("Erro ao excluir ativo:", err);
    }
  };

  const saveManualPrice = async (tickerId: string) => {
    if (!user?.uid || !editingPrice) return;
    try {
      const price = parseFloat(editingPrice.replace(/,/g, '.'));
      if (isNaN(price) || price <= 0) {
        alert('Por favor, informe um preço válido maior que zero');
        return;
      }
      await db.collection('usuarios').doc(user.uid).collection('tickers').doc(tickerId).update({ lastPrice: price });
      setEditingPriceId(null);
      setEditingPrice('');
    } catch (err) {
      console.error('Erro ao salvar preço:', err);
    }
  };

  const handleKeepCurrentPrices = () => {
    // Limpar localStorage e fechar modal
    localStorage.removeItem('syncFailedTickers');
    setFailedTickers([]);
    setSyncFailureModal(false);
  };

  const handleEditFailedPrices = () => {
    // Fechar modal mas manter tickers como "em edição"
    setSyncFailureModal(false);
  };

  const syncAllPrices = async () => {
    if (!user?.uid || tickers.length === 0) return;
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const ticker of tickers) {
      try {
        setSyncingTickerId(ticker.id || null);
        const apiKey = import.meta.env.VITE_BRAPI_API_KEY || '9ohxymKokgmQcyvkFTnhkx';
        const response = await fetch(`https://brapi.dev/api/quote/${ticker.symbol}?fundamental=false&dividends=false`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const result = data.results[0];
            let price: any = result.regularMarketPrice ?? result.lastPrice ?? result.close ?? null;
            if (typeof price === 'string') price = parseFloat(price.replace(/,/g, '.'));
            
            if (price && typeof price === 'number' && isFinite(price)) {
              await db.collection('usuarios').doc(user.uid).collection('tickers').doc(ticker.id!).update({ lastPrice: price });
              successCount++;
              continue;
            }
          }
        }
        failCount++;
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    setSyncingTickerId(null);
    setLoading(false);
    alert(`Sincronização concluída!\nSucesso: ${successCount}\nFalha: ${failCount}`);
  };

  const syncSinglePrice = async (ticker: Ticker) => {
    if (!user?.uid || !ticker.id) return;
    setSyncingTickerId(ticker.id);
    
    try {
      // Prioriza a chave do ambiente, mas usa a fornecida pelo usuário como fallback direto
      const apiKey = import.meta.env.VITE_BRAPI_API_KEY || '9ohxymKokgmQcyvkFTnhkx';
      const response = await fetch(`https://brapi.dev/api/quote/${ticker.symbol}?fundamental=false&dividends=false`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          let price: any = result.regularMarketPrice ?? result.lastPrice ?? result.close ?? null;
          
          if (typeof price === 'string') price = parseFloat(price.replace(/,/g, '.'));
          
          if (price && typeof price === 'number' && isFinite(price)) {
            await db.collection('usuarios').doc(user.uid).collection('tickers').doc(ticker.id).update({ lastPrice: price });
            // Remover de failedTickers se estiver lá
            setFailedTickers(prev => prev.filter(s => s !== ticker.symbol));
            
            // Atualizar localStorage se necessário
            const stored = localStorage.getItem('syncFailedTickers');
            if (stored) {
              const failed = JSON.parse(stored) as string[];
              const newFailed = failed.filter(s => s !== ticker.symbol);
              if (newFailed.length === 0) localStorage.removeItem('syncFailedTickers');
              else localStorage.setItem('syncFailedTickers', JSON.stringify(newFailed));
            }
          } else {
            alert(`Não foi possível obter o preço para ${ticker.symbol}`);
          }
        } else {
          alert(`Nenhum resultado encontrado para ${ticker.symbol}`);
        }
      } else {
        alert(`Erro ao buscar cotação para ${ticker.symbol} (Status: ${response.status})`);
      }
    } catch (err) {
      console.error(err);
      alert(`Erro de conexão ao buscar ${ticker.symbol}`);
    } finally {
      setSyncingTickerId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-400 pb-24 relative">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
            <Briefcase size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ativos</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Gestão de Conta Privada e Tickers</p>
          </div>
        </div>
        <button 
          onClick={syncAllPrices}
          disabled={loading || tickers.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          <span className="hidden md:inline">Sincronizar Tudo</span>
        </button>
      </header>

      <div className={`bg-white p-8 rounded-[3rem] border-2 transition-all ${editingId ? 'border-indigo-500 ring-8 ring-indigo-50 shadow-2xl' : 'border-slate-200 shadow-sm'}`}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`space-y-2 ${!editingId ? 'md:col-span-2' : ''}`}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Símbolo (Ticker)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none uppercase text-lg focus:bg-white focus:border-indigo-500 transition-all" 
                  placeholder="PETR4, AAPL..." 
                  value={symbol} 
                  onChange={(e) => setSymbol(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {editingId && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Amigável</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                    placeholder="Nome da Empresa" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Ativo</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all" 
                    placeholder="Ações, FII, Crypto..." 
                    value={type} 
                    onChange={(e) => setType(e.target.value)} 
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-4">
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="px-8 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <X size={18} /> Cancelar
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className={`flex-1 py-5 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>{editingId ? 'Salvando...' : 'Consultando dados...'}</span>
                </div>
              ) : (
                editingId ? 'Salvar Alterações' : 'Cadastrar Ativo'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tickers.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 relative group transition-all hover:border-indigo-300 hover:shadow-xl hover:translate-y-[-4px]">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest">
                {t.type || 'Outros'}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => syncSinglePrice(t)}
                  disabled={syncingTickerId === t.id}
                  className={`p-2.5 transition-all rounded-xl ${syncingTickerId === t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:scale-110'}`}
                  title="Sincronizar Preço"
                >
                  <RefreshCw size={18} className={syncingTickerId === t.id ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => handleEdit(t)} 
                  className="p-2.5 text-slate-400 hover:text-indigo-600 transition-all bg-slate-50 rounded-xl hover:bg-indigo-50"
                  title="Editar"
                >
                  <Edit3 size={18}/>
                </button>
                <button 
                  onClick={() => setDeleteId(t.id!)} 
                  className="p-2.5 text-slate-400 hover:text-rose-500 transition-all bg-slate-50 rounded-xl hover:bg-rose-50"
                  title="Excluir"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="font-black text-2xl text-slate-900 tracking-tight">{t.symbol}</h4>
              <p className="text-[11px] font-bold text-slate-400 uppercase truncate leading-relaxed">
                {t.name || 'Sem nome definido'}
              </p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-1.5 text-slate-300">
                  <Tag size={12} />
                  <span className="text-[10px] font-bold uppercase">{t.sector || 'N/A'}</span>
               </div>
               {failedTickers.includes(t.symbol) && editingPriceId === t.id ? (
                 <div className="flex gap-2 items-center">
                   <input
                     type="number"
                     step="0.01"
                     min="0"
                     placeholder="R$ 0,00"
                     value={editingPrice}
                     onChange={(e) => setEditingPrice(e.target.value)}
                     className="w-24 px-2 py-1 text-[11px] border border-amber-300 rounded-lg bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                   />
                   <button
                     onClick={() => saveManualPrice(t.id!)}
                     className="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg hover:bg-emerald-600 transition-all"
                   >
                     OK
                   </button>
                 </div>
               ) : failedTickers.includes(t.symbol) ? (
                 <button
                   onClick={() => {
                     setEditingPriceId(t.id || null);
                     setEditingPrice(t.lastPrice ? String(t.lastPrice).replace('.', ',') : '');
                   }}
                   className="flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase hover:bg-amber-200 transition-all"
                   title="Editar preço manualmente"
                 >
                   <DollarSign size={12} />
                   Editar
                 </button>
               ) : t.lastPrice ? (
                 <span className="text-[12px] font-black text-slate-900 tabular-nums">
                   R$ {t.lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
               ) : null}
            </div>
          </div>
        ))}

        {tickers.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Briefcase size={48} className="opacity-20" />
            <p className="font-bold text-sm uppercase tracking-widest opacity-50">Nenhum ativo monitorado</p>
          </div>
        )}
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
                <h3 className="text-xl font-black text-slate-900">Remover Ativo?</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">Este ativo deixará de aparecer na sua lista de monitoramento e cotações.</p>
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

      {/* Modal de Falha na Sincronização */}
      {syncFailureModal && failedTickers.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-amber-50 p-4 rounded-3xl text-amber-600">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Valores não carregados</h3>
                <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                  Não foi possível sincronizar as cotações para: <span className="font-black text-amber-700">{failedTickers.join(', ')}</span>.
                </p>
                <p className="text-xs text-slate-500 font-medium mt-3">
                  Deseja manter os valores atuais salvos ou editar manualmente?
                </p>
              </div>
              <div className="flex w-full gap-3 pt-4">
                <button 
                  onClick={handleKeepCurrentPrices}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Manter Atuais
                </button>
                <button 
                  onClick={handleEditFailedPrices}
                  className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TickerConfig;
