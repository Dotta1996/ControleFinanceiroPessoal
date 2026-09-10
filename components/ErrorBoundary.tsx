import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any)<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white font-['Plus_Jakarta_Sans']">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full backdrop-blur-xl shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold mb-2">Algo inesperado aconteceu</h2>
            <p className="text-slate-400 text-xs mb-6 leading-relaxed">
              Ocorreu um erro temporário na interface. Você pode tentar recarregar a visualização.
            </p>
            {this.state.error?.message && (
              <div className="bg-slate-950/60 text-slate-400 text-[11px] p-3 rounded-xl mb-6 text-left font-mono overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw size={16} />
              Voltar ao Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
