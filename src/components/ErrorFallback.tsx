import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

export const ErrorFallback = ({ 
  error, 
  resetError,
  message = "אירעה שגיאה בטעינת המידע" 
}: ErrorFallbackProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium mb-2" dir="rtl">{message}</h3>
      <p className="text-sm text-muted-foreground mb-4" dir="rtl">
        {error?.message || "נסה לרענן את הדף או לחזור מאוחר יותר"}
      </p>
      {resetError && (
        <Button onClick={resetError} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 ml-2" />
          נסה שוב
        </Button>
      )}
    </div>
  );
};
