import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// A query that fails (RLS, network, missing column) used to render exactly like an
// empty table — "אין מוצרים" — which already cost one debugging session.
// Every admin list renders this instead, so a failure always looks like a failure.

interface AdminErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  description?: string;
  /** Render bare, for use inside an existing Card. */
  compact?: boolean;
}

const errorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' && message.trim() ? message : null;
  }
  return null;
};

export const AdminErrorState = ({
  error,
  onRetry,
  title = 'לא הצלחנו לטעון את הנתונים',
  description = 'ייתכן שיש תקלת רשת או שאין הרשאה לצפות בנתונים. נסי שוב, ואם זה חוזר — רענני את העמוד והתחברי מחדש.',
  compact = false,
}: AdminErrorStateProps) => {
  const detail = errorMessage(error);

  const body = (
    <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {detail && (
          <p className="text-xs text-muted-foreground break-all" dir="ltr">
            {detail}
          </p>
        )}
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          נסי שוב
        </Button>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <Card>
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
};
