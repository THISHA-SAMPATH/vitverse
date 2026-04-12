// ─── Enums ────────────────────────────────────────────────────────────────────

export type Campus = 'VELLORE' | 'CHENNAI' | 'AP' | 'BHOPAL';
export type Role = 'STUDENT' | 'EXTERNAL' | 'CLUB_PRESIDENT' | 'FACULTY' | 'SUPER_ADMIN';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type EventVisibility = 'PUBLIC' | 'PRIVATE' | 'INTERNAL';
export type FocStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type BadgeType = 'ATTENDANCE' | 'VOLUNTEER' | 'WINNER' | 'ORGANIZER' | 'MENTOR' | 'STREAK';

// ─── Models ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  regNumber?: string;
  campus?: Campus;
  role: Role;
  avatar?: string;
  bio?: string;
  department?: string;
  year?: number;
  points: number;
  streakDays: number;
  isVerified: boolean;
  isActive: boolean;
  lastActiveAt?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDesc?: string;
  campus: Campus;
  venue?: string;
  posterUrl?: string;
  startDateTime: string;
  endDateTime: string;
  registrationDeadline?: string;
  capacity: number;
  teamSize: number;
  status: EventStatus;
  visibility: EventVisibility;
  tags: string[];
  prizePool?: string;
  entryFee: number;
  certificateEligible: boolean;
  isTeamEvent: boolean;
  hasWaitlist: boolean;
  points: number;
  club?: {
    id: string;
    name: string;
    logo?: string;
  };
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
  _count?: {
    registrations: number;
    attendances?: number;
  };
  createdAt: string;
}

export interface Club {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortBio?: string;
  campus: Campus;
  category: string;
  logo?: string;
  coverImage?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  recruitmentOpen: boolean;
  points: number;
  healthScore: number;
  president?: {
    id: string;
    name: string;
    avatar?: string;
  };
  _count?: {
    members: number;
    events: number;
  };
}

export interface Seat {
  id: string;
  eventId: string;
  seatNumber: string;
  row?: string;
  section?: string;
  status: SeatStatus;
  heldUntil?: string;
}

export interface SeatMap {
  eventId: string;
  seats: Seat[];
  summary: {
    total: number;
    available: number;
    held: number;
    booked: number;
  };
}

export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  seatId?: string;
  waitlisted: boolean;
  checkedIn: boolean;
  qrCode?: string;
  createdAt: string;
}

export interface FocActivity {
  id: string;
  userId: string;
  clubId?: string;
  semester: string;
  activityType: string;
  description?: string;
  proofUrl?: string;
  hours: number;
  credits: number;
  status: FocStatus;
  facultyNote?: string;
  createdAt: string;
  club?: {
    name: string;
    logo?: string;
  };
}

export interface SkillRadar {
  technical: number;
  leadership: number;
  management: number;
  creative: number;
  social: number;
}

export interface Badge {
  id: string;
  type: BadgeType;
  label: string;
  earnedAt: string;
}

export interface Certificate {
  id: string;
  type: string;
  certificateUrl?: string;
  issuedAt: string;
  verified: boolean;
  hash: string;
  event: {
    title: string;
    campus: Campus;
    startDateTime: string;
  };
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  campus: Campus;
  department?: string;
  points: number;
  rank: number;
  events_attended: number;
  certificates: number;
}

export interface ClubLeaderboardEntry {
  id: string;
  name: string;
  logo?: string;
  campus: Campus;
  category: string;
  points: number;
  healthScore: number;
  rank: number;
  member_count: number;
  events_hosted: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

export interface Announcement {
  id: string;
  campus?: Campus;
  title: string;
  content: string;
  pinned: boolean;
  expiresAt?: string;
  createdAt: string;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
