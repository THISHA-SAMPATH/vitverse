'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send, Hash, Loader2 } from 'lucide-react';
import { collaborationApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../../lib/utils';

export default function DiscussionsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [activeChannel, setActiveChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const clubId = searchParams.get('clubId') || undefined;
  const clubName = searchParams.get('clubName') || undefined;

  const { data: channels } = useQuery({
    queryKey: ['collaboration-channels', clubId],
    queryFn: () => collaborationApi.channels(clubId).then((r) => r.data),
    refetchInterval: 2500,
  });

  const { data: currentMessages, isLoading } = useQuery({
    queryKey: ['collaboration-messages', clubId, activeChannel],
    queryFn: () => collaborationApi.messages(activeChannel, clubId).then((r) => r.data),
    refetchInterval: 1500,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => collaborationApi.postMessage(activeChannel, text, clubId).then((r) => r.data),
    onSuccess: () => {
      setNewMessage('');
      qc.invalidateQueries({ queryKey: ['collaboration-messages', clubId, activeChannel] });
      qc.invalidateQueries({ queryKey: ['collaboration-channels', clubId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to send message'),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeChannel]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage.trim());
  };

  const channelList = channels || [];
  const currentChannel = channelList.find((channel: any) => channel.id === activeChannel);

  const isPresident = user?.role === 'CLUB_PRESIDENT';

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>{isPresident ? 'President / Discussions' : 'Student / Club Chats'}</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>{isPresident ? 'Team Discussions' : 'Club Discussions'}</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
          {isPresident ? 'Coordinate with your club members across different topic channels.' : `Stay in sync with ${clubName || 'your club'} through shared discussion channels.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-2xl" style={{ border: '1px solid #E2E8F0', height: 560, display: 'grid', gridTemplateColumns: '220px 1fr' }}>
        <div style={{ borderRight: '1px solid #E2E8F0', background: '#F8FAFC', overflowY: 'auto' }}>
          <div className="p-3 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-widest px-2 mb-2" style={{ color: '#94a3b8' }}>Channels</div>
            {channelList.map((channel: any) => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors"
                style={activeChannel === channel.id ? { background: '#fff', color: '#0F172A', border: '1px solid #E2E8F0' } : { color: '#64748B', background: 'transparent', border: '1px solid transparent' }}
              >
                <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[13px] font-medium truncate">{channel.name}</span>
                {channel.count > 0 && (
                  <span className="ml-auto text-[10px] rounded-full px-1.5 py-0.5" style={{ background: '#E2E8F0', color: '#64748B' }}>
                    {channel.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-white">
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <Hash className="h-4 w-4" style={{ color: '#64748B' }} />
            <span className="font-bold text-[14px]" style={{ color: '#0F172A' }}>{currentChannel?.name}</span>
            <span className="text-[12px] ml-2" style={{ color: '#94a3b8' }}>{currentChannel?.description}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-14" />)}</div>
            ) : (currentMessages || []).length === 0 ? (
              <div className="text-center py-12" style={{ color: '#64748B' }}>No messages in this channel yet.</div>
            ) : (
              (currentMessages || []).map((message: any) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                  <div className="avatar h-8 w-8 text-[11px] flex-shrink-0 rounded-full" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
                    {message.avatar}
                  </div>
                  <div className="max-w-[70%] flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold" style={{ color: '#0F172A' }}>{message.author}</span>
                      <span className="text-[11px]" style={{ color: '#94a3b8' }}>{formatDateTime(message.createdAt)}</span>
                    </div>
                    <div className="rounded-2xl px-4 py-2.5 text-[13.5px]" style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderBottomLeftRadius: 4 }}>
                      {message.text}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3" style={{ borderTop: '1px solid #E2E8F0' }}>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={`Message #${currentChannel?.name || activeChannel}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button className="btn-primary px-4" onClick={sendMessage} disabled={sendMutation.isPending || !newMessage.trim()}>
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
