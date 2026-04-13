import { Routes, Route } from 'react-router-dom';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Dashboard } from '@/components/admin/Dashboard';

const AdminDashboardPage = () => (
  <AdminRoute>
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        {/* Future admin sub-routes will be added here */}
        <Route path="products" element={<Placeholder label="מוצרים" />} />
        <Route path="bundles" element={<Placeholder label="מארזים" />} />
        <Route path="collections" element={<Placeholder label="קולקציות" />} />
        <Route path="orders" element={<Placeholder label="הזמנות" />} />
        <Route path="customers" element={<Placeholder label="לקוחות" />} />
        <Route path="newsletter" element={<Placeholder label="ניוזלטר" />} />
      </Route>
    </Routes>
  </AdminRoute>
);

/** Temporary placeholder for pages not yet implemented */
const Placeholder = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center h-64 text-muted-foreground">
    <p className="text-lg">{label} - בקרוב</p>
  </div>
);

export default AdminDashboardPage;
