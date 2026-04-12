'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

function getRoleDestination(role: string): string {
  if (role === 'SUPER_ADMIN' || role === 'FACULTY') return '/admin';
  if (role === 'CLUB_PRESIDENT') return '/president';
  return '/dashboard';
}

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form);
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name?.split(' ')[0]}!`);
      window.location.assign(getRoleDestination(user.role));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1e3a5f 50%, #1e40af 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white"
            style={{ background: 'rgba(255,255,255,0.15)' }}>V</div>
          <span className="text-xl font-extrabold text-white">VITVerse</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Your entire campus life,<br />in one place.
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Register for events, track FFCS credits, connect with clubs, and stay on top of everything happening across VIT campuses.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { val: '4', label: 'Campuses' },
              { val: '500+', label: 'Events/yr' },
              { val: '12k+', label: 'Students' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="text-2xl font-extrabold text-white">{item.val}</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>© 2025 VITVerse · VIT Chennai Campus</p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, #0F172A, #1e40af)' }}>V</div>
            <span className="text-xl font-extrabold" style={{ color: '#0F172A' }}>VITVerse</span>
          </div>

          <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#0F172A' }}>Sign in</h2>
          <p className="text-[13.5px] mb-7" style={{ color: '#64748B' }}>
            Use your VIT institutional email to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input
                id="login-email"
                name="email"
                className="input"
                type="email"
                placeholder="yourname@vitstudent.ac.in"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="label mb-0">Password</label>
                <span className="text-[12px] cursor-pointer" style={{ color: '#1e40af' }}>Forgot password?</span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  className="input pr-10"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                  onClick={() => setShowPass(!showPass)} style={{ color: '#94a3b8' }}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 text-[14px]" disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                : <>Sign in <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="text-center text-[13px] mt-5" style={{ color: '#64748B' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold" style={{ color: '#1e40af' }}>
              Create one
            </Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-2xl p-4" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <p className="text-[11.5px] font-semibold mb-2" style={{ color: '#64748B' }}>Demo accounts</p>
            <div className="space-y-1.5">
              {[
                { role: 'Student', email: 'rahul@vit.ac.in', password: 'Test@1234' },
                { role: 'President', email: 'president@vit.ac.in', password: 'Test@1234' },
                { role: 'Admin', email: 'admin@vitverse.in', password: 'Test@1234' },
              ].map(d => (
                <button key={d.role} type="button"
                  className="w-full text-left rounded-lg px-3 py-2 flex items-center justify-between transition-colors hover:bg-white"
                  style={{ border: '1px solid #E2E8F0' }}
                  onClick={() => setForm({ email: d.email, password: d.password })}>
                  <span className="text-[12px] font-semibold" style={{ color: '#0F172A' }}>{d.role}</span>
                  <span className="text-[11px] font-mono" style={{ color: '#94a3b8' }}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
