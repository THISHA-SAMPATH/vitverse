'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, GraduationCap, MapPin, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../../lib/api';

const CAMPUSES = [
  { value: 'VELLORE', label: 'VIT Vellore' },
  { value: 'CHENNAI', label: 'VIT Chennai' },
  { value: 'AP', label: 'VIT AP' },
  { value: 'BHOPAL', label: 'VIT Bhopal' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    campus: '',
    regNumber: '',
    department: '',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register(form);
      const otp = res.data?.devOtp || '';
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('vitverse_verify_email', form.email);
        if (otp) window.sessionStorage.setItem('vitverse_verify_otp', otp);
      }
      setDevOtp(otp);
      toast.success(otp ? 'Registration successful! Use the OTP shown on the next screen.' : 'Registration successful! Check your email for the OTP.');
      router.push(`/auth/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <div className="mesh-bg" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #0052CC 0%, #6366F1 100%)' }}>
            <span className="text-2xl font-black text-white">V</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Join VITVerse</h1>
          <p className="text-slate-400 mt-1 text-sm">Your unified campus ecosystem</p>
        </div>

        <div className="glass-card p-8">
          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleRegister} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="register-name" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="register-name"
                      name="name"
                      className="input-field pl-10"
                      placeholder="Rahul Kumar"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="register-email" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="register-email"
                      name="email"
                      type="email"
                      className="input-field pl-10"
                      placeholder="22BCE1234@vit.ac.in"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="register-password" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="register-password"
                      name="password"
                      type={showPass ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      required
                      minLength={8}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full justify-center mt-2">
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="register-campus" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Campus</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <select
                      id="register-campus"
                      name="campus"
                      className="input-field pl-10 appearance-none"
                      value={form.campus}
                      onChange={(e) => update('campus', e.target.value)}
                      required
                    >
                      <option value="">Select your campus</option>
                      {CAMPUSES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="register-reg-number" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Registration Number</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="register-reg-number"
                      name="regNumber"
                      className="input-field pl-10"
                      placeholder="22BCE1234"
                      value={form.regNumber}
                      onChange={(e) => update('regNumber', e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="register-department" className="text-xs font-medium text-slate-400 uppercase tracking-wider">Department</label>
                  <input
                    id="register-department"
                    name="department"
                    className="input-field"
                    placeholder="Computer Science and Engineering"
                    value={form.department}
                    onChange={(e) => update('department', e.target.value)}
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1 justify-center border border-white/10">
                    Back
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Register <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
              </>
            )}
          </form>

          {devOtp && (
            <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Development OTP</p>
              <p className="mt-1 font-mono text-lg text-white">{devOtp}</p>
            </div>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
