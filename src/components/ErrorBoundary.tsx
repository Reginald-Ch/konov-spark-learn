import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, an uncaught render-time error anywhere in the tree leaves
// the SEO-fallback markup baked into index.html (see
// scripts/generate-static-seo.mjs) sitting on screen forever, looking like
// a plain, unstyled, half-broken page instead of a real error — since React
// never got far enough to replace it. This turns that into an honest "this
// broke" state with the actual error, not a silent freeze.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] caught a render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted px-6">
          <div className="text-center max-w-md">
            <h1 className="mb-3 text-2xl font-bold">Something broke</h1>
            <p className="mb-4 text-muted-foreground">
              This page hit an error and couldn't load. Reloading usually fixes it — if it keeps
              happening, that's a real bug worth reporting.
            </p>
            <p className="mb-5 font-mono text-xs text-muted-foreground/70 break-words">
              {this.state.error.message}
            </p>
            <a href="/" className="text-primary underline hover:text-primary/80">
              Return to Home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
