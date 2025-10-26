import { NavLink } from 'react-router-dom';

import type { UserRole } from '@domain/costing';

import { cn } from '../../lib/utils';
import { useTerminology } from '../../hooks/use-terminology';

interface MainNavProps {
  role: UserRole;
}

interface NavItem {
  labelKey: 'weeks' | 'ingredients' | 'menuItems' | 'settings';
  to: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { labelKey: 'weeks', to: '/app/weeks', roles: ['owner', 'teamMember'] },
  { labelKey: 'ingredients', to: '/app/ingredients', roles: ['owner'] },
  { labelKey: 'menuItems', to: '/app/menu-items', roles: ['owner'] },
  { labelKey: 'settings', to: '/app/settings', roles: ['owner', 'teamMember'] }
];

export const MainNav = ({ role }: MainNavProps) => {
  const { terms } = useTerminology();
  const items = navItems.filter((item) => item.roles.includes(role));

  // Map labelKey to dynamic label from terms, with fallback for 'settings'
  const getLabel = (labelKey: NavItem['labelKey']): string => {
    if (labelKey === 'settings') return 'Settings';
    return terms[labelKey];
  };

  return (
    <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium text-slate-600 overflow-x-auto">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 transition-colors hover:text-slate-900 whitespace-nowrap',
              isActive ? 'bg-orange-50 text-slate-900' : 'text-slate-600'
            )
          }
        >
          {getLabel(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};
