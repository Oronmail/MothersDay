import { NavLink } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { LayoutDashboard, Package, Gift, FolderOpen, ShoppingCart, Users, Mail, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'דשבורד', end: true },
  { to: '/admin/products', icon: Package, label: 'מוצרים' },
  { to: '/admin/bundles', icon: Gift, label: 'מארזים' },
  { to: '/admin/collections', icon: FolderOpen, label: 'קולקציות' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'הזמנות' },
  { to: '/admin/customers', icon: Users, label: 'לקוחות' },
  { to: '/admin/newsletter', icon: Mail, label: 'ניוזלטר' },
];

export const AdminSidebar = () => {
  const { user, logout } = useAdmin();

  return (
    <aside className="w-56 bg-card border-l border-border flex flex-col min-h-screen fixed right-0 top-0 z-40" dir="rtl">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold">MD Admin</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="px-3 text-xs text-muted-foreground mb-2">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent w-full"
        >
          <LogOut className="w-4 h-4" />
          התנתק
        </button>
      </div>
    </aside>
  );
};
