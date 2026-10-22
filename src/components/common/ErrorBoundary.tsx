import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught component error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Something broke in the console</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              An unexpected error prevented this view from rendering safely.
            </p>

            {this.state.error && (
              <div className="mt-4 text-left p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono text-rose-600 dark:text-rose-400 overflow-x-auto max-h-36">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6">
              <Button onClick={this.handleReset} icon={<RotateCcw className="w-4 h-4" />}>
                Reset to Console Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
