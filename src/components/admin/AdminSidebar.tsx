import { NavLink } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { LayoutDashboard, Package, Gift, FolderOpen, ShoppingCart, Users, Mail, Ticket, LogOut, Settings, Heart } from 'lucide-react';
import logoNew from '@/assets/logo-new.png';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'דשבורד', end: true },
  { to: '/admin/products', icon: Package, label: 'מוצרים' },
  { to: '/admin/bundles', icon: Gift, label: 'מארזים' },
  { to: '/admin/collections', icon: FolderOpen, label: 'קולקציות' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'הזמנות' },
  { to: '/admin/customers', icon: Users, label: 'לקוחות' },
  { to: '/admin/reviews', icon: Heart, label: 'חוות דעת' },
  { to: '/admin/newsletter', icon: Mail, label: 'ניוזלטר' },
  { to: '/admin/discounts', icon: Ticket, label: 'הטבות' },
  { to: '/admin/settings', icon: Settings, label: 'הגדרות' },
];

/**
 * The panel itself — shared by the fixed desktop sidebar and the mobile drawer.
 * `onNavigate` lets the drawer close itself when a link is tapped.
 */
export const AdminSidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = useAdmin();

  return (
    <div className="flex flex-col flex-1 h-full" dir="rtl">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <img src={logoNew} alt="MothersDay" className="h-8 w-auto" />
          <span className="text-sm font-semibold text-muted-foreground">Admin</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
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
        <div className="px-3 text-xs text-muted-foreground mb-2 break-all">{user?.email}</div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent w-full"
        >
          <LogOut className="w-4 h-4" />
          התנתק
        </button>
      </div>
    </div>
  );
};

/** Fixed sidebar — desktop only; the mobile drawer lives in AdminLayout. */
export const AdminSidebar = () => (
  <aside className="w-56 bg-card border-l border-border flex flex-col min-h-screen fixed right-0 top-0 z-40" dir="rtl">
    <AdminSidebarContent />
  </aside>
);
