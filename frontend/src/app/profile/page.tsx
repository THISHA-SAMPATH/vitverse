'use client';

import { useQuery } from '@tanstack/react-query';
import { Award, Calendar, GraduationCap, Mail, Phone, ShieldCheck, Star, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usersApi } from '../../lib/api';
import { getCampusColor, getCampusLabel, timeFromNow } from '../../lib/utils';

export default function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => usersApi.me().then((res) => res.data),
  });

  if (isLoading) {
    return <div className="skeleton h-72 rounded-3xl" />;
  }

  const user = data;
  const campusColor = getCampusColor(user?.campus || 'VELLORE');

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Profile</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>My Profile</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>Your account identity, academic details, and platform stats.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-extrabold text-white"
              style={{ background: `linear-gradient(135deg, ${campusColor}, #0F172A)` }}
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{user?.name}</h2>
              <div className="mt-1 text-[13px]" style={{ color: '#64748B' }}>{user?.bio || 'Add a short bio from Settings to personalize your profile.'}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge badge-blue">{getCampusLabel(user?.campus || '')}</span>
                <span className="badge badge-slate">{user?.role?.replace(/_/g, ' ')}</span>
                {user?.isVerified && <span className="badge badge-green">Verified</span>}
              </div>
            </div>
            <Link href="/settings" className="btn-secondary justify-center">Edit Profile</Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { icon: Mail, label: 'Email', value: user?.email || '-' },
              { icon: GraduationCap, label: 'Registration Number', value: user?.regNumber || 'Not added yet' },
              { icon: UserCircle2, label: 'Department', value: user?.department || 'Not added yet' },
              { icon: Calendar, label: 'Year of Study', value: user?.year ? `Year ${user.year}` : 'Not added yet' },
              { icon: Phone, label: 'Phone', value: user?.phone || 'Not added yet' },
              { icon: ShieldCheck, label: 'Joined', value: user?.createdAt ? timeFromNow(user.createdAt) : '-' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </div>
                <div className="mt-2 text-[14px] font-semibold" style={{ color: '#0F172A' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="card p-5">
            <div className="section-title mb-4">Account Snapshot</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Star, label: 'Points', value: user?.points ?? 0, color: '#d97706' },
                { icon: Award, label: 'Streak Days', value: user?.streakDays ?? 0, color: '#059669' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl p-4 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${item.color}15` }}>
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  </div>
                  <div className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{item.value}</div>
                  <div className="text-[12px] mt-1" style={{ color: '#64748B' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="section-title mb-2">What you can do here</div>
            <p className="text-[13px] leading-relaxed" style={{ color: '#64748B' }}>
              Use this page as your quick identity card, then open Settings to update your bio, academic details, phone number, and password.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
