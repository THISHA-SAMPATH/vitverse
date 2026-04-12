'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Search, Star, TrendingUp, Globe, ChevronRight } from 'lucide-react';
import { clubsApi } from '../../../lib/api';
import { getCampusLabel } from '../../../lib/utils';
import Link from 'next/link';

function SkeletonRow() {
  return <tr>{Array.from({ length: 7 }).map((_, i) => <td key={i}><div className="skeleton h-5 w-full" /></td>)}</tr>;
}

export default function AdminClubsPage() {
  const [search, setSearch] = useState('');
  const [campus, setCampus] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clubs', search, campus],
    queryFn: () => clubsApi.list({ search, campus: campus === 'ALL' ? undefined : campus, limit: 50 }).then(r => r.data),
  });

  const clubs = data?.data || data || [];
  const filtered = search
    ? clubs.filter((c: any) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase()))
    : clubs;

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>Admin · Clubs</div>
          <h1 className="text-2xl font-extrabold" style={{ color: '#0F172A' }}>Manage Clubs</h1>
          <p className="text-[13.5px] mt-1" style={{ color: '#64748B' }}>View all registered clubs across campuses, track health scores and activity.</p>
        </div>
        <span className="badge badge-slate">{filtered.length} clubs</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Clubs', val: clubs.length, color: '#1e40af' },
          { label: 'Active Clubs', val: clubs.filter((c: any) => c.healthScore > 50).length, color: '#059669' },
          { label: 'Recruiting Now', val: clubs.filter((c: any) => c.recruitmentOpen).length, color: '#d97706' },
          { label: 'Avg Health Score', val: clubs.length ? Math.round(clubs.reduce((s: number, c: any) => s + (c.healthScore || 0), 0) / clubs.length) + '%' : '—', color: '#7c3aed' },
        ].map(item => (
          <div key={item.label} className="stat-card">
            <div className="text-2xl font-extrabold" style={{ color: item.color }}>{item.val}</div>
            <div className="text-[13px] mt-1" style={{ color: '#64748B' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94a3b8' }} />
          <input className="input pl-9" placeholder="Search clubs..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 160 }} value={campus} onChange={e => setCampus(e.target.value)}>
          <option value="ALL">All Campuses</option>
          <option value="VELLORE">VIT Vellore</option>
          <option value="CHENNAI">VIT Chennai</option>
          <option value="AP">VIT AP</option>
          <option value="BHOPAL">VIT Bhopal</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead>
              <tr>
                <th>Club</th>
                <th>Category</th>
                <th>Campus</th>
                <th>Members</th>
                <th>Events</th>
                <th>Health Score</th>
                <th>Recruiting</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />) :
                filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Users className="h-8 w-8 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                      <p className="text-[13px]" style={{ color: '#64748B' }}>No clubs found.</p>
                    </td>
                  </tr>
                ) : filtered.map((club: any) => (
                  <tr key={club.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        {club.logo ? (
                          <img src={club.logo} alt={club.name} className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="avatar h-8 w-8 text-[11px] rounded-lg flex-shrink-0">{club.name?.charAt(0)}</div>
                        )}
                        <div>
                          <div className="font-semibold text-[13px]" style={{ color: '#0F172A' }}>{club.name}</div>
                          {club.president && <div className="text-[11px]" style={{ color: '#94a3b8' }}>Pres: {club.president.name}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className="tag">{club.category}</span></td>
                    <td className="text-[13px]" style={{ color: '#64748B' }}>{getCampusLabel(club.campus)}</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{club._count?.members || 0}</td>
                    <td className="text-[13px] font-semibold" style={{ color: '#0F172A' }}>{club._count?.events || 0}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 progress-bar" style={{ width: 60 }}>
                          <div className="progress-fill" style={{
                            width: `${club.healthScore || 0}%`,
                            background: (club.healthScore || 0) > 70 ? '#059669' : (club.healthScore || 0) > 40 ? '#d97706' : '#ef4444'
                          }} />
                        </div>
                        <span className="text-[12px] font-semibold w-10 text-right" style={{ color: '#0F172A' }}>{club.healthScore || 0}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${club.recruitmentOpen ? 'badge-green' : 'badge-slate'}`}>
                        {club.recruitmentOpen ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/clubs/${club.slug}`}>
                        <button className="btn-ghost text-[12px] py-1.5 px-2">
                          View <ChevronRight className="h-3.5 w-3.5 inline" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
