import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <p className="text-muted-foreground">טוען...</p>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
};
