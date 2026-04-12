import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCampusLabel(campus: string): string {
  const labels: Record<string, string> = {
    VELLORE: 'VIT Vellore',
    CHENNAI: 'VIT Chennai',
    AP: 'VIT AP',
    BHOPAL: 'VIT Bhopal',
  };
  return labels[campus] || campus;
}

export function getCampusColor(campus: string): string {
  const colors: Record<string, string> = {
    VELLORE: '#0052CC',
    CHENNAI: '#10B981',
    AP: '#6366F1',
    BHOPAL: '#F59E0B',
  };
  return colors[campus] || '#64748B';
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  try {
    return format(new Date(date), fmt);
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date): string {
  try {
    return format(new Date(date), 'dd MMM yyyy, hh:mm a');
  } catch {
    return '-';
  }
}

export function timeFromNow(date: string | Date): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '-';
  }
}

export function formatPoints(points: number): string {
  if (points >= 1000) return `${(points / 1000).toFixed(1)}k`;
  return points.toString();
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trimEnd() + '...';
}

export function getEventStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'text-slate-400',
    PUBLISHED: 'text-blue-400',
    LIVE: 'text-red-400',
    COMPLETED: 'text-emerald-400',
    CANCELLED: 'text-slate-600',
  };
  return colors[status] || 'text-slate-400';
}

export function formatCurrency(amount: number): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function getRankSuffix(rank: number): string {
  if (rank === 1) return '#1';
  if (rank === 2) return '#2';
  if (rank === 3) return '#3';
  return `#${rank}`;
}

export function isEventLive(startDateTime: string, endDateTime: string): boolean {
  const now = new Date();
  return new Date(startDateTime) <= now && new Date(endDateTime) >= now;
}

export function timeUntilEvent(startDateTime: string): string {
  const diff = new Date(startDateTime).getTime() - Date.now();
  if (diff < 0) return 'Started';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function isEventUpcoming(startDateTime: string): boolean {
  return new Date(startDateTime) > new Date();
}
