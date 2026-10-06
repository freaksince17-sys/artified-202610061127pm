import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logErrorToFirestore } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    logErrorToFirestore(error, { componentStack: errorInfo.componentStack }).catch(() => {});
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-[#0F0E0E] text-[#1C1B1A] dark:text-[#F5F2EB] p-6 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#1A1918] p-8 rounded-3xl shadow-2xl border border-[#E8DFD8] dark:border-[#2D2B28] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37]">
              ⚠️
            </div>
            <h2 className="font-serif text-xl font-bold">Something went wrong</h2>
            <p className="text-xs text-[#736C65] dark:text-[#A69E96] leading-relaxed">
              An unexpected error occurred. Our team has been automatically notified via Firestore error logs.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl bg-[#1C1B1A] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1C1B1A] font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-md cursor-pointer"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
