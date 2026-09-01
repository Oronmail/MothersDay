import { Navigate, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading, logout } = useAdmin();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    );
  }

  // Signed in but not an admin: say so, instead of bouncing silently back to the
  // login screen (which then signs in again and bounces again).
  if (user && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-screen p-6 text-center" dir="rtl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">אין לחשבון הזה הרשאת ניהול</h1>
          <p className="text-sm text-muted-foreground">
            את מחוברת כ־<span dir="ltr">{user.email}</span>, אבל החשבון הזה לא מוגדר כמנהלת.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await logout();
              navigate('/admin/login', { replace: true });
            }}
          >
            התחברות עם חשבון אחר
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            חזרה לאתר
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
};
