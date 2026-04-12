'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Plus, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { clubsApi, collaborationApi } from '../../../lib/api';

const PRIORITY_CFG: Record<string, any> = {
  HIGH: { badge: 'badge-red', label: 'High' },
  MEDIUM: { badge: 'badge-amber', label: 'Medium' },
  LOW: { badge: 'badge-blue', label: 'Low' },
};

const STATUS_FLOW = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

export default function MembersPage() {
  const qc = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [search, setSearch] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', assigneeId: '', priority: 'MEDIUM', due: '' });
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['president-dashboard'],
    queryFn: () => clubsApi.presidentDashboard().then((r) => r.data),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['president-tasks'],
    queryFn: () => collaborationApi.tasks().then((r) => r.data),
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: any) => collaborationApi.createTask(payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Task added');
      setShowTaskForm(false);
      setTaskForm({ title: '', assigneeId: '', priority: 'MEDIUM', due: '' });
      qc.invalidateQueries({ queryKey: ['president-tasks'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to add task'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => collaborationApi.updateTaskStatus(taskId, status).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['president-tasks'] }),
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update task'),
  });

  const members = dashData?.members || [];
  const tasks = tasksData || [];
  const filteredMembers = search
    ? members.filter((member: any) => member.user?.name?.toLowerCase().includes(search.toLowerCase()))
    : members;
  const filteredTasks = tasks.filter((task: any) => statusFilter === 'ALL' || task.status === statusFilter);

  const addTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    const assignee = members.find((member: any) => member.userId === taskForm.assigneeId);
    createTaskMutation.mutate({
      title: taskForm.title.trim(),
      assigneeId: taskForm.assigneeId || undefined,
      assignee: assignee?.user?.name || '',
      priority: taskForm.priority,
      due: taskForm.due || undefined,
    });
  };

  const toggleTaskStatus = (task: any) => {
    const currentIndex = STATUS_FLOW.indexOf(task.status);
    const nextStatus = STATUS_FLOW[(currentIndex + 1) % STATUS_FLOW.length];
    updateTaskMutation.mutate({ taskId: task.id, status: nextStatus });
  };

  const taskCounts = {
    total: tasks.length,
    pending: tasks.filter((task: any) => task.status === 'PENDING').length,
    inProgress: tasks.filter((task: any) => task.status === 'IN_PROGRESS').length,
    completed: tasks.filter((task: any) => task.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>President / Members</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Members and Task Management</h1>
        <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>
          Assign tasks to club members and track their progress.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', val: taskCounts.total, color: '#1e40af' },
              { label: 'Pending', val: taskCounts.pending, color: '#d97706' },
              { label: 'In Progress', val: taskCounts.inProgress, color: '#7c3aed' },
              { label: 'Done', val: taskCounts.completed, color: '#059669' },
            ].map((item) => (
              <div key={item.label} className="card p-3 text-center">
                <div className="text-xl font-extrabold" style={{ color: item.color }}>{item.val}</div>
                <div className="text-[11px] mt-0.5" style={{ color: '#64748B' }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="section-title">Tasks</div>
              <div className="flex items-center gap-2 flex-wrap">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                    style={statusFilter === status ? { background: '#0F172A', color: '#fff' } : { background: '#F1F5F9', color: '#64748B' }}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
                <button className="btn-primary text-[12px] py-2 px-3" onClick={() => setShowTaskForm(!showTaskForm)}>
                  <Plus className="h-3.5 w-3.5" /> Add Task
                </button>
              </div>
            </div>

            {showTaskForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 rounded-xl p-4"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="label">Task Title *</label>
                    <input className="input" placeholder="e.g., Design event banner" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Assign To</label>
                    <select className="input" value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                      <option value="">Unassigned</option>
                      {members.map((member: any) => (
                        <option key={member.id} value={member.userId}>{member.user?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Due Date</label>
                    <input type="date" className="input" value={taskForm.due} onChange={(e) => setTaskForm({ ...taskForm, due: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn-primary text-[12px] py-2" onClick={addTask} disabled={createTaskMutation.isPending}>
                    <CheckCircle className="h-3.5 w-3.5" /> Save Task
                  </button>
                  <button className="btn-secondary text-[12px] py-2" onClick={() => setShowTaskForm(false)}>Cancel</button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {tasksLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-16" />)}</div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#64748B' }}>No tasks yet. Add your first one above.</div>
              ) : filteredTasks.map((task: any) => (
                <div key={task.id} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 flex-shrink-0" disabled={updateTaskMutation.isPending}>
                    {task.status === 'COMPLETED'
                      ? <CheckCircle className="h-5 w-5" style={{ color: '#059669' }} />
                      : <div className="h-5 w-5 rounded-full border-2" style={{ borderColor: '#CBD5E1' }} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium text-[13.5px] ${task.status === 'COMPLETED' ? 'line-through' : ''}`} style={{ color: task.status === 'COMPLETED' ? '#94a3b8' : '#0F172A' }}>
                      {task.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {task.assignee && <span className="text-[12px]" style={{ color: '#64748B' }}>Assigned to {task.assignee}</span>}
                      {task.due && <span className="text-[12px]" style={{ color: '#94a3b8' }}>Due: {task.due}</span>}
                      <span className="text-[12px]" style={{ color: '#64748B' }}>Status: {task.status.replace('_', ' ')}</span>
                    </div>
                    {task.completionNote && (
                      <div className="mt-2 rounded-lg px-3 py-2 text-[12px]" style={{ background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                        <div className="font-semibold mb-1" style={{ color: '#0F172A' }}>Student completion update</div>
                        <div>{task.completionNote}</div>
                        {task.completedAt && (
                          <div className="mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
                            Submitted on {new Date(task.completedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${PRIORITY_CFG[task.priority]?.badge || 'badge-slate'}`}>{task.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Club Members</div>
              <div className="section-subtitle">{members.length} members total</div>
            </div>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
            <input className="input pl-9" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-14" />)}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
              <p className="text-[13px]" style={{ color: '#64748B' }}>No members found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member: any) => (
                <div key={member.id} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 transition-colors cursor-pointer" style={{ border: '1px solid #F1F5F9' }}>
                  <div className="avatar h-9 w-9 text-[12px] flex-shrink-0">
                    {member.user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{member.user?.name}</div>
                    <div className="text-[11px]" style={{ color: '#94a3b8' }}>
                      {member.role || 'Member'} | {member.user?.department || '-'}
                    </div>
                  </div>
                  <div className="text-[12px] font-semibold" style={{ color: '#d97706' }}>{member.user?.points || 0} pts</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
