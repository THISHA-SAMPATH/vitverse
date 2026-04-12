'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, Save, Shield, Smartphone, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { usersApi } from '../../lib/api';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user: authUser, updateUser } = useAuthStore();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data: user } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => usersApi.me().then((res) => res.data),
  });

  const { data: sessions } = useQuery({
    queryKey: ['user-sessions'],
    queryFn: () => usersApi.sessions().then((res) => res.data),
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    department: '',
    year: '',
    phone: '',
  });

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      name: user.name || '',
      bio: user.bio || '',
      department: user.department || '',
      year: user.year ? String(user.year) : '',
      phone: user.phone || '',
    });
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () => usersApi.updateMe(profileForm).then((res) => res.data),
    onSuccess: (updated) => {
      updateUser({
        name: updated.name,
        department: updated.department,
        year: updated.year,
        avatar: updated.avatar,
      });
      qc.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update profile'),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      usersApi.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).then((res) => res.data),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update password'),
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) => usersApi.revokeSession(id).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-sessions'] });
      toast.success('Session revoked');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not revoke session'),
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }
    changePassword.mutate();
  };

  const currentSessionLabel = useMemo(() => authUser?.email || 'Current account', [authUser?.email]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Settings</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Account Settings</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>Manage your profile information, password, and active sessions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(30,64,175,0.08)' }}>
              <UserCircle2 className="h-5 w-5" style={{ color: '#1e40af' }} />
            </div>
            <div>
              <div className="section-title">Profile Settings</div>
              <div className="section-subtitle">Keep your account details current and professional.</div>
            </div>
          </div>

          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile.mutate();
            }}
          >
            <div>
              <label htmlFor="settings-name" className="label">Full Name</label>
              <input id="settings-name" name="name" className="input" value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="settings-phone" className="label">Phone</label>
              <input id="settings-phone" name="phone" className="input" value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label htmlFor="settings-department" className="label">Department</label>
              <input id="settings-department" name="department" className="input" value={profileForm.department} onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Computer Science and Engineering" />
            </div>
            <div>
              <label htmlFor="settings-year" className="label">Year of Study</label>
              <select id="settings-year" name="year" className="input" value={profileForm.year} onChange={(e) => setProfileForm((prev) => ({ ...prev, year: e.target.value }))}>
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-bio" className="label">Bio</label>
              <textarea id="settings-bio" name="bio" className="input" rows={4} value={profileForm.bio} onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))} placeholder="A short introduction that appears on your profile." />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(124,58,237,0.08)' }}>
                <Shield className="h-5 w-5" style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <div className="section-title">Security</div>
                <div className="section-subtitle">Update your password securely.</div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div>
                <label htmlFor="settings-current-password" className="label">Current Password</label>
                <input id="settings-current-password" name="currentPassword" type="password" className="input" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="settings-new-password" className="label">New Password</label>
                <input id="settings-new-password" name="newPassword" type="password" className="input" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="settings-confirm-password" className="label">Confirm Password</label>
                <input id="settings-confirm-password" name="confirmPassword" type="password" className="input" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} />
              </div>
              <button type="submit" className="btn-primary w-full justify-center" disabled={changePassword.isPending}>
                {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Update Password
              </button>
            </form>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(5,150,105,0.08)' }}>
                <Smartphone className="h-5 w-5" style={{ color: '#059669' }} />
              </div>
              <div>
                <div className="section-title">Active Sessions</div>
                <div className="section-subtitle">Review and revoke signed-in devices.</div>
              </div>
            </div>

            <div className="space-y-3">
              {(sessions || []).length === 0 && (
                <div className="rounded-2xl p-4 text-[13px]" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}>
                  No other active sessions found.
                </div>
              )}

              {(sessions || []).map((session: any, index: number) => (
                <div key={session.id} className="rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>
                        {index === 0 ? `${currentSessionLabel} · Current session` : session.device || 'Signed-in device'}
                      </div>
                      <div className="text-[12px] mt-1" style={{ color: '#64748B' }}>{session.ip || 'IP unavailable'}</div>
                      <div className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>
                        Started: {new Date(session.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button className="btn-secondary text-[12px] py-2 px-3" onClick={() => revokeSession.mutate(session.id)} disabled={revokeSession.isPending}>
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
