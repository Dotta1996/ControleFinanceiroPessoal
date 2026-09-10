import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { dbService } from '../services/dbService';
import { UserProfile, Transaction, Category, RecurrentItem, CATEGORIES, ValueType, PercentageBase } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Repeat, 
  Calendar, 
  DollarSign, 
  Percent, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  Power, 
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface RecurrentTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  categories: Category[];
  allTransactions: Transaction[];
  onSuccess?: () => void;
}

export const RecurrentTransactionsModal: React.FC<RecurrentTransactionsModalProps> = ({
  isOpen,
  onClose,
  user,
  categories,
  allTransactions,
  onSuccess
}) => {
  const [recurrentItems, setRecurrentItems] = useState<RecurrentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [confirmingLaunch, setConfirmingLaunch] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Data de lançamento das transações geradas
  const [launchDate, setLaunchDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [markAsPaid, setMarkAsPaid] = useState<boolean>(false);

  // Base de cálculo personalizada (se o usuário quiser simular ou se o mês não tiver receita lançada ainda)
  const [manualIncomeBase, setManualIncomeBase] = useState<string>('');
  const [useManualIncome, setUseManualIncome] = useState<boolean>(false);

  // Formulário de Cadastro/Edição de Item
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formValueType, setFormValueType] = useState<ValueType>('fixed');
  const [formFixedAmount, setFormFixedAmount] = useState('0,00');
  const [formPercentage, setFormPercentage] = useState('10');
  const [formPercentageBase, setFormPercentageBase] = useState<PercentageBase>('income');

  // Carregar itens recorrentes do Firestore
  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    setLoading(true);
    const unsub = db.collection('usuarios').doc(user.uid).collection('itens_recorrentes')
      .onSnapshot(
        (snap) => {
          const items = snap.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          } as RecurrentItem));
          // Ordena: receitas primeiro ou por data/descrição
          items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setRecurrentItems(items);
          setLoading(false);
        },
        (error) => {
          console.error('Erro ao carregar itens recorrentes:', error);
          setLoading(false);
        }
      );

    return () => unsub();
  }, [user.uid, isOpen]);

  // Extrai ano e mês da data de lançamento
  const { launchYear, launchMonth } = useMemo(() => {
    try {
      const d = parseISO(launchDate);
      return {
        launchYear: d.getFullYear(),
        launchMonth: d.getMonth() + 1
      };
    } catch {
      const now = new Date();
      return { launchYear: now.getFullYear(), launchMonth: now.getMonth() + 1 };
    }
  }, [launchDate]);

  // Calcula total apurado de Receitas e Despesas no mês de lançamento selecionado
  const { monthCalculatedIncome, monthCalculatedExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    allTransactions.forEach(t => {
      const tMonth = t.month || dbService.getMonthFromDate(t.date);
      const tYear = t.year || parseInt(dbService.getYearFromDate(t.date), 10);
      if (tMonth === launchMonth && tYear === launchYear) {
        const val = Number(t.amount) || 0;
        if (t.type === 'income') income += val;
        else if (t.type === 'expense') expense += val;
      }
    });
    return { monthCalculatedIncome: income, monthCalculatedExpense: expense };
  }, [allTransactions, launchMonth, launchYear]);

  // Base efetiva de receita usada para calcular as porcentagens
  const effectiveIncomeBase = useMemo(() => {
    if (useManualIncome && manualIncomeBase) {
      const parsed = parseFloat(manualIncomeBase.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return monthCalculatedIncome;
  }, [useManualIncome, manualIncomeBase, monthCalculatedIncome]);

  // Base efetiva de despesa
  const effectiveExpenseBase = monthCalculatedExpense;

  // Categorias disponíveis de acordo com o tipo selecionado no formulário
  const availableCategories = useMemo(() => {
    const userCats = categories.filter(c => c.type === formType);
    if (userCats.length > 0) return userCats;
    
    // Fallback para categorias padrão
    const defaultList = formType === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    return defaultList.map(name => ({
      name,
      type: formType,
      subcategories: []
    } as Category));
  }, [categories, formType]);

  // Subcategorias disponíveis para a categoria selecionada
  const availableSubcategories = useMemo(() => {
    const found = availableCategories.find(c => c.name === formCategory);
    return found?.subcategories || [];
  }, [availableCategories, formCategory]);

  // Ao trocar tipo ou lista de categorias, inicializa categoria se vazia
  useEffect(() => {
    if (availableCategories.length > 0 && !formCategory) {
      setFormCategory(availableCategories[0].name);
    }
  }, [availableCategories, formCategory]);

  // Função para formatar valor monetário do input
  const handleCurrencyInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setFormFixedAmount("0,00");
      return;
    }
    const floatVal = parseInt(digits, 10) / 100;
    setFormFixedAmount(floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Calcula o valor final numérico em R$ de um item específico
  const calculateItemAmount = (item: RecurrentItem): number => {
    if (item.valueType === 'fixed') {
      return item.fixedAmount || 0;
    }
    const pct = item.percentage || 0;
    const baseVal = item.percentageBase === 'expense' ? effectiveExpenseBase : effectiveIncomeBase;
    return Math.round((baseVal * (pct / 100)) * 100) / 100;
  };

  // Totais dos itens ATIVOS selecionados para lançamento
  const activeItems = useMemo(() => recurrentItems.filter(item => item.active), [recurrentItems]);

  const { totalActiveIncome, totalActiveExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    activeItems.forEach(item => {
      const amt = calculateItemAmount(item);
      if (item.type === 'income') inc += amt;
      else exp += amt;
    });
    return { totalActiveIncome: inc, totalActiveExpense: exp };
  }, [activeItems, effectiveIncomeBase, effectiveExpenseBase]);

  // Limpar formulário
  const resetForm = () => {
    setEditingId(null);
    setFormDescription('');
    setFormFixedAmount('0,00');
    setFormPercentage('10');
    setFormValueType('fixed');
    setFormPercentageBase('income');
    setFormSubcategory('');
    if (availableCategories.length > 0) {
      setFormCategory(availableCategories[0].name);
    }
  };

  // Carregar item para edição
  const handleEditItem = (item: RecurrentItem) => {
    setEditingId(item.id || null);
    setFormType(item.type);
    setFormDescription(item.description);
    setFormCategory(item.category);
    setFormSubcategory(item.subcategory || '');
    setFormValueType(item.valueType || 'fixed');
    setFormFixedAmount((item.fixedAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setFormPercentage((item.percentage || 10).toString());
    setFormPercentageBase(item.percentageBase || 'income');
  };

  // Alternar Ativar / Desativar item (Persistido no Firestore)
  const handleToggleActive = async (item: RecurrentItem) => {
    if (!item.id || !user?.uid) return;
    try {
      await db.collection('usuarios').doc(user.uid).collection('itens_recorrentes').doc(item.id).update({
        active: !item.active
      });
    } catch (err) {
      console.error('Erro ao alternar status do item:', err);
    }
  };

  // Ativar ou desativar todos
  const handleToggleAll = async (targetState: boolean) => {
    if (!user?.uid || recurrentItems.length === 0) return;
    try {
      const batch = db.batch();
      recurrentItems.forEach(item => {
        if (item.id && item.active !== targetState) {
          const ref = db.collection('usuarios').doc(user.uid).collection('itens_recorrentes').doc(item.id);
          batch.update(ref, { active: targetState });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error('Erro ao atualizar todos os itens:', err);
    }
  };

  // Excluir item
  const handleDeleteItem = async (id: string, description: string) => {
    if (!window.confirm(`Deseja realmente excluir "${description}" dos lançamentos recorrentes?`)) return;
    if (!user?.uid) return;
    try {
      await db.collection('usuarios').doc(user.uid).collection('itens_recorrentes').doc(id).delete();
      if (editingId === id) resetForm();
    } catch (err) {
      console.error('Erro ao excluir item:', err);
    }
  };

  // Salvar Item (Novo ou Atualizado)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !user?.uid) {
      alert('Por favor, selecione uma categoria.');
      return;
    }

    setSavingItem(true);
    try {
      const fixedVal = parseFloat(formFixedAmount.replace(/\./g, '').replace(',', '.')) || 0;
      const pctVal = parseFloat(formPercentage.replace(',', '.')) || 0;
      const finalDescription = formDescription.trim() || formSubcategory.trim() || formCategory;

      const payload: Partial<RecurrentItem> = {
        description: finalDescription,
        type: formType,
        category: formCategory,
        subcategory: formSubcategory.trim(),
        valueType: formValueType,
        fixedAmount: formValueType === 'fixed' ? fixedVal : 0,
        percentage: formValueType === 'percentage' ? pctVal : 0,
        percentageBase: formPercentageBase,
        active: true,
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        await db.collection('usuarios').doc(user.uid).collection('itens_recorrentes').doc(editingId).update(payload);
      } else {
        await db.collection('usuarios').doc(user.uid).collection('itens_recorrentes').add(payload);
      }

      resetForm();
    } catch (err) {
      console.error('Erro ao salvar item recorrente:', err);
      alert('Erro ao salvar item.');
    } finally {
      setSavingItem(false);
    }
  };

  // Confirmar Lançamento em Lote
  const handleConfirmLaunch = async () => {
    if (!user?.uid) return;
    if (activeItems.length === 0) {
      alert('Nenhum item está ativo para lançamento. Ative pelo menos um item da lista.');
      return;
    }

    const confirmMsg = `Confirmar o lançamento de ${activeItems.length} transações no mês ${String(launchMonth).padStart(2, '0')}/${launchYear}?\n\n` +
      `• Total Despesas: R$ ${totalActiveExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• Total Receitas: R$ ${totalActiveIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    if (!window.confirm(confirmMsg)) return;

    setConfirmingLaunch(true);
    try {
      const baseDate = parseISO(launchDate);
      const newTransactions: any[] = activeItems.map(item => {
        const amount = calculateItemAmount(item);
        return {
          description: item.description || item.subcategory || item.category,
          amount: Math.max(0, amount),
          category: item.category,
          subcategory: item.subcategory || '',
          date: launchDate,
          month: baseDate.getMonth() + 1,
          year: baseDate.getFullYear(),
          type: item.type,
          isPaid: markAsPaid,
          createdAt: new Date().toISOString()
        };
      });

      await dbService.saveItems(user.uid, 'transacoes', newTransactions);

      alert(`Sucesso! ${newTransactions.length} transações foram lançadas com sucesso para a data ${format(baseDate, 'dd/MM/yyyy')}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao lançar transações recorrentes:', err);
      alert('Houve um erro ao lançar as transações. Verifique o console.');
    } finally {
      setConfirmingLaunch(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl text-indigo-400">
              <Repeat size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">Lançamentos Recorrentes & Fixos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Mensal Automático
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cadastre despesas fixas, caixinhas, investimentos e receitas. Configure uma vez e lance todos os meses com 1 clique.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* Painel de Configuração do Mês de Lançamento */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Calendar size={12} /> Data do Lançamento
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={launchDate}
                    onChange={(e) => setLaunchDate(e.target.value)}
                    className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="text-xs font-semibold text-slate-500">
                    Mês de competência: <strong className="text-slate-800">{String(launchMonth).padStart(2, '0')}/{launchYear}</strong>
                  </div>
                </div>
              </div>

              {/* Informações da Base do Mês (Para cálculo das porcentagens) */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-500 font-medium">Receita apurada no mês:</span>
                  <strong className="text-emerald-700 font-black">
                    R$ {monthCalculatedIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-slate-500 font-medium">Despesas apuradas:</span>
                  <strong className="text-rose-700 font-black">
                    R$ {monthCalculatedExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Opção para ajustar receita base manual caso ainda não tenha receita lançada no mês */}
                <div className="w-full sm:w-auto flex items-center gap-2 pt-2 sm:pt-0 sm:border-l sm:pl-4 border-slate-200">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={useManualIncome}
                      onChange={(e) => setUseManualIncome(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-semibold">Simular base de receita:</span>
                  </label>
                  {useManualIncome && (
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">R$</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={manualIncomeBase}
                        onChange={(e) => {
                          let val = e.target.value.replace(/\D/g, "");
                          if (!val) setManualIncomeBase("");
                          else {
                            const num = parseInt(val, 10) / 100;
                            setManualIncomeBase(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                          }
                        }}
                        className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form de Cadastro / Edição de Item Recorrente */}
          <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 sm:p-6 shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  {editingId ? <Edit3 size={16} /> : <Plus size={16} />}
                </span>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  {editingId ? 'Editar Item Recorrente' : 'Cadastrar Novo Item Recorrente'}
                </h4>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw size={12} /> Cancelar edição
                </button>
              )}
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Tipo e Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                {/* Tipo: Despesa ou Receita */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tipo</label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('expense');
                        setFormCategory('');
                      }}
                      className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        formType === 'expense'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowDownRight size={14} /> Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormType('income');
                        setFormCategory('');
                      }}
                      className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        formType === 'income'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowUpRight size={14} /> Receita
                    </button>
                  </div>
                </div>

                {/* Descrição */}
                <div className="sm:col-span-8 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Descrição do Item <span className="text-slate-400 font-normal lowercase">(opcional - se vazio, usará a categoria)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Aluguel, Caixinha Nubank, Aporte Ações, Luz, Internet..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Categoria e Subcategoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      setFormSubcategory('');
                    }}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {availableCategories.map((c, i) => (
                      <option key={c.id || `${c.name}-${i}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Subcategoria <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  {availableSubcategories.length > 0 ? (
                    <select
                      value={formSubcategory}
                      onChange={(e) => setFormSubcategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    >
                      <option value="">Sem subcategoria</option>
                      {availableSubcategories.map((sub, i) => (
                        <option key={i} value={sub}>{sub}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Fixo, Variável, Caixinha 1..."
                      value={formSubcategory}
                      onChange={(e) => setFormSubcategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  )}
                </div>
              </div>

              {/* Modo de Valor: Fixo ou Porcentagem */}
              <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Como definir o valor deste item?
                  </span>
                  <div className="inline-flex p-1 bg-slate-200/70 rounded-lg self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setFormValueType('fixed')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        formValueType === 'fixed'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <DollarSign size={13} /> Valor Fixo (R$)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormValueType('percentage')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        formValueType === 'percentage'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Percent size={13} /> Porcentagem (%)
                    </button>
                  </div>
                </div>

                {/* Campos condicionais baseados na seleção */}
                {formValueType === 'fixed' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Valor Fixo</label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formFixedAmount}
                        onChange={(e) => handleCurrencyInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-base outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Input % */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Porcentagem (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formPercentage}
                          onChange={(e) => setFormPercentage(e.target.value)}
                          className="w-full pl-4 pr-9 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-base outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">%</span>
                      </div>
                    </div>

                    {/* Base da Porcentagem */}
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Base de Cálculo</label>
                      <select
                        value={formPercentageBase}
                        onChange={(e) => setFormPercentageBase(e.target.value as PercentageBase)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="income">Sobre a Receita do mês</option>
                        <option value="expense">Sobre a Despesa do mês</option>
                      </select>
                    </div>

                    {/* Preview do Valor Calculado */}
                    <div className="sm:col-span-4 bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 text-xs text-indigo-950">
                      <span className="block text-[10px] font-black uppercase text-indigo-600">Valor Calculado Estimado</span>
                      <div className="font-black text-sm text-indigo-900 mt-0.5">
                        R$ {(
                          Math.round(
                            ((formPercentageBase === 'expense' ? effectiveExpenseBase : effectiveIncomeBase) *
                              ((parseFloat(formPercentage) || 0) / 100)) *
                              100
                          ) / 100
                        ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-indigo-500">
                        {parseFloat(formPercentage) || 0}% de R${' '}
                        {(formPercentageBase === 'expense' ? effectiveExpenseBase : effectiveIncomeBase).toLocaleString(
                          'pt-BR',
                          { minimumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Salvar Item */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {savingItem ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>{editingId ? 'Salvar Alterações' : 'Adicionar Item à Lista'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Itens Recorrentes Salvos */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  <span>Itens Cadastrados para Lançamento</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">
                    {recurrentItems.length} {recurrentItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Use os botões de <strong>Ativar/Desativar</strong> para definir quais itens serão lançados neste mês sem precisar excluí-los.
                </p>
              </div>

              {/* Atalhos Rápidos */}
              {recurrentItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleAll(true)}
                    className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold transition-all"
                  >
                    Ativar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAll(false)}
                    className="px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold transition-all"
                  >
                    Desativar Todos
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400 font-medium text-sm">Carregando itens...</div>
            ) : recurrentItems.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                <Repeat size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Nenhum item recorrente cadastrado ainda.</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Utilize o formulário acima para adicionar suas despesas fixas (casa, luz, caixinhas, investimentos) ou receitas recorrentes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {recurrentItems.map((item) => {
                  const calculatedAmount = calculateItemAmount(item);
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.active
                          ? 'bg-white border-slate-200 shadow-sm'
                          : 'bg-slate-50/80 border-slate-200/60 opacity-60'
                      }`}
                    >
                      {/* Lado Esquerdo: Botão Ativar/Desativar + Informações */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        {/* Botão Ativar / Desativar */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                            item.active
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                          title={item.active ? 'Clique para desativar este mês' : 'Clique para ativar este mês'}
                        >
                          <Power size={13} />
                          <span>{item.active ? 'Ativo' : 'Inativo'}</span>
                        </button>

                        {/* Detalhes do Item */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                item.type === 'income'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>

                            <h5 className="font-black text-slate-900 text-sm">{item.description || item.category}</h5>

                            {!item.active && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
                                Não será lançado
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-700">{item.category}</span>
                            {item.subcategory && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>{item.subcategory}</span>
                              </>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-400">
                              {item.valueType === 'fixed'
                                ? 'Valor Fixo'
                                : `${item.percentage}% ${item.percentageBase === 'expense' ? 'das despesas' : 'da receita'}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Valor e Ações */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                        {/* Valor Formatado */}
                        <div className="text-right">
                          <div
                            className={`font-black text-base ${
                              item.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            R$ {calculatedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          {item.valueType === 'percentage' && (
                            <span className="text-[10px] text-indigo-600 font-bold block">
                              ({item.percentage}% calculados)
                            </span>
                          )}
                        </div>

                        {/* Botões Editar / Excluir */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditItem(item)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Editar este item"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id!, item.description)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Excluir da lista"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer com Resumo do Lançamento e Botão "Confirmar Lançamento" */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Resumo */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Itens para Lançar</span>
              <span className="font-black text-base text-white">
                {activeItems.length} <span className="text-xs text-slate-400 font-normal">de {recurrentItems.length} ativos</span>
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">Total Despesas</span>
              <span className="font-black text-base text-rose-300">
                R$ {totalActiveExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Total Receitas</span>
              <span className="font-black text-base text-emerald-300">
                R$ {totalActiveIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

            {/* Checkbox Marcar como Pago */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markAsPaid}
                onChange={(e) => setMarkAsPaid(e.target.checked)}
                className="rounded text-indigo-500 focus:ring-indigo-400 bg-slate-800 border-slate-700"
              />
              <span className="text-slate-300 font-semibold text-xs">Lançar já como pago</span>
            </label>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleConfirmLaunch}
              disabled={confirmingLaunch || activeItems.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              {confirmingLaunch ? (
                <span>Lançando transações...</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Confirmar Lançamento ({activeItems.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
