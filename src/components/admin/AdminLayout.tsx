import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <AdminSidebar />
      <main className="mr-56 p-6">
        <Outlet />
      </main>
    </div>
  );
};
