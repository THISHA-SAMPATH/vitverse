'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { collaborationApi, usersApi } from '../../../lib/api';

const STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

export default function StudentTasksPage() {
  const qc = useQueryClient();
  const [clubId, setClubId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [completionDrafts, setCompletionDrafts] = useState<Record<string, string>>({});

  const { data: myClubs } = useQuery({
    queryKey: ['student-task-clubs'],
    queryFn: () => usersApi.myClubs().then((r) => r.data),
  });

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['student-tasks', clubId],
    queryFn: () => collaborationApi.tasks(clubId || undefined).then((r) => r.data),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status, targetClubId, completionNote }: { taskId: string; status: string; targetClubId?: string; completionNote?: string }) =>
      collaborationApi.updateTaskStatus(taskId, status, targetClubId, completionNote).then((r) => r.data),
    onSuccess: () => {
      toast.success('Task updated');
      qc.invalidateQueries({ queryKey: ['student-tasks'] });
      qc.invalidateQueries({ queryKey: ['president-tasks'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update task'),
  });

  const tasks = useMemo(() => (Array.isArray(tasksData) ? tasksData : []), [tasksData]);
  const filteredTasks = useMemo(
    () => tasks.filter((task: any) => statusFilter === 'ALL' || task.status === statusFilter),
    [tasks, statusFilter],
  );

  const counts = {
    total: tasks.length,
    pending: tasks.filter((task: any) => task.status === 'PENDING').length,
    inProgress: tasks.filter((task: any) => task.status === 'IN_PROGRESS').length,
    completed: tasks.filter((task: any) => task.status === 'COMPLETED').length,
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
      targetClubId: task.clubId,
      completionNote: note,
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Student / Club Tasks</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Assigned Tasks</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
          View the work assigned to you by club presidents and update your progress.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Total', val: counts.total, color: '#1e40af' },
          { label: 'Pending', val: counts.pending, color: '#d97706' },
          { label: 'In Progress', val: counts.inProgress, color: '#7c3aed' },
          { label: 'Completed', val: counts.completed, color: '#059669' },
        ].map((item) => (
          <div key={item.label} className="stat-card">
            <div className="text-2xl font-extrabold" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div>
          <label className="label">Club</label>
          <select className="input min-w-[220px]" value={clubId} onChange={(e) => setClubId(e.target.value)}>
            <option value="">All my clubs</option>
            {(myClubs || []).map((membership: any) => (
              <option key={membership.club.id} value={membership.club.id}>
                {membership.club.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-6 flex-wrap">
          {['ALL', ...STATUS_OPTIONS].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={statusFilter === status ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#64748B' }}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="section-title mb-4">My Task List</div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-20" />)}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#64748B' }}>
              <ClipboardList className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
              No tasks assigned to you yet.
            </div>
          ) : filteredTasks.map((task: any) => (
            <div key={task.id} className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[14px]" style={{ color: '#0F172A' }}>{task.title}</div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap text-[12px]" style={{ color: '#64748B' }}>
                    {task.clubName && <span>{task.clubName}</span>}
                    {task.due && <span>Due: {task.due}</span>}
                    <span>Priority: {task.priority}</span>
                  </div>
                </div>
                <span className={`badge ${
                  task.priority === 'HIGH' ? 'badge-red' : task.priority === 'MEDIUM' ? 'badge-amber' : 'badge-blue'
                }`}>
                  {task.priority}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                {['PENDING', 'IN_PROGRESS'].map((status) => (
                  <button
                    key={status}
                    className="btn-secondary text-[12px] py-1.5 px-3"
                    style={task.status === status ? { background: '#0F172A', color: '#fff', borderColor: '#0F172A' } : {}}
                    onClick={() => updateTaskMutation.mutate({ taskId: task.id, status, targetClubId: task.clubId })}
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending && task.status !== status ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : task.status === status ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-xl p-3" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
                <label className="label">Completion Update</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Describe what you finished, links shared, blockers cleared, or handoff details..."
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
          ))}
        </div>
      </div>
    </div>
  );
}
