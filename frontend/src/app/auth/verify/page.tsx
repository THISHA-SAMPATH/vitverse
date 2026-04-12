'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedOtp = window.sessionStorage.getItem('vitverse_verify_otp') || '';
    if (savedOtp) {
      setDevOtp(savedOtp);
      setOtp(savedOtp);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Missing email. Please register again.');
      return;
    }
    if (otp.trim().length < 4) {
      toast.error('Please enter a valid OTP.');
      return;
    }

    setLoading(true);
    try {
      await authApi.verifyOtp({ email, otp: otp.trim() });
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('vitverse_verify_otp');
        window.sessionStorage.removeItem('vitverse_verify_email');
      }
      toast.success('Email verified. You can login now.');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <div className="mesh-bg" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8"
      >
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-3"
            style={{ background: 'linear-gradient(135deg, #0052CC 0%, #6366F1 100%)' }}
          >
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-slate-400 text-sm mt-1">
            Enter the OTP sent to your email to activate your account.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="verify-email" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
            <input id="verify-email" name="email" className="input-field mt-1" value={email} disabled />
          </div>

          <div>
            <label htmlFor="verify-otp" className="text-xs font-medium text-slate-400 uppercase tracking-wider">OTP</label>
            <input
              id="verify-otp"
              name="otp"
              className="input-field mt-1"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify OTP'}
          </button>
        </form>

        {devOtp && (
          <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Development OTP</p>
            <p className="mt-1 font-mono text-lg text-white">{devOtp}</p>
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-5">
          Back to <Link href="/auth/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-dark" />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
