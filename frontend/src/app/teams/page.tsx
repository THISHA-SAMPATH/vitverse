'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Copy, LogIn, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { formatDate, getCampusLabel } from '../../lib/utils';

const teamsApi = {
  myTeams: () => api.get('/teams/my-teams'),
  createTeam: (data: { name: string; eventId: string }) => api.post('/teams', data),
  joinTeam: (inviteCode: string) => api.post('/teams/join', { inviteCode }),
  getTeam: (id: string) => api.get(`/teams/${id}`),
};

export default function TeamsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'my' | 'create' | 'join'>('my');
  const [createForm, setCreateForm] = useState({ name: '', eventId: '' });
  const [joinCode, setJoinCode] = useState('');

  const { data: myTeams, isLoading } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => teamsApi.myTeams().then(r => r.data),
  });

  const createTeam = useMutation({
    mutationFn: () => teamsApi.createTeam(createForm),
    onSuccess: () => {
      toast.success('Team created!');
      setCreateForm({ name: '', eventId: '' });
      setTab('my');
      qc.invalidateQueries({ queryKey: ['my-teams'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create team'),
  });

  const joinTeam = useMutation({
    mutationFn: () => teamsApi.joinTeam(joinCode.trim()),
    onSuccess: () => {
      toast.success('Joined team!');
      setJoinCode('');
      setTab('my');
      qc.invalidateQueries({ queryKey: ['my-teams'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Invalid invite code'),
  });

  const teams = Array.isArray(myTeams) ? myTeams : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>My Teams</h1>
        <p className="text-[14px] mt-1" style={{ color: '#64748B' }}>Form or join teams for hackathons and competitions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['my', 'create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-xl px-4 py-2 text-[13px] font-semibold transition-all"
            style={{
              background: tab === t ? '#1e40af' : '#F1F5F9',
              color: tab === t ? '#fff' : '#475569',
            }}
          >
            {t === 'my' ? 'My Teams' : t === 'create' ? '+ Create Team' : 'Join via Code'}
          </button>
        ))}
      </div>

      {tab === 'my' && (
        <section className="space-y-3">
          {isLoading && <div className="skeleton h-24 rounded-2xl" />}
          {!isLoading && teams.length === 0 && (
            <div className="card p-8 text-center">
              <Users className="h-10 w-10 mx-auto mb-3" style={{ color: '#CBD5E1' }} />
              <p className="text-[14px]" style={{ color: '#94a3b8' }}>You are not in any teams yet.</p>
              <button className="btn-primary mt-4" onClick={() => setTab('create')}>
                <Plus className="h-4 w-4" /> Create a Team
              </button>
            </div>
          )}
          {teams.map((team: any) => (
            <div key={team.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[15px]" style={{ color: '#0F172A' }}>{team.name}</h3>
                    {team.event && (
                      <span className="badge badge-blue text-[11px]">{team.event.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[12px]" style={{ color: '#64748B' }}>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{team.members?.length || 0} members</span>
                    {team.event?.startDateTime && (
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{formatDate(team.event.startDateTime)}</span>
                    )}
                  </div>
                  {/* Members */}
                  {team.members && team.members.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {team.members.map((m: any) => (
                        <div key={m.id} className="rounded-xl px-2 py-1 text-[11px] font-semibold"
                          style={{ background: '#F1F5F9', color: '#475569' }}>
                          {m.user?.name || 'Member'} {m.role !== 'Member' && `· ${m.role}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {team.inviteCode && (
                  <button
                    className="btn-ghost text-[12px] shrink-0"
                    onClick={() => { navigator.clipboard.writeText(team.inviteCode); toast.success('Invite code copied!'); }}
                  >
                    <Copy className="h-3.5 w-3.5" /> {team.inviteCode}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'create' && (
        <section className="card p-6 space-y-4 max-w-md">
          <h2 className="text-[16px] font-bold" style={{ color: '#0F172A' }}>Create a New Team</h2>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Team Name</label>
            <input
              type="text"
              className="w-full mt-1"
              placeholder="e.g. Byte Busters"
              value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Event ID or Slug</label>
            <input
              type="text"
              className="w-full mt-1"
              placeholder="Paste event id or event slug"
              value={createForm.eventId}
              onChange={e => setCreateForm(f => ({ ...f, eventId: e.target.value }))}
            />
            <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>Paste either the internal event id or the slug from the event detail URL.</p>
          </div>
          <button
            className="btn-primary w-full justify-center"
            onClick={() => createTeam.mutate()}
            disabled={!createForm.name.trim() || !createForm.eventId.trim() || createTeam.isPending}
          >
            <Plus className="h-4 w-4" />
            {createTeam.isPending ? 'Creating...' : 'Create Team'}
          </button>
        </section>
      )}

      {tab === 'join' && (
        <section className="card p-6 space-y-4 max-w-md">
          <h2 className="text-[16px] font-bold" style={{ color: '#0F172A' }}>Join via Invite Code</h2>
          <p className="text-[13px]" style={{ color: '#64748B' }}>Ask your team captain for the invite code and paste it below.</p>
          <input
            type="text"
            className="w-full font-mono"
            placeholder="e.g. abc123xyz"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
          />
          <button
            className="btn-primary w-full justify-center"
            onClick={() => joinTeam.mutate()}
            disabled={!joinCode.trim() || joinTeam.isPending}
          >
            <LogIn className="h-4 w-4" />
            {joinTeam.isPending ? 'Joining...' : 'Join Team'}
          </button>
        </section>
      )}
    </div>
  );
}
