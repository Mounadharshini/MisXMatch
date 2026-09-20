import React from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 rounded-2xl bg-surface border border-danger/30 shadow-lg space-y-4 my-4">
          <div className="flex items-center gap-3 text-danger">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <h3 className="text-base font-bold">Component Display Error</h3>
              <p className="text-xs text-muted">
                An error occurred while rendering this section ({this.props.name || "Component"}).
              </p>
            </div>
          </div>
          {this.state.error?.message && (
            <div className="p-3 rounded-lg bg-navy-950/20 dark:bg-navy-900/40 text-xs font-mono text-muted border border-app overflow-x-auto">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="btn btn-outline text-xs !py-2 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Component
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
