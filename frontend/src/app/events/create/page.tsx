'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Sparkles, Calendar, MapPin, Users, Tag,
  ChevronRight, Loader2, AlertCircle, CheckCircle, X, Wand2
} from 'lucide-react';
import { eventsApi, aiApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import toast from 'react-hot-toast';

const CAMPUSES = ['VELLORE', 'CHENNAI', 'AP', 'BHOPAL'];
const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Hackathon', 'Competition', 'Seminar', 'Social'];

export default function CreateEventPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    shortDesc: '',
    campus: user?.campus || 'VELLORE',
    venue: '',
    startDateTime: '',
    endDateTime: '',
    registrationDeadline: '',
    capacity: 100,
    teamSize: 1,
    isTeamEvent: false,
    hasWaitlist: true,
    entryFee: 0,
    prizePool: '',
    certificateEligible: true,
    tags: [] as string[],
    visibility: 'PUBLIC',
  });

  const [conflicts, setConflicts] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [currentTag, setCurrentTag] = useState('');

  const { mutate: createEvent, isPending } = useMutation({
    mutationFn: (data: any) => eventsApi.create(data),
    onSuccess: (res) => {
      toast.success('Event created! Publishing…');
      router.push(`/events/${res.data.slug}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create event'),
  });

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      setPosterPreview(ev.target?.result as string);
      setExtracting(true);

      try {
        const { data } = await aiApi.extractPoster(base64);
        if (data.title) setForm((f) => ({ ...f, title: data.title || f.title }));
        if (data.venue) setForm((f) => ({ ...f, venue: data.venue || f.venue }));
        if (data.description) setForm((f) => ({ ...f, description: data.description || f.description }));
        if (data.tags) setForm((f) => ({ ...f, tags: f.tags.concat(data.tags || []).filter((t: string, i: number, arr: string[]) => arr.indexOf(t) === i) }));
        toast.success('✨ AI extracted event details from poster!');
      } catch {
        toast.error('Could not extract from poster');
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const checkConflicts = async () => {
    if (!form.startDateTime || !form.endDateTime) return;
    try {
      const { data } = await aiApi.detectConflicts({
        title: form.title,
        campus: form.campus,
        startDateTime: new Date(form.startDateTime),
        endDateTime: new Date(form.endDateTime),
        tags: form.tags,
      });
      setConflicts(data);
    } catch {}
  };

  const addTag = () => {
    if (currentTag && !form.tags.includes(currentTag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, currentTag.toLowerCase()] }));
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startDateTime || !form.endDateTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    createEvent({
      ...form,
      startDateTime: new Date(form.startDateTime),
      endDateTime: new Date(form.endDateTime),
      registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline) : undefined,
    });
  };

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-1">Create Event</h1>
        <p className="text-slate-400 mb-8">Fill in the details or let AI extract them from a poster</p>
      </motion.div>

      {/* AI Poster Upload */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-5 mb-6 border border-secondary/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-secondary" />
          <h3 className="font-semibold text-white text-sm">AI Poster Extraction</h3>
          <span className="badge badge-secondary">NEW</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Upload your event poster and AI will auto-fill the form details</p>

        <div
          className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-secondary/40 transition-all"
          onClick={() => fileRef.current?.click()}
        >
          {posterPreview ? (
            <div className="relative inline-block">
              <img src={posterPreview} alt="Poster" className="h-32 rounded-lg object-cover mx-auto" />
              {extracting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-slate-500" />
              <span className="text-sm text-slate-400">Click to upload poster</span>
              <span className="text-xs text-slate-600">PNG, JPG up to 5MB</span>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePosterUpload} className="hidden" />
      </motion.div>

      {/* Conflict warning */}
      <AnimatePresence>
        {conflicts?.hasConflict && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass rounded-2xl p-4 mb-6 border border-warning/30 bg-warning/5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-warning mb-1">Scheduling Conflict Detected</div>
                <div className="text-xs text-slate-300">{conflicts.warningMessage}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-400" />
            Basic Information
          </h3>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Event Title *</label>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g., HackVIT 2025 — 24-Hour Hackathon"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Campus *</label>
              <select
                value={form.campus}
                onChange={(e) => update('campus', e.target.value)}
                className="input-field"
              >
                {CAMPUSES.map((c) => (
                  <option key={c} value={c} className="bg-slate-800">{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => update('visibility', e.target.value)}
                className="input-field"
              >
                <option value="PUBLIC" className="bg-slate-800">Public</option>
                <option value="INTERNAL" className="bg-slate-800">VIT Only</option>
                <option value="PRIVATE" className="bg-slate-800">Private</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Short Description</label>
            <input
              value={form.shortDesc}
              onChange={(e) => update('shortDesc', e.target.value)}
              placeholder="One-line description for listings"
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Full Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe the event, prizes, schedule…"
              className="input-field min-h-[100px] resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Date & Venue */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            Date, Time & Venue
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Start Date & Time *</label>
              <input
                type="datetime-local"
                value={form.startDateTime}
                onChange={(e) => { update('startDateTime', e.target.value); setTimeout(checkConflicts, 500); }}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">End Date & Time *</label>
              <input
                type="datetime-local"
                value={form.endDateTime}
                onChange={(e) => { update('endDateTime', e.target.value); setTimeout(checkConflicts, 500); }}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Registration Deadline</label>
              <input
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => update('registrationDeadline', e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Venue</label>
              <input
                value={form.venue}
                onChange={(e) => update('venue', e.target.value)}
                placeholder="e.g., Anna Auditorium, TT Hall"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Capacity & Registration */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-400" />
            Capacity & Registration
          </h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => update('capacity', parseInt(e.target.value))}
                min={1}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Team Size</label>
              <input
                type="number"
                value={form.teamSize}
                onChange={(e) => update('teamSize', parseInt(e.target.value))}
                min={1}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Entry Fee (₹)</label>
              <input
                type="number"
                value={form.entryFee}
                onChange={(e) => update('entryFee', parseFloat(e.target.value))}
                min={0}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isTeamEvent}
                onChange={(e) => update('isTeamEvent', e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm text-slate-300">Team Event</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasWaitlist}
                onChange={(e) => update('hasWaitlist', e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm text-slate-300">Enable Waitlist</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.certificateEligible}
                onChange={(e) => update('certificateEligible', e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-sm text-slate-300">Issue Certificates</span>
            </label>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Prize Pool</label>
            <input
              value={form.prizePool}
              onChange={(e) => update('prizePool', e.target.value)}
              placeholder="e.g., ₹50,000 in prizes"
              className="input-field"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-amber-400" />
            Tags & Categories
          </h3>

          <div className="flex gap-2 flex-wrap mb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  const t = cat.toLowerCase();
                  if (!form.tags.includes(t)) update('tags', [...form.tags, t]);
                }}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add custom tag…"
              className="input-field flex-1"
            />
            <button type="button" onClick={addTag} className="btn-secondary px-4">Add</button>
          </div>

          {form.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {form.tags.map((tag) => (
                <span key={tag} className="badge badge-primary gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="btn-primary min-w-[140px]">
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Create Event</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
