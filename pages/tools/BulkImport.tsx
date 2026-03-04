
import React, { useState } from 'react';
import { db } from '../../firebase';
import { dbService } from '../../services/dbService';
import { UserProfile } from '../../types';
import * as XLSX from 'xlsx';
import { 
  DatabaseZap, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileJson,
  History,
  Info,
  Download,
  FileSpreadsheet
} from 'lucide-react';

type ImportTarget = 'transacoes' | 'investimentos' | 'tickers' | 'gastos_carro' | 'compras_sonhos' | 'aportes' | 'categorias';

const BulkImport: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [target, setTarget] = useState<ImportTarget>('transacoes');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [progress, setProgress] = useState(0);

  const targets: { value: ImportTarget; label: string; info: string; isYearBased: boolean }[] = [
    { value: 'transacoes', label: 'Transações Financeiras', info: 'Campos sugeridos: description, amount, category, subcategory, date, type, month, year', isYearBased: true },
    { value: 'investimentos', label: 'Lançamentos de Investimento', info: 'Campos sugeridos: ticker, type, quantity, totalValue, date, unitPrice', isYearBased: true },
    { value: 'tickers', label: 'Cadastro de Ativos (Tickers)', info: 'Campos sugeridos: symbol, name, type, sector', isYearBased: false },
    { value: 'aportes', label: 'Aportes (Capital Inicial)', info: 'Campos sugeridos: date, amount', isYearBased: true },
    { value: 'gastos_carro', label: 'Gastos com o Carro', info: 'Campos sugeridos: item, quantity, total, date', isYearBased: true },
    { value: 'compras_sonhos', label: 'Lista de Desejos/Compras', info: 'Campos sugeridos: item, amount, date, description', isYearBased: true },
    { value: 'categorias', label: 'Categorias e Subcategorias', info: 'Campos sugeridos: name, type, subcategories', isYearBased: false },
  ];

  const handleImport = async () => {
    if (!jsonInput.trim() || !user?.uid) {
      setStatus({ type: 'error', message: 'Por favor, insira o código JSON para importar.' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });
    setProgress(0);

    try {
      const data = JSON.parse(jsonInput);
      const items = Array.isArray(data) ? data : [data];

      if (items.length === 0) {
        throw new Error('O JSON não contém nenhum item válido.');
      }

      const currentTarget = targets.find(t => t.value === target);

      if (currentTarget?.isYearBased) {
        // Limpeza e normalização de dados antes de salvar
        const cleanedItems = items.map(item => {
          const dateStr = item.date || new Date().toISOString().split('T')[0];
          const dateObj = new Date(dateStr);
          const year = parseInt(item.year) || dateObj.getFullYear();
          const month = parseInt(item.month) || (dateObj.getMonth() + 1);
          
          // Normalização específica para transações
          if (target === 'transacoes') {
            return {
              ...item,
              amount: typeof item.amount === 'string' ? parseFloat(item.amount.replace(',', '.')) : Number(item.amount || 0),
              date: dateStr,
              year: year,
              month: month,
              type: item.type || 'expense',
              isPaid: item.isPaid === undefined ? true : !!item.isPaid,
              description: String(item.description || '')
            };
          }
          
          // Normalização genérica para outros itens baseados em ano
          return {
            ...item,
            amount: item.amount !== undefined ? Number(item.amount) : (item.totalValue !== undefined ? Number(item.totalValue) : (item.total !== undefined ? Number(item.total) : 0)),
            date: dateStr,
            year: year,
            month: month
          };
        });

        // Importação baseada em ano usando dbService
        await dbService.saveItems(user.uid, target, cleanedItems);
      } else {
        // Importação padrão (um documento por item)
        const BATCH_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          chunks.push(items.slice(i, i + BATCH_SIZE));
        }

        let processed = 0;
        for (const chunk of chunks) {
          const batch = db.batch();
          const collectionRef = db.collection('usuarios').doc(user.uid).collection(target);

          chunk.forEach(item => {
            const docRef = collectionRef.doc();
            const cleanItem = {
              ...item,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            batch.set(docRef, cleanItem);
          });

          await batch.commit();
          processed += chunk.length;
          setProgress(Math.round((processed / items.length) * 100));
        }
      }

      setStatus({ 
        type: 'success', 
        message: `${items.length} itens importados com sucesso para ${currentTarget?.label}!` 
      });
      setJsonInput('');
    } catch (err: any) {
      console.error(err);
      setStatus({ 
        type: 'error', 
        message: `Erro ao processar JSON: ${err.message}. Verifique a sintaxe (vírgulas, aspas, etc).` 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    if (!user?.uid) return null;
    const allData: Record<string, any[]> = {};
    
    for (const t of targets) {
      if (t.isYearBased) {
        allData[t.value] = await dbService.getCollection(user.uid, t.value);
      } else {
        const snapshot = await db.collection('usuarios').doc(user.uid).collection(t.value).get();
        allData[t.value] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    }

    const userDoc = await db.collection('usuarios').doc(user.uid).get();
    if (userDoc.exists) {
      allData['perfil_usuario'] = [{ id: userDoc.id, ...userDoc.data() }];
    }
    
    return allData;
  };

  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const data = await fetchAllData();
      if (!data) return;

      for (const [collection, items] of Object.entries(data)) {
        if (items.length === 0) continue;
        
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${collection}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setStatus({ type: 'success', message: 'Exportação JSON concluída com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: `Erro na exportação JSON: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchAllData();
      if (!data) return;

      for (const [collection, items] of Object.entries(data)) {
        if (items.length === 0) continue;
        
        const worksheet = XLSX.utils.json_to_sheet(items);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, collection);
        
        XLSX.writeFile(workbook, `${collection}_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      
      setStatus({ type: 'success', message: 'Exportação Excel concluída com sucesso!' });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: `Erro na exportação Excel: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleMigration = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setStatus({ type: null, message: '' });
    setProgress(0);

    try {
      let totalMigrated = 0;
      const yearBasedTargets = targets.filter(t => t.isYearBased);

      for (let i = 0; i < yearBasedTargets.length; i++) {
        const t = yearBasedTargets[i];
        const colRef = db.collection('usuarios').doc(user.uid).collection(t.value);
        const snapshot = await colRef.get();
        
        // Filtrar documentos que NÃO são o formato de ano (4 dígitos)
        const oldDocs = snapshot.docs.filter(doc => doc.id.length !== 4);
        
        if (oldDocs.length > 0) {
          const itemsToMigrate = oldDocs.map(doc => ({ ...doc.data(), id: doc.id }));
          await dbService.saveItems(user.uid, t.value, itemsToMigrate);
          
          // Opcional: Deletar documentos antigos após migração bem-sucedida
          const batch = db.batch();
          oldDocs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          
          totalMigrated += oldDocs.length;
        }
        setProgress(Math.round(((i + 1) / yearBasedTargets.length) * 100));
      }

      setStatus({ 
        type: 'success', 
        message: `Migração concluída! ${totalMigrated} registros antigos foram movidos para a nova estrutura de documentos anuais.` 
      });
    } catch (err: any) {
      console.error(err);
      setStatus({ type: 'error', message: `Erro na migração: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24">
      <header className="flex items-center gap-4">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
          <DatabaseZap size={24} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Importação em Massa</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Sincronização Direta via JSON</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FileJson size={14} /> Cole o JSON abaixo
              </label>
              <textarea
                className="w-full h-80 p-6 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none scrollbar-thin"
                placeholder='[
  { "description": "Exemplo", "amount": 100.50, "date": "2024-10-25" },
  { "description": "Outro Item", "amount": 50.00, "date": "2024-10-26" }
]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="w-full md:w-auto">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block ml-1">Destino dos Dados</label>
                <select
                  className="w-full md:w-64 px-4 py-3 bg-slate-100 border-none rounded-xl font-bold text-xs text-slate-700 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as ImportTarget)}
                >
                  {targets.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full md:w-auto px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                {loading ? 'Processando...' : 'Iniciar Importação'}
              </button>
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-indigo-600 uppercase">
                  <span>Progresso da Sincronização</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {status.type && (
              <div className={`p-4 rounded-2xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                {status.type === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" size={18} /> : <AlertCircle className="shrink-0 mt-0.5" size={18} />}
                <p className="text-xs font-bold leading-relaxed">{status.message}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Exportação de Dados</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Backup Completo do Banco de Dados</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportJSON}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <FileJson size={14} /> JSON
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Esta ferramenta permite baixar todos os seus dados armazenados em arquivos separados por categoria. 
              Útil para backups, auditorias ou migrações.
            </p>
          </div>

          <div className="bg-amber-50 p-8 rounded-[2.5rem] border-2 border-amber-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-amber-900 tracking-tight">Migração de Estrutura</h3>
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">Converter Banco de Dados para Documentos Anuais</p>
              </div>
              <button
                onClick={handleMigration}
                disabled={loading}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-100 active:scale-95 disabled:opacity-50"
              >
                <History size={14} /> Migrar Dados
              </button>
            </div>
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              Clique no botão acima para converter seus dados antigos (um documento por registro) para a nova estrutura otimizada (um documento por ano). 
              <strong> Recomendado executar apenas uma vez.</strong>
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 space-y-6">
            <div className="flex items-center gap-3">
              <Info size={20} />
              <h3 className="font-black text-xs uppercase tracking-widest">Dicas Importantes</h3>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px]">1</div>
                <p className="text-[11px] font-medium leading-relaxed">Sempre use o formato de array: <code className="bg-white/10 px-1 rounded">[ ... ]</code>.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px]">2</div>
                <p className="text-[11px] font-medium leading-relaxed">Datas devem estar no padrão <code className="bg-white/10 px-1 rounded">AAAA-MM-DD</code>.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-black text-[10px]">3</div>
                <p className="text-[11px] font-medium leading-relaxed">Valores numéricos não devem ter R$ ou pontos de milhar, apenas o ponto decimal.</p>
              </li>
            </ul>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> Ativo Selecionado
            </h4>
            <p className="text-xs font-bold text-slate-700">{targets.find(t => t.value === target)?.label}</p>
            <p className="text-[10px] text-slate-400 leading-relaxed italic">{targets.find(t => t.value === target)?.info}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImport;
