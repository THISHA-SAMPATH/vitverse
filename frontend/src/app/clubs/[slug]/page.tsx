'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Users, Calendar, Trophy, Star, Globe, Instagram, Linkedin,
  ExternalLink, UserPlus, UserMinus, Heart, Activity, Loader2,
  ChevronRight, Award, Camera, ClipboardList, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { clubsApi, collaborationApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { getCampusLabel, getCampusColor, formatDate, timeFromNow, truncate } from '../../../lib/utils';
import toast from 'react-hot-toast';

export default function ClubDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, string>>({});

  const { data: club, isLoading } = useQuery({
    queryKey: ['club', slug],
    queryFn: () => clubsApi.get(slug).then((r) => r.data),
    enabled: !!slug,
  });

  const { mutate: joinClub, isPending: joining } = useMutation({
    mutationFn: () => clubsApi.join(club!.id),
    onSuccess: () => {
      toast.success(`Joined ${club?.name}!`);
      queryClient.invalidateQueries({ queryKey: ['club', slug] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to join club'),
  });

  const { mutate: leaveClub, isPending: leaving } = useMutation({
    mutationFn: () => clubsApi.leave(club!.id),
    onSuccess: () => {
      toast.success('Left the club');
      queryClient.invalidateQueries({ queryKey: ['club', slug] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to leave club'),
  });

  const { data: clubTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['club-member-tasks', club?.id],
    queryFn: () => collaborationApi.tasks(club?.id).then((r) => r.data),
    enabled: !!club?.id && !!user && !isLoading,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status, clubId, completionNote }: { taskId: string; status: string; clubId?: string; completionNote?: string }) =>
      collaborationApi.updateTaskStatus(taskId, status, clubId, completionNote).then((r) => r.data),
    onSuccess: () => {
      toast.success('Task updated');
      queryClient.invalidateQueries({ queryKey: ['club-member-tasks', club?.id] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['president-tasks'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update task'),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!club) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
      <Users className="h-16 w-16 mb-4 opacity-30" />
      <p>Club not found</p>
    </div>
  );

  const isMember = club.members?.some((m: any) => m.userId === user?.id && m.isActive);
  const isPresident = club.presidentId === user?.id;
  const campusColor = getCampusColor(club.campus);
  const visibleTasks = Array.isArray(clubTasks)
    ? clubTasks.filter((task: any) => task.clubId === club.id)
    : [];
  const taskCounts = {
    total: visibleTasks.length,
    pending: visibleTasks.filter((task: any) => task.status === 'PENDING').length,
    inProgress: visibleTasks.filter((task: any) => task.status === 'IN_PROGRESS').length,
    completed: visibleTasks.filter((task: any) => task.status === 'COMPLETED').length,
  };

  const submitCompletedTask = (task: any) => {
    const note = completionDrafts[task.id]?.trim();
    if (!note) {
      toast.error('Add a completion update before submitting');
      return;
    }

    updateTaskMutation.mutate({
      taskId: task.id,
      status: 'COMPLETED',
      clubId: club.id,
      completionNote: note,
    });
  };

  const healthColor = club.healthScore >= 70
    ? 'text-emerald-400 bg-emerald-500/10'
    : club.healthScore >= 40
    ? 'text-amber-400 bg-amber-500/10'
    : 'text-red-400 bg-red-500/10';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Cover */}
        <div
          className="h-40 w-full relative"
          style={{
            background: club.coverImage
              ? undefined
              : `linear-gradient(135deg, ${campusColor}40, #6366F130)`,
          }}
        >
          {club.coverImage && (
            <Image src={club.coverImage} alt={club.name} fill className="object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />

          {/* Status badges */}
          <div className="absolute top-4 right-4 flex gap-2">
            <span className="campus-pill">{club.campus}</span>
            {club.recruitmentOpen && (
              <span className="badge badge-success">🔓 Recruiting</span>
            )}
          </div>
        </div>

        <div className="p-6 -mt-8 relative z-10">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              {/* Logo */}
              <div
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border-4 text-2xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${campusColor}, #6366F1)`, borderColor: '#ffffff' }}
              >
                {club.logo ? (
                  <Image src={club.logo} alt={club.name} width={80} height={80} className="rounded-xl" />
                ) : (
                  club.name?.charAt(0)
                )}
              </div>

              <div className="mb-1">
                <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{club.name}</h1>
                <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: '#64748B' }}>
                  <span>{club.category}</span>
                  <span>·</span>
                  <span>{getCampusLabel(club.campus)}</span>
                  {club.president && (
                    <>
                      <span>·</span>
                      <span>Lead: {club.president.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-1 flex-shrink-0">
              {club.websiteUrl && (
                <a href={club.websiteUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary p-2">
                  <Globe className="h-4 w-4" />
                </a>
              )}
              {club.instagramUrl && (
                <a href={club.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary p-2">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {club.linkedinUrl && (
                <a href={club.linkedinUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary p-2">
                  <Linkedin className="h-4 w-4" />
                </a>
              )}

              {user && !isPresident && (
                isMember ? (
                  <>
                    <Link href={`/student/chats?clubId=${club.id}&clubName=${encodeURIComponent(club.name)}`}>
                      <button className="btn-secondary gap-2">
                        <Activity className="h-4 w-4" />
                        Club Chat
                      </button>
                    </Link>
                    <Link href={`/student/meetings?clubId=${club.id}&clubName=${encodeURIComponent(club.name)}`}>
                      <button className="btn-secondary gap-2">
                        <Calendar className="h-4 w-4" />
                        Meetings
                      </button>
                    </Link>
                    <button
                      onClick={() => leaveClub()}
                      disabled={leaving}
                      className="btn-secondary gap-2"
                    >
                      {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                      Leave
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => joinClub()}
                    disabled={joining}
                    className="btn-primary gap-2"
                  >
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Join Club
                  </button>
                )
              )}

              {isPresident && (
                <>
                  <Link href={`/president/discussions?clubId=${club.id}&clubName=${encodeURIComponent(club.name)}`}>
                    <button className="btn-secondary gap-2">
                      <Activity className="h-4 w-4" />
                      Club Chat
                    </button>
                  </Link>
                  <Link href={`/president/meetings?clubId=${club.id}&clubName=${encodeURIComponent(club.name)}`}>
                    <button className="btn-secondary gap-2">
                      <Calendar className="h-4 w-4" />
                      Meetings
                    </button>
                  </Link>
                  <Link href={`/clubs/${slug}/manage`}>
                    <button className="btn-primary gap-2">
                      <Activity className="h-4 w-4" />
                      Manage
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {club.shortBio && (
            <p className="mt-4 max-w-2xl text-sm" style={{ color: '#475569' }}>{club.shortBio}</p>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Members', value: club._count?.members || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Events Hosted', value: club._count?.events || 0, icon: Calendar, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Total Points', value: club.points.toLocaleString(), icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Health Score', value: `${Math.round(club.healthScore)}/100`, icon: Heart, color: healthColor.split(' ')[0], bg: healthColor.split(' ')[1] },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card"
          >
            <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* About + Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Full description */}
          {club.description && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-3 font-semibold" style={{ color: '#0F172A' }}>About</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#475569' }}>{club.description}</p>
            </div>
          )}

          {/* Upcoming events */}
          {club.events && club.events.length > 0 && (
            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
                  <Calendar className="h-4 w-4 text-primary-400" />
                  Upcoming Events
                </h3>
                <Link href={`/events?club=${club.id}`} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {club.events.slice(0, 4).map((event: any) => (
                  <Link key={event.id} href={`/events/${event.slug}`}>
                    <div className="flex items-center gap-3 rounded-xl p-3 transition-all" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>{event.title}</div>
                        <div className="mt-0.5 text-xs" style={{ color: '#64748B' }}>{formatDate(event.startDateTime)}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Club tasks */}
          {user && (isMember || isPresident) && (
            <div className="card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
                    <ClipboardList className="h-4 w-4 text-primary-400" />
                    Club Tasks
                  </h3>
                  <p className="text-[12px] mt-1" style={{ color: '#64748B' }}>
                    {isPresident ? 'Tasks assigned within this club.' : 'Your assigned tasks inside this club.'}
                  </p>
                </div>
                {!isPresident && (
                  <Link href="/student/tasks" className="text-xs font-semibold flex items-center gap-1" style={{ color: '#2563eb' }}>
                    Open full task view <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total', value: taskCounts.total, color: '#1e40af' },
                  { label: 'Pending', value: taskCounts.pending, color: '#d97706' },
                  { label: 'In Progress', value: taskCounts.inProgress, color: '#7c3aed' },
                  { label: 'Completed', value: taskCounts.completed, color: '#059669' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="text-xl font-extrabold" style={{ color: item.color }}>{item.value}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {tasksLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
                ) : visibleTasks.length === 0 ? (
                  <div className="text-center py-10" style={{ color: '#64748B' }}>
                    <ClipboardList className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                    {isPresident ? 'No tasks created for this club yet.' : 'No tasks assigned to you in this club yet.'}
                  </div>
                ) : visibleTasks.map((task: any) => (
                  <div key={task.id} className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[14px]" style={{ color: '#0F172A' }}>{task.title}</div>
                        <div className="mt-1 flex items-center gap-3 flex-wrap text-[12px]" style={{ color: '#64748B' }}>
                          {task.assignee && <span>Assigned to {task.assignee}</span>}
                          {task.due && <span>Due: {task.due}</span>}
                          <span>Status: {task.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <span className={`badge ${task.priority === 'HIGH' ? 'badge-red' : task.priority === 'MEDIUM' ? 'badge-amber' : 'badge-blue'}`}>
                        {task.priority}
                      </span>
                    </div>

                    {!isPresident && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 flex-wrap">
                        {['PENDING', 'IN_PROGRESS'].map((status) => (
                          <button
                            key={status}
                            className="btn-secondary text-[12px] py-1.5 px-3"
                            style={task.status === status ? { background: '#0F172A', color: '#fff', borderColor: '#0F172A' } : {}}
                            onClick={() => updateTaskMutation.mutate({ taskId: task.id, status, clubId: club.id })}
                            disabled={updateTaskMutation.isPending}
                          >
                            {updateTaskMutation.isPending && task.status !== status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : task.status === status ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                            {status.replace('_', ' ')}
                          </button>
                        ))}
                        </div>
                        <div className="mt-3 rounded-xl p-3" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                          <label className="label">Completion Update</label>
                          <textarea
                            className="input"
                            rows={3}
                            placeholder="Describe what you completed and anything the president should review..."
                            value={completionDrafts[task.id] ?? task.completionNote ?? ''}
                            onChange={(e) => setCompletionDrafts((current) => ({ ...current, [task.id]: e.target.value }))}
                          />
                          {task.completedAt && (
                            <div className="mt-2 text-[11px]" style={{ color: '#64748B' }}>
                              Submitted on {new Date(task.completedAt).toLocaleString()}
                            </div>
                          )}
                          <div className="mt-3">
                            <button
                              className="btn-primary text-[12px] py-1.5 px-3"
                              onClick={() => submitCompletedTask(task)}
                              disabled={updateTaskMutation.isPending}
                            >
                              {updateTaskMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              Submit Completed Task
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {club.achievements && club.achievements.length > 0 && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
                <Award className="h-4 w-4 text-amber-400" />
                Achievements
              </h3>
              <div className="space-y-3">
                {club.achievements.map((achievement: any) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Award className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <div>
                    <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{achievement.title}</div>
                      {achievement.description && (
                        <div className="text-xs text-slate-400 mt-0.5">{achievement.description}</div>
                      )}
                      <div className="text-[11px] text-slate-500 mt-0.5">{formatDate(achievement.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {club.gallery && club.gallery.length > 0 && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: '#0F172A' }}>
                <Camera className="h-4 w-4 text-violet-400" />
                Gallery
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {club.gallery.map((photo: any) => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-slate-700">
                    <img src={photo.imageUrl} alt={photo.caption || ''} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Members sidebar */}
        <div className="space-y-5">
          {/* Board / Leadership */}
          {club.members && club.members.length > 0 && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-4 font-semibold" style={{ color: '#0F172A' }}>Members ({club._count?.members})</h3>
              <div className="space-y-2">
                {club.members.slice(0, 8).map((member: any) => (
                  <div key={member.id} className="flex items-center gap-2.5">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${campusColor}, #6366F1)` }}
                    >
                      {member.user?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium" style={{ color: '#0F172A' }}>{member.user?.name}</div>
                      <div className="text-[11px] text-slate-500">{member.role}</div>
                    </div>
                    {member.role !== 'Member' && (
                      <span className="badge badge-primary text-[10px]">{member.role}</span>
                    )}
                  </div>
                ))}
                {club._count?.members > 8 && (
                  <div className="text-xs text-slate-500 text-center pt-1">
                    +{club._count.members - 8} more members
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Faculty coordinator */}
          {club.faculty && (
            <div className="card rounded-2xl p-5">
              <h3 className="mb-3 font-semibold" style={{ color: '#0F172A' }}>Faculty Coordinator</h3>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary-400">
                  {club.faculty.name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{club.faculty.name}</div>
                  <div className="text-xs text-slate-400">Faculty Advisor</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
