'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Star, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, eventsApi } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/auth.store';

const feedbackApi = {
  submit: (eventId: string, data: { rating: number; comment?: string }) =>
    api.post(`/events/${eventId}/feedback`, data),
};

export default function EventFeedbackPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();
  const { user } = useAuthStore();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: event } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => eventsApi.get(slug).then(r => r.data),
    enabled: !!slug,
  });

  const submit = useMutation({
    mutationFn: () => feedbackApi.submit(event?.id, { rating, comment }),
    onSuccess: () => { setSubmitted(true); toast.success('Feedback submitted. Thank you!'); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not submit feedback'),
  });

  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  if (submitted) {
    return (
      <div className="max-w-md mx-auto mt-12 card p-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4" style={{ color: '#059669' }} />
        <h1 className="text-xl font-extrabold mb-2" style={{ color: '#0F172A' }}>Thank You!</h1>
        <p className="text-[14px] mb-6" style={{ color: '#64748B' }}>Your feedback helps us improve future events.</p>
        <button className="btn-primary" onClick={() => router.push('/events')}>Browse More Events</button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => router.back()} className="btn-ghost -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Rate this Event</h1>
        {event && <p className="text-[14px] mt-1" style={{ color: '#64748B' }}>{event.title}</p>}
      </div>

      <section className="card p-6 space-y-6">
        {/* Star rating */}
        <div>
          <label className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Your Rating</label>
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="h-9 w-9"
                  style={{
                    fill: star <= (hovered || rating) ? '#f59e0b' : 'none',
                    color: star <= (hovered || rating) ? '#f59e0b' : '#CBD5E1',
                  }}
                />
              </button>
            ))}
            {(hovered || rating) > 0 && (
              <span className="text-[14px] font-semibold ml-2" style={{ color: '#f59e0b' }}>
                {LABELS[hovered || rating]}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>
            Comments <span style={{ color: '#CBD5E1', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            className="w-full mt-2 rounded-xl p-3 text-[13px] resize-none"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A', minHeight: 120 }}
            placeholder="What did you enjoy? What could be improved?"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        <button
          className="btn-primary w-full justify-center"
          onClick={() => submit.mutate()}
          disabled={rating === 0 || submit.isPending}
        >
          <Star className="h-4 w-4" />
          {submit.isPending ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </section>
    </div>
  );
}
