'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, LogOut, Settings, UserCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { authApi, notificationsApi } from '../../lib/api';
import { getCampusColor, timeFromNow } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function getRoleLabel(role?: string) {
  if (role === 'SUPER_ADMIN') return 'Admin';
  if (role === 'FACULTY') return 'Faculty';
  if (role === 'CLUB_PRESIDENT') return 'Club President';
  return 'Student';
}

export function Header() {
  const { user, refreshToken, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data),
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || notifData || [];
  const unread = notifications.filter((n: any) => !n.read).length;
  const avatarColor = getCampusColor(user?.campus || 'VELLORE');

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore logout failures and clear local session anyway
    } finally {
      logout();
      window.location.href = '/auth/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between px-6"
      style={{ background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
      {/* Left: page context */}
      <div>
        <span className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>
          {user?.name?.split(' ')[0]}&apos;s Dashboard
        </span>
        <span className="text-[12px] ml-2" style={{ color: '#94a3b8' }}>
          · {getRoleLabel(user?.role)}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-slate-50 relative"
            style={{ border: '1px solid #E2E8F0' }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4" style={{ color: '#64748B' }} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: '#ef4444' }}>{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="absolute right-0 top-11 w-80 z-50 rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(15,23,42,0.12)' }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <span className="font-bold text-[14px]" style={{ color: '#0F172A' }}>Notifications</span>
                  {unread > 0 && <span className="badge badge-red">{unread} new</span>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="h-7 w-7 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                      <p className="text-[13px]" style={{ color: '#64748B' }}>No notifications yet</p>
                    </div>
                  ) : notifications.slice(0, 8).map((n: any) => (
                    <div key={n.id} className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      style={{ borderBottom: '1px solid #F8FAFC', background: !n.read ? 'rgba(30,64,175,0.03)' : undefined }}>
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#1e40af' }} />}
                        <div className={!n.read ? 'pl-0' : 'pl-4'}>
                          <div className="font-semibold text-[12.5px]" style={{ color: '#0F172A' }}>{n.title}</div>
                          <div className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#64748B' }}>{n.message}</div>
                          <div className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{timeFromNow(n.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
            style={{ border: '1px solid #E2E8F0' }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${avatarColor}, #0F172A)` }}
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-[12.5px] font-semibold leading-none" style={{ color: '#0F172A' }}>{user?.name?.split(' ')[0]}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>{getRoleLabel(user?.role)}</div>
            </div>
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl"
                style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(15,23,42,0.12)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{user?.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>{user?.email}</div>
                </div>
                <Link href="/profile" onClick={() => setShowProfileMenu(false)}>
                  <div className="flex items-center gap-3 px-4 py-3 text-[13px] hover:bg-slate-50" style={{ color: '#0F172A' }}>
                    <UserCircle2 className="h-4 w-4" /> Profile
                  </div>
                </Link>
                <Link href="/settings" onClick={() => setShowProfileMenu(false)}>
                  <div className="flex items-center gap-3 px-4 py-3 text-[13px] hover:bg-slate-50" style={{ color: '#0F172A' }}>
                    <Settings className="h-4 w-4" /> Settings
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-[13px] hover:bg-red-50"
                  style={{ color: '#ef4444', borderTop: '1px solid #F1F5F9' }}
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
