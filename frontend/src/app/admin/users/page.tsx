'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../lib/api';
import { getCampusLabel } from '../../../lib/utils';

function SkeletonRow() {
  return <tr>{Array.from({ length: 8 }).map((_, i) => <td key={i}><div className="skeleton h-5 w-full" /></td>)}</tr>;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  CLUB_PRESIDENT: 'President',
  FACULTY: 'Faculty',
  SUPER_ADMIN: 'Admin',
  EXTERNAL: 'External',
};

const ROLE_BADGE: Record<string, string> = {
  STUDENT: 'badge-blue',
  CLUB_PRESIDENT: 'badge-amber',
  FACULTY: 'badge-purple',
  SUPER_ADMIN: 'badge-red',
  EXTERNAL: 'badge-slate',
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [campus, setCampus] = useState('ALL');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, campus, role, page],
    queryFn: () => adminApi.users({
      search,
      campus: campus === 'ALL' ? undefined : campus,
      role: role === 'ALL' ? undefined : role,
      page,
      limit: 20,
    }).then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUser(id).then((r) => r.data),
    onSuccess: () => {
      toast.success('User status updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Failed to update user'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin / Users</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Manage Users</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>View, search, and manage platform users across campuses.</p>
        </div>
        {pagination && <span className="badge badge-slate">{pagination.total} total users</span>}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input className="input pl-9" placeholder="Search by name, email, reg no..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input" style={{ width: 160 }} value={campus} onChange={(e) => setCampus(e.target.value)}>
          <option value="ALL">All Campuses</option>
          <option value="VELLORE">VIT Vellore</option>
          <option value="CHENNAI">VIT Chennai</option>
          <option value="AP">VIT AP</option>
          <option value="BHOPAL">VIT Bhopal</option>
        </select>
        <select className="input" style={{ width: 140 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="ALL">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="CLUB_PRESIDENT">President</option>
          <option value="FACULTY">Faculty</option>
          <option value="SUPER_ADMIN">Admin</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Reg No.</th>
                <th>Campus</th>
                <th>Department</th>
                <th>Role</th>
                <th>Points</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />) :
                users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                      <p className="text-[13px]" style={{ color: '#64748B' }}>No users found matching your search.</p>
                    </td>
                  </tr>
                ) : users.map((user: any) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="avatar h-8 w-8 text-[11px]" style={{ background: 'linear-gradient(135deg, #0F172A, #1e40af)', fontSize: 11 }}>
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{user.name}</div>
                          <div className="text-[11px]" style={{ color: '#94a3b8' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-[13px] font-mono" style={{ color: '#64748B' }}>{user.regNumber || '-'}</td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{getCampusLabel(user.campus) || '-'}</td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{user.department || '-'}</td>
                    <td><span className={`badge ${ROLE_BADGE[user.role] || 'badge-slate'}`}>{ROLE_LABELS[user.role] || user.role}</span></td>
                    <td className="text-[13px] font-semibold" style={{ color: '#d97706' }}>{user.points || 0}</td>
                    <td>
                      <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`text-[11px] py-1.5 px-3 rounded-lg font-semibold transition-colors ${user.isActive ? 'hover:bg-red-50' : 'hover:bg-green-50'}`}
                        style={{ color: user.isActive ? '#ef4444' : '#059669', background: user.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(5,150,105,0.08)' }}
                        onClick={() => toggleMutation.mutate(user.id)}
                      >
                        {user.isActive ? <><UserX className="h-3 w-3 inline mr-1" />Suspend</> : <><UserCheck className="h-3 w-3 inline mr-1" />Activate</>}
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid #E2E8F0' }}>
            <span className="text-[13px]" style={{ color: '#64748B' }}>
              Page {pagination.page} of {pagination.pages} | {pagination.total} users
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary text-[12px] py-2 px-3" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn-secondary text-[12px] py-2 px-3" disabled={pagination.page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
