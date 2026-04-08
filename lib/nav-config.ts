import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Building2,
  Calendar,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Map,
  Package,
  Settings,
  Users,
} from 'lucide-react';

export type AppRole = 'admin' | 'pm' | 'developer' | 'viewer' | 'client';

export type NavItemDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hanya role admin */
  adminOnly?: boolean;
  /** Hanya admin atau PM */
  adminPmOnly?: boolean;
  /** Modul manajemen: hanya admin & PM (meetings, clients, assets, settings) */
  managementOnly?: boolean;
};

export type NavSection = {
  title: string | null;
  items: NavItemDef[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/projects', label: 'Projects', icon: FolderKanban },
    ],
  },
  {
    title: 'Manajemen',
    items: [
      {
        href: '/meetings',
        label: 'Meetings',
        icon: Calendar,
        managementOnly: true,
      },
      { href: '/notes', label: 'Catatan pribadi', icon: FileText },
      {
        href: '/clients',
        label: 'Klien',
        icon: Building2,
        managementOnly: true,
      },
      { href: '/members', label: 'Anggota', icon: Users, adminOnly: true },
      {
        href: '/assets',
        label: 'Aset',
        icon: Package,
        managementOnly: true,
      },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/guide', label: 'Panduan pengguna', icon: BookOpen },
      {
        href: '/project-guide',
        label: 'Panduan proyek',
        icon: Map,
        adminPmOnly: true,
      },
      {
        href: '/settings',
        label: 'Pengaturan',
        icon: Settings,
        managementOnly: true,
      },
    ],
  },
];

export function isNavItemVisible(role: string, item: NavItemDef): boolean {
  const r = role as AppRole;
  if (item.adminOnly && r !== 'admin') return false;
  if (item.adminPmOnly && r !== 'admin' && r !== 'pm') return false;
  if (item.managementOnly && r !== 'admin' && r !== 'pm') return false;
  return true;
}

export function filterNavSections(
  role: string,
  sections: NavSection[] = NAV_SECTIONS,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isNavItemVisible(role, item)),
    }))
    .filter((s) => s.items.length > 0);
}

export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
