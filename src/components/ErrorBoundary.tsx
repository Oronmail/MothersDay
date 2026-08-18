import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { captureException } from '../lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Browser messages for a lazy page-chunk that failed to load (stale build after
// a deploy, or a momentary network drop). Unlike a render bug, this is fully
// recoverable by reloading, which fetches the fresh index.html. Covers the
// Chrome / Firefox / Safari wordings plus Vite's CSS preload failure.
const CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i;

const isChunkLoadError = (error: Error | null): boolean =>
  !!error && CHUNK_ERROR_PATTERN.test(error.message);

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to Sentry (no-op outside production). Self-healed chunk reloads
    // never reach this boundary, so this only sees persistent failures.
    captureException(error, { componentStack: errorInfo.componentStack });
  }

  handleReset = () => {
    // A failed chunk import can't be retried in place (React caches the
    // rejected import promise) — only a full reload recovers.
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const chunkError = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className={`flex items-center gap-2 mb-2 ${chunkError ? 'text-foreground' : 'text-destructive'}`}>
                {chunkError ? <RefreshCw className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                <CardTitle dir="rtl">{chunkError ? 'הדף לא נטען עד הסוף' : 'משהו השתבש'}</CardTitle>
              </div>
              <CardDescription dir="rtl">
                {chunkError
                  ? 'כנראה בגלל עדכון לאתר או תקלת רשת רגעית. רענון הדף אמור לסדר את זה.'
                  : 'אירעה שגיאה בלתי צפויה. אנחנו מצטערים על אי הנוחות.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <details className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <summary className="cursor-pointer font-medium mb-2">
                    פרטי שגיאה טכניים
                  </summary>
                  <pre className="text-xs overflow-auto mt-2 whitespace-pre-wrap break-words">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col gap-2" dir="rtl">
                <Button onClick={this.handleReset} className="w-full">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  {chunkError ? 'רענון הדף' : 'נסה שוב'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  <Home className="h-4 w-4 ml-2" />
                  חזרה לדף הבית
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
