import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-[100px] pointer-events-none"></div>
          
          <div className="max-w-md w-full relative z-10 flex flex-col items-center gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Something went wrong</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                The application encountered an unexpected error. Please refresh the page or try scanning the table QR code again.
              </p>
              {this.state.error && (
                <div className="mt-4 p-3 bg-black/40 border border-slate-800 rounded-xl text-left">
                  <p className="text-[10px] font-mono text-red-450 break-all">{this.state.error.toString()}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs cursor-pointer shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
