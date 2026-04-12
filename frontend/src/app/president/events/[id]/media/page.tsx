'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, Upload, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../store/auth.store';

const mediaApi = {
  getMedia: (eventId: string) => api.get(`/events/${eventId}/media`),
  uploadMedia: (eventId: string, data: { url: string; type: string; caption?: string }) =>
    api.post(`/events/${eventId}/media`, data),
  deleteMedia: (eventId: string, mediaId: string) =>
    api.delete(`/events/${eventId}/media/${mediaId}`),
};

export default function EventMediaPage() {
  const params = useParams<{ id: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [form, setForm] = useState({ url: '', type: 'IMAGE', caption: '' });
  const [showUpload, setShowUpload] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ['event-media', eventId],
    queryFn: () => mediaApi.getMedia(eventId).then(r => r.data),
    enabled: !!eventId,
  });

  const upload = useMutation({
    mutationFn: () => mediaApi.uploadMedia(eventId, form),
    onSuccess: () => {
      toast.success('Media added');
      setForm({ url: '', type: 'IMAGE', caption: '' });
      setShowUpload(false);
      qc.invalidateQueries({ queryKey: ['event-media', eventId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to add media'),
  });

  const deleteMedia = useMutation({
    mutationFn: (mediaId: string) => mediaApi.deleteMedia(eventId, mediaId),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['event-media', eventId] }); },
    onError: () => toast.error('Failed to remove'),
  });

  if (!user || !['FACULTY', 'SUPER_ADMIN', 'CLUB_PRESIDENT'].includes(user.role)) {
    return (
      <div className="card p-8 text-center">
        <p style={{ color: '#64748B' }}>Only organizers can manage event media.</p>
      </div>
    );
  }

  const items = Array.isArray(media) ? media : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="btn-ghost -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Event Media Gallery</h1>
          <p className="text-[14px] mt-1" style={{ color: '#64748B' }}>Upload post-event photos and videos</p>
        </div>
        <button className="btn-primary" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4" /> Add Media
        </button>
      </div>

      {showUpload && (
        <section className="card p-6 space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold" style={{ color: '#0F172A' }}>Add Media</h2>
            <button className="btn-ghost" onClick={() => setShowUpload(false)}><X className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Image / Video URL</label>
            <input
              type="url"
              className="w-full mt-1"
              placeholder="https://..."
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Type</label>
            <select className="w-full mt-1" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Caption (optional)</label>
            <input
              type="text"
              className="w-full mt-1"
              placeholder="Brief caption..."
              value={form.caption}
              onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
            />
          </div>
          <button
            className="btn-primary w-full justify-center"
            onClick={() => upload.mutate()}
            disabled={!form.url.trim() || upload.isPending}
          >
            {upload.isPending ? 'Uploading...' : 'Add to Gallery'}
          </button>
        </section>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="card p-10 text-center">
          <ImageIcon className="h-10 w-10 mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="text-[14px]" style={{ color: '#94a3b8' }}>No media uploaded yet. Add post-event photos to create a gallery.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((item: any) => (
            <div key={item.id} className="group relative overflow-hidden rounded-2xl" style={{ background: '#F1F5F9' }}>
              {item.type === 'IMAGE' ? (
                <img src={item.url} alt={item.caption || 'Event media'} className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center">
                  <span className="text-[13px]" style={{ color: '#64748B' }}>Video</span>
                </div>
              )}
              {item.caption && (
                <div className="p-2 text-[12px]" style={{ color: '#475569' }}>{item.caption}</div>
              )}
              <button
                onClick={() => deleteMedia.mutate(item.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: 'rgba(239,68,68,0.9)' }}
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
