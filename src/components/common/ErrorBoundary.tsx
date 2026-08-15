import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  correlationId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    correlationId: "",
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const correlationId = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return { hasError: true, error, correlationId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary][${this.state.correlationId}] React Component Crash:`,
      error,
      errorInfo
    );

    // Optional Sentry integration (scrubbed of personal data)
    if (typeof window !== "undefined" && (window as any).Sentry) {
      try {
        (window as any).Sentry.captureException(error, {
          tags: {
            correlationId: this.state.correlationId,
            route: window.location.pathname,
          },
          extra: {
            componentStack: errorInfo.componentStack,
          },
        });
      } catch {
        // Ignored
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 rounded-3xl border-slate-200/90 shadow-xl bg-white text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-slate-900">
                {this.props.fallbackTitle || "Something went wrong"}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {this.props.fallbackDescription ||
                  "An unexpected interface issue occurred on this view. Our engineering team has received the diagnostic trace."}
              </p>
            </div>

            {this.state.correlationId && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono text-[11px] text-slate-500">
                Trace ID: <span className="font-bold text-slate-700">{this.state.correlationId}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                onClick={this.handleReset}
                className="w-full sm:w-auto rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto rounded-xl text-xs gap-1.5 h-9"
              >
                <a href="/">
                  <Home className="w-3.5 h-3.5" />
                  <span>Return Home</span>
                </a>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
