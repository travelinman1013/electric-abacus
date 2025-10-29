import { NavLink } from 'react-router-dom';

import type { UserRole } from '@domain/costing';

import { cn } from '../../lib/utils';
import { useTerminology } from '../../hooks/use-terminology';

interface MainNavProps {
  role: UserRole;
}

interface NavItem {
  labelKey: 'dashboard' | 'weeks' | 'ingredients' | 'menuItems' | 'settings';
  to: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { labelKey: 'dashboard', to: '/app', roles: ['owner', 'teamMember'] },
  { labelKey: 'weeks', to: '/app/weeks', roles: ['owner', 'teamMember'] },
  { labelKey: 'ingredients', to: '/app/ingredients', roles: ['owner'] },
  { labelKey: 'menuItems', to: '/app/menu-items', roles: ['owner'] },
  { labelKey: 'settings', to: '/app/settings', roles: ['owner', 'teamMember'] }
];

export const MainNav = ({ role }: MainNavProps) => {
  const { terms } = useTerminology();
  const items = navItems.filter((item) => item.roles.includes(role));

  // Map labelKey to dynamic label from terms, with fallback for 'dashboard' and 'settings'
  const getLabel = (labelKey: NavItem['labelKey']): string => {
    if (labelKey === 'dashboard') return 'Dashboard';
    if (labelKey === 'settings') return 'Settings';
    return terms[labelKey];
  };

  return (
    <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium text-muted-foreground overflow-x-auto">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-2 transition-colors hover:text-foreground whitespace-nowrap',
              isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
            )
          }
        >
          {getLabel(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
};
