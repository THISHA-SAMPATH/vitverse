'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Trophy, BookOpen,
  User, Shield, Ticket, Star, Sparkles, Zap, Settings, LogOut,
  Upload, MessageSquare, CalendarClock, ClipboardList,
  BarChart3, UserCheck, Bell, FileText, CalendarDays, UsersRound, QrCode
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../lib/api';
import { getCampusLabel, getCampusColor } from '../../lib/utils';
import { cn } from '../../lib/utils';

const STUDENT_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/events', icon: Calendar, label: 'Browse Events' },
  { href: '/events/calendar', icon: CalendarDays, label: 'Calendar View' },
  { href: '/bookings', icon: Ticket, label: 'My Bookings' },
  { href: '/ffcs', icon: BookOpen, label: 'FFCS Credits' },
  { href: '/clubs', icon: Users, label: 'Clubs' },
      { href: '/teams', icon: UsersRound, label: 'My Teams' },
  { href: '/student/tasks', icon: ClipboardList, label: 'Club Tasks' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/achievements', icon: Star, label: 'Achievements' },
  { href: '/portfolio', icon: User, label: 'Portfolio' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const PRESIDENT_NAV = [
  { href: '/president', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/president/events', icon: Upload, label: 'Submit Events' },
  { href: '/president/ffcs', icon: BookOpen, label: 'FFCS Management' },
  { href: '/president/members', icon: Users, label: 'Members & Tasks' },
  { href: '/president/discussions', icon: MessageSquare, label: 'Discussions' },
  { href: '/president/meetings', icon: CalendarClock, label: 'Meetings' },
  { href: '/checkin', icon: QrCode, label: 'Check-In Scanner' },
  { href: '/president/registrations', icon: ClipboardList, label: 'Registrations' },
  { href: '/events', icon: Calendar, label: 'All Events' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const ADMIN_NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/events', icon: Calendar, label: 'Event Approvals' },
  { href: '/admin/ffcs', icon: BookOpen, label: 'FFCS Approvals' },
  { href: '/admin/users', icon: UserCheck, label: 'Manage Users' },
  { href: '/admin/clubs', icon: Users, label: 'Manage Clubs' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/announcements', icon: Bell, label: 'Announcements' },
  { href: '/admin/reports', icon: FileText, label: 'Reports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function getRoleNav(role?: string) {
  if (role === 'SUPER_ADMIN' || role === 'FACULTY') return ADMIN_NAV;
  if (role === 'CLUB_PRESIDENT') return PRESIDENT_NAV;
  return STUDENT_NAV;
}

function getRoleInfo(role?: string) {
  if (role === 'SUPER_ADMIN') return { label: 'Admin', color: '#f43f5e', bg: 'rgba(244,63,94,0.08)' };
  if (role === 'FACULTY') return { label: 'Faculty', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' };
  if (role === 'CLUB_PRESIDENT') return { label: 'Club President', color: '#d97706', bg: 'rgba(217,119,6,0.08)' };
  return { label: 'Student', color: '#059669', bg: 'rgba(5,150,105,0.08)' };
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, refreshToken, logout } = useAuthStore();

  const campusColor = getCampusColor(user?.campus || 'VELLORE');
  const navItems = getRoleNav(user?.role);
  const roleInfo = getRoleInfo(user?.role);

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ } finally {
      logout();
      window.location.href = '/auth/login';
    }
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 md:flex md:flex-col"
      style={{ borderRight: '1px solid #E2E8F0', background: '#ffffff' }}>
      <div className="flex h-full flex-col px-4 py-5">

        {/* Logo */}
        <div className="flex items-center gap-3 pb-4 mb-2" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1e40af 100%)' }}>
            V
          </div>
          <div>
            <div className="text-[15px] font-extrabold" style={{ color: '#0F172A' }}>VITVerse</div>
            <div className="text-[10px]" style={{ color: '#64748B' }}>Campus Life Platform</div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="mb-3 rounded-xl px-3 py-2 flex items-center gap-2"
          style={{ background: roleInfo.bg }}>
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: roleInfo.color }} />
          <span className="text-[11px] font-semibold" style={{ color: roleInfo.color }}>{roleInfo.label}</span>
          {user?.campus && (
            <span className="ml-auto text-[10px] font-medium" style={{ color: '#94a3b8' }}>
              {getCampusLabel(user.campus)}
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/events' && item.href !== '/settings' && pathname.startsWith(item.href + '/'));
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 cursor-pointer"
                  style={isActive ? { background: '#F1F5F9' } : {}}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150"
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #0F172A 0%, #1e40af 100%)',
                      color: '#fff',
                    } : {
                      background: '#F8FAFC',
                      color: '#64748B',
                    }}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px] font-medium"
                    style={{ color: isActive ? '#0F172A' : '#64748B' }}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ background: '#1e40af' }} />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        {user && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${campusColor}, #2563eb)` }}>
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold" style={{ color: '#0F172A' }}>{user.name}</div>
                <div className="truncate text-[11px]" style={{ color: '#64748B' }}>{user.regNumber || user.email}</div>
              </div>
              <div className="rounded-lg px-2 py-1 flex-shrink-0"
                style={{ background: 'rgba(234,179,8,0.1)' }}>
                <div className="flex items-center gap-1 text-[11px] font-bold" style={{ color: '#ca8a04' }}>
                  <Zap className="h-3 w-3" /> {user.points || 0}
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <Link href="/settings" className="flex-1">
                <div className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium cursor-pointer transition-colors hover:bg-slate-100"
                  style={{ color: '#64748B', background: '#fff', border: '1px solid #E2E8F0' }}>
                  <Settings className="h-3 w-3" /> Settings
                </div>
              </Link>
              <button onClick={handleLogout} className="flex-1"
                style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer' }}>
                <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors hover:bg-red-50"
                  style={{ color: '#ef4444', borderRadius: '8px' }}>
                  <LogOut className="h-3 w-3" /> Logout
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
