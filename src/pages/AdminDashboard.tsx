import { Routes, Route } from 'react-router-dom';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Dashboard } from '@/components/admin/Dashboard';
import { ProductList } from '@/components/admin/ProductList';
import { ProductForm } from '@/components/admin/ProductForm';
import { BundleList } from '@/components/admin/BundleList';
import { BundleForm } from '@/components/admin/BundleForm';
import { CollectionList } from '@/components/admin/CollectionList';
import { CollectionForm } from '@/components/admin/CollectionForm';
import { OrderList } from '@/components/admin/OrderList';
import { OrderDetail } from '@/components/admin/OrderDetail';
import { CustomerList } from '@/components/admin/CustomerList';
import { CustomerDetail } from '@/components/admin/CustomerDetail';
import { NewsletterList } from '@/components/admin/NewsletterList';
import { StoreSettings } from '@/components/admin/StoreSettings';

const AdminDashboardPage = () => (
  <AdminRoute>
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="bundles" element={<BundleList />} />
        <Route path="bundles/new" element={<BundleForm />} />
        <Route path="bundles/:id" element={<BundleForm />} />
        <Route path="collections" element={<CollectionList />} />
        <Route path="collections/new" element={<CollectionForm />} />
        <Route path="collections/:id" element={<CollectionForm />} />
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="customers" element={<CustomerList />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="newsletter" element={<NewsletterList />} />
        <Route path="settings" element={<StoreSettings />} />
      </Route>
    </Routes>
  </AdminRoute>
);

export default AdminDashboardPage;
