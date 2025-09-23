import { NavLink } from 'react-router-dom';

import type { UserRole } from '@domain/costing';

import { cn } from '../../lib/utils';

interface MainNavProps {
  role: UserRole;
}

interface NavItem {
  label: string;
  to: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Weeks', to: '/weeks', roles: ['owner', 'teamMember'] },
  { label: 'Ingredients', to: '/ingredients', roles: ['owner'] },
  { label: 'Menu Items', to: '/menu-items', roles: ['owner'] }
];

export const MainNav = ({ role }: MainNavProps) => {
  const items = navItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 transition-colors hover:text-slate-900',
              isActive ? 'bg-orange-50 text-slate-900' : 'text-slate-600'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
