
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile, InvestmentOperation, Ticker, Aporte } from '../../types';
import { 
  Briefcase, TrendingUp, DollarSign, RefreshCw, Loader2, PieChart as PieIcon,
  TrendingDown, Target, Info, LineChart as LineIcon, BarChart3, Activity,
  Check, Filter, RotateCcw, CheckCircle, AlertCircle
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  LineChart, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const InvestDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [ops, setOps] = useState<InvestmentOperation[]>([]);
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [syncResultModal, setSyncResultModal] = useState<{ updated: number; total: number; failed: string[] } | null>(null);
  
  // Estado para os chips de filtro do gráfico
  const [visibleTickers, setVisibleTickers] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubOps = dbService.listenCollection(user.uid, 'investimentos', (items) => {
      setOps(items);
    });
    
    const unsubTick = db.collection('usuarios').doc(user.uid).collection('tickers')
      .onSnapshot(snap => setTickers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticker))));

    const unsubAportes = dbService.listenCollection(user.uid, 'aportes', (items) => {
      setAportes(items);
      setLoading(false);
    });

    return () => { unsubOps(); unsubTick(); unsubAportes(); };
  }, [user.uid]);

  const activeEarningTickers = useMemo(() => {
    const set = new Set<string>();
    ops.filter(o => o.type === 'Rendimento').forEach(o => set.add(o.ticker));
    return Array.from(set).sort();
  }, [ops]);

  // Inicializa os filtros selecionados com todos os ativos disponíveis
  useEffect(() => {
    if (activeEarningTickers.length > 0 && visibleTickers.length === 0) {
      setVisibleTickers(activeEarningTickers);
    }
  }, [activeEarningTickers]);

  const toggleTickerVisibility = (ticker: string) => {
    setVisibleTickers(prev => 
      prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
    );
  };

  const selectAllTickers = () => setVisibleTickers(activeEarningTickers);
  const clearAllTickers = () => setVisibleTickers([]);

  const syncPrices = async () => {
    if (tickers.length === 0 || !user?.uid) return;
    
    setIsSyncing(true);
    setSyncProgress({ current: 0, total: tickers.length });
    
    const DELAY_MS = 500; // 500ms entre requisições para não sobrecarregar
    let updatedTotal = 0;
    const failedTickers: string[] = [];
    const BRAPI_BASE = 'https://brapi.dev/api/quote';

    try {
      // Processar cada ticker sequencialmente
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        
        try {
            const apiKey = import.meta.env.VITE_BRAPI_API_KEY;
            const response = await fetch(`${BRAPI_BASE}/${ticker.symbol}?fundamental=false&dividends=false`, {
              headers: {
                'Authorization': `Bearer ${apiKey}`
              }
            });
          
          if (!response.ok) {
            console.warn(`⚠️ Ticker ${ticker.symbol}: Erro HTTP ${response.status}`);
            failedTickers.push(ticker.symbol);
            setSyncProgress(p => ({ ...p, current: i + 1 }));
            continue;
          }

          const data = await response.json();
          
          if (!data.results || data.results.length === 0) {
            console.warn(`⚠️ Ticker ${ticker.symbol}: Sem dados retornados`);
            failedTickers.push(ticker.symbol);
            setSyncProgress(p => ({ ...p, current: i + 1 }));
            continue;
          }

          const result = data.results[0];

          // Tentar múltiplas propriedades que podem conter o preço
          let price: any = result.regularMarketPrice ?? result.lastPrice ?? result.close ?? result.price ?? result.lastTradePrice ?? result.regularMarketPreviousClose ?? result.previousClose ?? null;

          // Se veio como string, tentar parsear (substituir vírgula por ponto)
          if (typeof price === 'string' && price.trim() !== '') {
            const parsed = parseFloat(price.replace(/,/g, '.'));
            if (!isNaN(parsed)) price = parsed;
          }

          // Se preço inválido, tentar buscar por variantes do símbolo (.SA e troca de sufixo 3<->11)
          if (!price || typeof price !== 'number' || !isFinite(price)) {
            console.warn(`⚠️ Ticker ${ticker.symbol}: Preço inválido na primeira requisição. Tentando variantes de símbolo`);
            const candidates: string[] = [];
            candidates.push(`${ticker.symbol}.SA`);

            // Tentar swap de sufixo comum 3 <-> 11 (ex: BBAS3 <-> BBAS11)
            const m = ticker.symbol.match(/(.*?)(\d+)$/);
            if (m) {
              const base = m[1];
              const num = m[2];
              if (num === '3') candidates.push(`${base}11`, `${base}11.SA`);
              else if (num === '11') candidates.push(`${base}3`, `${base}3.SA`);
            }

            // Garantir uppercase e uniquify
            const uniq = Array.from(new Set(candidates.map(s => s.toUpperCase())));

            for (const cand of uniq) {
              try {
                const altResp = await fetch(`${BRAPI_BASE}/${cand}?fundamental=false&dividends=false`, {
                  headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (!altResp.ok) {
                  console.warn(`⚠️ Variante ${cand}: Erro HTTP ${altResp.status}`);
                  continue;
                }
                const altData = await altResp.json();
                if (!altData.results || altData.results.length === 0) continue;
                const alt = altData.results[0];
                let altPrice: any = alt.regularMarketPrice ?? alt.lastPrice ?? alt.close ?? alt.price ?? null;
                if (typeof altPrice === 'string') altPrice = parseFloat(altPrice.replace(/,/g, '.'));
                if (altPrice && typeof altPrice === 'number' && isFinite(altPrice) && altPrice > 0) {
                  price = altPrice;

                  break;
                }
              } catch (altErr: any) {
                console.warn(`Tentativa variante ${cand} falhou para ${ticker.symbol}:`, altErr?.message || altErr);
              }
            }
          }

          if (!price || typeof price !== 'number' || !isFinite(price)) {
            console.warn(`⚠️ Ticker ${ticker.symbol}: Preço inválido após tentativas. Resposta:`, result);
            failedTickers.push(ticker.symbol);
            setSyncProgress(p => ({ ...p, current: i + 1 }));
            continue;
          }

          // Atualizar no Firebase
          const ref = db.collection('usuarios').doc(user.uid).collection('tickers').doc(ticker.id!);
          await ref.update({ lastPrice: price });
          
          updatedTotal++;
          
          setSyncProgress(p => ({ ...p, current: i + 1 }));
          
          // Aguardar antes da próxima requisição
          if (i < tickers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          }
        } catch (tickerErr: any) {
          console.error(`❌ Ticker ${ticker.symbol} falhou:`, tickerErr?.message || tickerErr);
          failedTickers.push(ticker.symbol);
          setSyncProgress(p => ({ ...p, current: i + 1 }));
        }
      }
      
      // Salvar tickers com falha em localStorage para TickerConfig acessar
      if (failedTickers.length > 0) {
        localStorage.setItem('syncFailedTickers', JSON.stringify(failedTickers));
      } else {
        localStorage.removeItem('syncFailedTickers');
      }
      
      // Mostrar modal de resultado
      setSyncResultModal({ updated: updatedTotal, total: tickers.length, failed: failedTickers });
    } catch (error: any) {
      console.error('Erro geral ao sincronizar cotações:', error);
      setSyncResultModal({ updated: 0, total: tickers.length, failed: tickers.map(t => t.symbol) });
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  const portfolio = useMemo(() => {
    const basicInfo = tickers.map(t => {
      const symbolOps = ops.filter(o => o.ticker === t.symbol);
      let qty = 0;
      let totalInvestedCost = 0;
      let dividends = 0;
      let totalBuyQty = 0;
      let totalBuyCost = 0;

      symbolOps.forEach(o => {
        const q = Number(o.quantity) || 0;
        const total = Number(o.totalValue) || 0;

        if (o.type === 'Compra') {
          qty += q;
          totalInvestedCost += total;
          totalBuyQty += q;
          totalBuyCost += total;
        } else if (o.type === 'Venda') {
          qty -= q;
          totalInvestedCost -= total;
        } else if (o.type === 'Rendimento') {
          dividends += total;
        }
      });

      const currentPrice = t.lastPrice || 0;
      const currentVal = qty * currentPrice;
      const avgPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
      const result = currentVal - totalInvestedCost;
      const yieldPct = totalInvestedCost > 0 ? (result / totalInvestedCost) * 100 : 0;

      return { 
        symbol: t.symbol, 
        name: t.name || t.symbol,
        qty, 
        type: t.type || 'Outros',
        avgPrice,
        totalInvested: totalInvestedCost, 
        currentVal, 
        currentPrice,
        dividends, 
        result,
        yieldPct
      };
    }).filter(p => p.qty > 0 || p.totalInvested > 0 || p.dividends > 0);

    const globalCurrentVal = basicInfo.reduce((acc, curr) => acc + curr.currentVal, 0);

    return basicInfo.map(p => ({
      ...p,
      weight: globalCurrentVal > 0 ? (p.currentVal / globalCurrentVal) * 100 : 0
    })).sort((a, b) => b.currentVal - a.currentVal);
  }, [tickers, ops]);

  const totals = useMemo(() => {
    const inv = portfolio.reduce((acc, curr) => acc + curr.totalInvested, 0);
    const curr = portfolio.reduce((acc, curr) => acc + curr.currentVal, 0);
    const res = curr - inv;
    const rent = inv > 0 ? (res / inv) * 100 : 0;
    const div = portfolio.reduce((acc, curr) => acc + curr.dividends, 0);
    return { inv, curr, res, rent, div };
  }, [portfolio]);

  const totalAportes = useMemo(() => {
    return aportes.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  }, [aportes]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 24 }, (_, i) => {
      const date = subMonths(new Date(), 23 - i);
      return {
        label: format(date, 'MMM/yy', { locale: ptBR }),
        start: startOfMonth(date),
        end: endOfMonth(date),
        earnings: 0,
        contributions: 0
      };
    });

    months.forEach(m => {
      m.earnings = ops
        .filter(o => o.type === 'Rendimento' && isWithinInterval(parseISO(o.date), { start: m.start, end: m.end }))
        .reduce((acc, o) => acc + (Number(o.totalValue) || 0), 0);
      
      m.contributions = aportes
        .filter(a => isWithinInterval(parseISO(a.date), { start: m.start, end: m.end }))
        .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    });

    return months.filter(m => m.earnings > 0 || m.contributions > 0);
  }, [ops, aportes]);

  const detailedEarningsData = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 11);
    const months = eachMonthOfInterval({ start, end });

    return months.map(m => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      const data: any = {
        name: format(m, 'MMM/yy', { locale: ptBR }).toUpperCase()
      };

      ops.filter(o => o.type === 'Rendimento' && isWithinInterval(parseISO(o.date), { start: mStart, end: mEnd }))
         .forEach(o => {
           data[o.ticker] = (data[o.ticker] || 0) + (Number(o.totalValue) || 0);
         });

      return data;
    });
  }, [ops]);

  const allocationData = useMemo(() => {
    return Array.from(portfolio.reduce((acc, curr) => {
      acc.set(curr.type, (acc.get(curr.type) || 0) + curr.currentVal);
      return acc;
    }, new Map()).entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16'];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-4">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
      <p className="font-black text-xs uppercase tracking-widest">Carregando Carteira...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-10 max-w-full mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-white">
              <TrendingUp size={22} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Investimentos</h2>
          </div>
        </div>
        
        <button 
          onClick={syncPrices} 
          disabled={isSyncing} 
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex gap-3 items-center transition-all active:scale-95 disabled:opacity-50"
        >
          {isSyncing ? <Loader2 className="animate-spin" size={18}/> : <RefreshCw size={18}/>} 
          {isSyncing ? `Atualizando ${syncProgress.current}/${syncProgress.total}...` : 'Atualizar Cotações'}
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 px-4">
        <StatCard title="Total dos Aportes" value={totalAportes} isCurrency icon={DollarSign} color="slate" />
        <StatCard title="Total Investido" value={totals.inv} isCurrency icon={DollarSign} color="slate" />
        <StatCard title="Valor Atual" value={totals.curr} isCurrency icon={Briefcase} color="indigo" />
        <StatCard title="Rendimento %" value={totals.rent} isPercent icon={TrendingUp} color={totals.rent >= 0 ? "emerald" : "rose"} />
        <StatCard title="Resultado" value={totals.res} isCurrency icon={Target} color={totals.res >= 0 ? "indigo" : "rose"} />
        <StatCard title="Rendimentos" value={totals.div} isCurrency icon={DollarSign} color="emerald" />
      </div>

      <div className="px-4">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px] border-collapse">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ativo</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Qtd</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">P. Médio</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">V. Inves.</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">V. Atual</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Cotação</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Result.</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Rent. %</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Div. Receb.</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Tipo</th>
                  <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Peso %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.map(p => (
                  <tr key={p.symbol} className="hover:bg-slate-50 transition-colors group text-[11px]">
                    <td className="p-4 font-black text-slate-900">{p.symbol}</td>
                    <td className="p-4 text-center font-bold text-slate-500 tabular-nums">{p.qty}</td>
                    <td className="p-4 text-right font-medium text-slate-400 tabular-nums">R$ {p.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-bold text-slate-600 tabular-nums">R$ {p.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-black text-slate-900 tabular-nums">R$ {p.currentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-right font-bold text-indigo-500 tabular-nums">R$ {p.currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className={`p-4 text-right font-black tabular-nums ${p.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>R$ {p.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className={`p-4 text-right font-black tabular-nums ${p.yieldPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.yieldPct.toFixed(2)}%</td>
                    <td className="p-4 text-right font-black text-emerald-600 tabular-nums">R$ {p.dividends.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-4 text-center"><span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded uppercase whitespace-nowrap">{p.type}</span></td>
                    <td className="p-4 text-right font-black text-slate-900 tabular-nums">{p.weight.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <LineIcon size={16} className="text-emerald-500" /> Rendimentos Mensais Agregados
                </h3>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                    <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-[380px] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-500" /> Aportes Mensais
                </h3>
              </div>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                    <Line type="monotone" dataKey="contributions" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full lg:min-h-[784px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <PieIcon size={16} className="text-amber-500" /> Peso por Categoria
              </h3>
            </div>
            <div className="flex-1 flex flex-col justify-center min-h-0">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocationData} innerRadius={65} outerRadius={100} paddingAngle={5} dataKey="value">
                      {allocationData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`} />
                    <Legend iconType="circle" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* GRÁFICO FULL WIDTH: Rendimentos por Ativo (Evolução Temporal) */}
        <div className="mt-10 bg-white p-6 md:p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em]">Fluxo Individual de Rendimentos por Ativo</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Evolução dos Proventos Mensais (Últimos 12 meses)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                 onClick={selectAllTickers}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all"
               >
                 <Check size={14} /> Selecionar Todos
               </button>
               <button 
                 onClick={clearAllTickers}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all"
               >
                 <RotateCcw size={14} /> Limpar
               </button>
            </div>
          </div>

          {/* CHIP GROUP FILTRO */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
            {activeEarningTickers.map((ticker, index) => {
              const isVisible = visibleTickers.includes(ticker);
              const color = COLORS[index % COLORS.length];
              return (
                <button
                  key={ticker}
                  onClick={() => toggleTickerVisibility(ticker)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${
                    isVisible 
                    ? 'bg-white border-indigo-100 text-slate-900 shadow-sm ring-1 ring-indigo-50' 
                    : 'bg-slate-50 border-transparent text-slate-300 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div 
                    className={`w-2.5 h-2.5 rounded-full shadow-sm transition-transform ${isVisible ? 'scale-100' : 'scale-50 grayscale'}`} 
                    style={{ backgroundColor: isVisible ? color : '#cbd5e1' }}
                  />
                  {ticker}
                </button>
              );
            })}
          </div>
          
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detailedEarningsData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '15px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                  formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', paddingTop: '30px' }} />
                
                {activeEarningTickers
                  .filter(ticker => visibleTickers.includes(ticker))
                  .map((ticker, index) => (
                  <Line 
                    key={ticker}
                    type="monotone"
                    dataKey={ticker}
                    name={ticker}
                    stroke={COLORS[activeEarningTickers.indexOf(ticker) % COLORS.length]} // Mantém a cor original do ticker
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modal de Resultado da Sincronização */}
      {syncResultModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`p-4 rounded-3xl ${
                syncResultModal.updated === syncResultModal.total 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {syncResultModal.updated === syncResultModal.total ? (
                  <CheckCircle size={32} />
                ) : (
                  <AlertCircle size={32} />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {syncResultModal.updated === syncResultModal.total 
                    ? '✓ Sincronização Completa' 
                    : 'Sincronização Parcial'}
                </h3>
                <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                  <span className="font-black text-slate-900">{syncResultModal.updated} de {syncResultModal.total}</span> cotações foram atualizadas com sucesso!
                </p>
                {syncResultModal.failed.length > 0 && (
                  <p className="text-xs text-slate-500 font-medium mt-3">
                    Não foi possível sincronizar: <span className="font-black text-amber-700">{syncResultModal.failed.join(', ')}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSyncResultModal(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, isCurrency, isPercent, icon: Icon, color }: any) => {
  const colors: any = { slate: 'bg-slate-900 border-slate-800', indigo: 'bg-indigo-600 border-indigo-500', emerald: 'bg-emerald-600 border-emerald-500', rose: 'bg-rose-600 border-rose-500' };
  return (
    <div className={`p-5 rounded-3xl text-white shadow-xl flex flex-col justify-between transition-all hover:translate-y-[-2px] border-b-4 ${colors[color] || 'bg-slate-900'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><Icon size={16} /></div>
        <Info size={12} className="opacity-30" />
      </div>
      <div>
        <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">{title}</p>
        <p className="text-lg font-black tabular-nums whitespace-nowrap">
          {isCurrency ? 'R$ ' : ''}
          {value.toLocaleString('pt-BR', { minimumFractionDigits: isPercent || isCurrency ? 2 : 0 })}
          {isPercent ? '%' : ''}
        </p>
      </div>
    </div>
  );
};

export default InvestDashboard;
