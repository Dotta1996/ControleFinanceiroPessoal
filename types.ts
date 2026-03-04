
export type TransactionType = 'income' | 'expense';

export interface Category {
  id?: string;
  name: string;
  subcategories: string[];
  type: TransactionType;
}

export interface Transaction {
  id?: string;
  amount: number;
  category: string;
  subcategory: string;
  date: string;
  month: number;
  year: number;
  description: string;
  type: TransactionType;
  isPaid: boolean;
  createdAt?: any;
}

export interface Ticker {
  id?: string;
  symbol: string;
  name?: string;
  type?: string;
  sector?: string;
  lastPrice?: number;
}

export interface InvestmentOperation {
  id?: string;
  date: string;
  type: 'Compra' | 'Venda' | 'Rendimento';
  ticker: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  value: number; // Mantido para compatibilidade
  taxes: number;
  createdAt?: any;
}

export interface Aporte {
  id?: string;
  date: string;
  amount: number;
}

export interface CompraSonho {
  id?: string;
  date: string;
  item: string;
  amount: number;
  description?: string;
  createdAt?: any;
}

export interface GastoCarro {
  id?: string;
  date: string;
  item: string;
  quantity: number;
  total: number;
  createdAt?: any;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface Investment {
  id?: string;
  assetName: string;
  type: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  totalDividends: number;
  date: string;
  createdAt?: any;
}

export const ASSET_TYPES = ['Ações', 'FIIs', 'Tesouro Direto', 'Cripto', 'ETF', 'Renda Fixa', 'Outros'];

export const CATEGORIES = {
  income: ['Salário', 'Dividendos', 'Rendimentos', 'Presentes', 'Outros'],
  expense: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Moradia', 'Educação', 'Outros']
};
