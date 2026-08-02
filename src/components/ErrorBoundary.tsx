import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);

    const errorMessage = error?.message || "";
    const isChunkError =
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("Importing a module script failed") ||
      errorMessage.includes("Loading chunk");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("chunk_reload_timestamp");
      const now = Date.now();

      // Auto-reload immediately if not reloaded in the last 15 seconds
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem("chunk_reload_timestamp", now.toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isChunkError =
        errorMessage.includes("Failed to fetch dynamically imported module") ||
        errorMessage.includes("Importing a module script failed") ||
        errorMessage.includes("Loading chunk");

      if (isChunkError) {
        // Show lightweight updating spinner while auto-refreshing
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <h3 className="text-base font-semibold text-foreground">Updating to latest version...</h3>
            <p className="text-xs text-muted-foreground mt-1">Fetching fresh assets from server</p>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-lg p-6 bg-card border rounded-xl shadow">
            <h2 className="text-lg font-semibold mb-2 text-destructive">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred:
            </p>
            <div className="bg-muted text-destructive text-xs font-mono p-3 rounded text-left overflow-auto max-h-48 mb-4">
              {this.state.error?.message || "Unknown runtime error"}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
