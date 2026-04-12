import {
  PrismaClient, Campus, Role, EventStatus, EventVisibility,
  SessionStatus, BookingStatus, PaymentStatus, FocStatus, BadgeType, SeatType
} from '@prisma/client';
import bcrypt = require('bcryptjs');
import * as QRCode from 'qrcode';

const prisma = new PrismaClient();

const d = (days: number) => new Date(Date.now() + days * 86400000);

async function main() {
  console.log('\n🌱 Seeding VITVerse v2 database...\n');

  // ── 1. Campus Info ─────────────────────────────────────────
  const campuses = await Promise.all([
    prisma.campusInfo.upsert({ where: { campus: Campus.VELLORE }, update: {},
      create: { code: 'VEL', campus: Campus.VELLORE, displayName: 'VIT Vellore', city: 'Vellore', state: 'Tamil Nadu', contactEmail: 'vellore@vit.ac.in', contactPhone: '+91-416-220-2020' } }),
    prisma.campusInfo.upsert({ where: { campus: Campus.CHENNAI }, update: {},
      create: { code: 'CHN', campus: Campus.CHENNAI, displayName: 'VIT Chennai', city: 'Chennai', state: 'Tamil Nadu', contactEmail: 'chennai@vit.ac.in', contactPhone: '+91-44-3993-1555' } }),
    prisma.campusInfo.upsert({ where: { campus: Campus.AP }, update: {},
      create: { code: 'AP', campus: Campus.AP, displayName: 'VIT AP', city: 'Amaravati', state: 'Andhra Pradesh', contactEmail: 'ap@vit.ac.in', contactPhone: '+91-863-123-4567' } }),
    prisma.campusInfo.upsert({ where: { campus: Campus.BHOPAL }, update: {},
      create: { code: 'BPL', campus: Campus.BHOPAL, displayName: 'VIT Bhopal', city: 'Bhopal', state: 'Madhya Pradesh', contactEmail: 'bhopal@vit.ac.in', contactPhone: '+91-755-123-4567' } }),
  ]);
  console.log('✅ Campus info seeded');

  // ── 2. Venues ───────────────────────────────────────────────
  const venueData = [
    // Vellore
    { name: 'Main Auditorium', campus: Campus.VELLORE, campusId: campuses[0].id, seatingCapacity: 600, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Seminar Hall A', campus: Campus.VELLORE, campusId: campuses[0].id, seatingCapacity: 120, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Open Air Stage', campus: Campus.VELLORE, campusId: campuses[0].id, seatingCapacity: 900, hasProjector: false, hasAC: false, hasWifi: false },
    { name: 'Innovation Hub', campus: Campus.VELLORE, campusId: campuses[0].id, seatingCapacity: 200, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Sports Complex', campus: Campus.VELLORE, campusId: campuses[0].id, seatingCapacity: 500, hasProjector: false, hasAC: false, hasWifi: false },
    { name: 'Tech Park Lab', campus: Campus.VELLORE, campusId: campuses[0].id, seatingCapacity: 160, hasProjector: true, hasAC: true, hasWifi: true },
    // Chennai
    { name: 'Anna Auditorium', campus: Campus.CHENNAI, campusId: campuses[1].id, seatingCapacity: 650, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Design Studio', campus: Campus.CHENNAI, campusId: campuses[1].id, seatingCapacity: 100, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Research Block', campus: Campus.CHENNAI, campusId: campuses[1].id, seatingCapacity: 150, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Conference Hall B', campus: Campus.CHENNAI, campusId: campuses[1].id, seatingCapacity: 200, hasProjector: true, hasAC: true, hasWifi: true },
    // AP
    { name: 'AP Auditorium', campus: Campus.AP, campusId: campuses[2].id, seatingCapacity: 450, hasProjector: true, hasAC: true, hasWifi: true },
    { name: 'Incubation Centre', campus: Campus.AP, campusId: campuses[2].id, seatingCapacity: 180, hasProjector: true, hasAC: true, hasWifi: true },
    // Bhopal
    { name: 'Bhopal Tech Centre', campus: Campus.BHOPAL, campusId: campuses[3].id, seatingCapacity: 350, hasProjector: true, hasAC: true, hasWifi: false },
    { name: 'Mechatronics Lab', campus: Campus.BHOPAL, campusId: campuses[3].id, seatingCapacity: 80, hasProjector: true, hasAC: false, hasWifi: true },
    { name: 'Bhopal Seminar Room', campus: Campus.BHOPAL, campusId: campuses[3].id, seatingCapacity: 120, hasProjector: true, hasAC: true, hasWifi: true },
  ];

  const venues: any[] = [];
  for (const v of venueData) {
    const venue = await prisma.venue.upsert({
      where: { name_campus: { name: v.name, campus: v.campus } },
      update: {},
      create: v,
    });
    venues.push(venue);
  }
  console.log('✅ Venues seeded:', venues.length);

  // ── 3. Event Categories ─────────────────────────────────────
  const categories = await Promise.all([
    prisma.eventCategory.upsert({ where: { name: 'Technology' }, update: {}, create: { name: 'Technology', description: 'Hackathons, coding contests, tech talks', color: '#0052CC' } }),
    prisma.eventCategory.upsert({ where: { name: 'Cultural' }, update: {}, create: { name: 'Cultural', description: 'Music, drama, dance performances', color: '#8B5CF6' } }),
    prisma.eventCategory.upsert({ where: { name: 'Sports' }, update: {}, create: { name: 'Sports', description: 'Inter-campus sports tournaments', color: '#10B981' } }),
    prisma.eventCategory.upsert({ where: { name: 'Workshop' }, update: {}, create: { name: 'Workshop', description: 'Skill-building hands-on workshops', color: '#F59E0B' } }),
    prisma.eventCategory.upsert({ where: { name: 'Seminar' }, update: {}, create: { name: 'Seminar', description: 'Guest lectures and academic seminars', color: '#6366F1' } }),
    prisma.eventCategory.upsert({ where: { name: 'Innovation' }, update: {}, create: { name: 'Innovation', description: 'Startup pitches, idea contests', color: '#EF4444' } }),
    prisma.eventCategory.upsert({ where: { name: 'Design' }, update: {}, create: { name: 'Design', description: 'UX, graphic design, creative sprints', color: '#EC4899' } }),
    prisma.eventCategory.upsert({ where: { name: 'Entrepreneurship' }, update: {}, create: { name: 'Entrepreneurship', description: 'Business plan competitions and networking', color: '#F97316' } }),
    prisma.eventCategory.upsert({ where: { name: 'Cybersecurity' }, update: {}, create: { name: 'Cybersecurity', description: 'CTF, ethical hacking, security workshops', color: '#14B8A6' } }),
    prisma.eventCategory.upsert({ where: { name: 'Wellness' }, update: {}, create: { name: 'Wellness', description: 'Mental health, mindfulness, well-being', color: '#84CC16' } }),
  ]);
  console.log('✅ Categories seeded');

  // ── 4. Users ─────────────────────────────────────────────────
  const hash = await bcrypt.hash('Test@1234', 12);

  const superAdmin = await prisma.user.upsert({ where: { email: 'admin@vitverse.in' }, update: {},
    create: { email: 'admin@vitverse.in', name: 'VITVerse Admin', passwordHash: hash, role: Role.SUPER_ADMIN, isVerified: true, points: 9999 } });

  const faculty = await prisma.user.upsert({ where: { email: 'faculty@vit.ac.in' }, update: {},
    create: { email: 'faculty@vit.ac.in', name: 'Dr. Ramesh Kumar', passwordHash: hash, campus: Campus.VELLORE, role: Role.FACULTY, department: 'Computer Science', isVerified: true, points: 500 } });

  const president = await prisma.user.upsert({ where: { email: 'president@vit.ac.in' }, update: {},
    create: { email: 'president@vit.ac.in', name: 'Arjun Sharma', passwordHash: hash, campus: Campus.VELLORE, role: Role.CLUB_PRESIDENT, department: 'CSE', regNumber: '22BCE1001', year: 3, isVerified: true, points: 1850 } });

  const students = await Promise.all([
    prisma.user.upsert({ where: { email: 'rahul@vit.ac.in' }, update: {}, create: { email: 'rahul@vit.ac.in', name: 'Rahul Verma', passwordHash: hash, campus: Campus.VELLORE, role: Role.STUDENT, department: 'ECE', regNumber: '22BCE1100', year: 2, isVerified: true, points: 840 } }),
    prisma.user.upsert({ where: { email: 'priya@vit.ac.in' }, update: {}, create: { email: 'priya@vit.ac.in', name: 'Priya Nair', passwordHash: hash, campus: Campus.CHENNAI, role: Role.STUDENT, department: 'IT', regNumber: '22BIT0042', year: 2, isVerified: true, points: 1100 } }),
    prisma.user.upsert({ where: { email: 'akash@vitap.ac.in' }, update: {}, create: { email: 'akash@vitap.ac.in', name: 'Akash Reddy', passwordHash: hash, campus: Campus.AP, role: Role.STUDENT, department: 'Mechanical', regNumber: '22BME0030', year: 3, isVerified: true, points: 670 } }),
    prisma.user.upsert({ where: { email: 'sneha@vitbhopal.ac.in' }, update: {}, create: { email: 'sneha@vitbhopal.ac.in', name: 'Sneha Gupta', passwordHash: hash, campus: Campus.BHOPAL, role: Role.STUDENT, department: 'Civil', regNumber: '22BCE2200', year: 2, isVerified: true, points: 520 } }),
    prisma.user.upsert({ where: { email: 'aarav@vitstudent.ac.in' }, update: {}, create: { email: 'aarav@vitstudent.ac.in', name: 'Aarav Sharma', passwordHash: hash, campus: Campus.VELLORE, role: Role.STUDENT, department: 'CSE', regNumber: '24BCE001', year: 1, isVerified: true, points: 320 } }),
  ]);
  console.log('✅ Users seeded');

  // ── 5. Clubs ─────────────────────────────────────────────────
  const clubs = await Promise.all([
    prisma.club.upsert({ where: { slug: 'iste-vellore' }, update: {},
      create: { name: 'ISTE VIT', slug: 'iste-vellore', campus: Campus.VELLORE, category: 'Technology', shortBio: 'Indian Society for Technical Education - VIT Vellore Chapter', description: 'ISTE VIT is one of the most prestigious technical clubs at VIT Vellore, organizing hackathons, workshops, and industry connects.', presidentId: president.id, facultyId: faculty.id, recruitmentOpen: true, points: 2400, healthScore: 82 } }),
    prisma.club.upsert({ where: { slug: 'pulse-cultural-collective' }, update: {},
      create: { name: 'Pulse Cultural Collective', slug: 'pulse-cultural-collective', campus: Campus.CHENNAI, category: 'Cultural', shortBio: 'Performance, production, and campus festival experiences at VIT Chennai.', description: 'Pulse Cultural Collective curates stage productions, music showcases, dance crews, and signature cultural experiences across VIT Chennai.', recruitmentOpen: true, points: 1980, healthScore: 78 } }),
    prisma.club.upsert({ where: { slug: 'ignite-entrepreneurs-ap' }, update: {},
      create: { name: 'Ignite Entrepreneurs', slug: 'ignite-entrepreneurs-ap', campus: Campus.AP, category: 'Entrepreneurship', shortBio: 'Startup-minded builders and founders from VIT AP.', description: 'Ignite Entrepreneurs runs pitch nights, founder circles, startup bootcamps, and product validation sessions for student builders at VIT AP.', recruitmentOpen: true, points: 1725, healthScore: 75 } }),
    prisma.club.upsert({ where: { slug: 'roboverse-bhopal' }, update: {},
      create: { name: 'RoboVerse', slug: 'roboverse-bhopal', campus: Campus.BHOPAL, category: 'Technology', shortBio: 'Robotics, embedded systems, and autonomous builds at VIT Bhopal.', description: 'RoboVerse focuses on robotics competitions, embedded systems workshops, and prototype showcases that connect mechanical, electronics, and software students.', recruitmentOpen: true, points: 1640, healthScore: 80 } }),
    prisma.club.upsert({ where: { slug: 'design-lab-vellore' }, update: {},
      create: { name: 'Design Lab', slug: 'design-lab-vellore', campus: Campus.VELLORE, category: 'Design', shortBio: 'Design systems, UI/UX, branding, and creative product thinking.', description: 'Design Lab hosts UI critique sessions, product design sprints, and branding workshops for students who want to build better interfaces and stories.', recruitmentOpen: true, points: 1535, healthScore: 74 } }),
  ]);
  const club = clubs[0];
  console.log('Clubs seeded:', clubs.length);
  await Promise.all([
    prisma.clubMember.upsert({
      where: { userId_clubId: { userId: students[0].id, clubId: clubs[0].id } },
      update: { isActive: true, role: 'Core Member' },
      create: { userId: students[0].id, clubId: clubs[0].id, role: 'Core Member' },
    }),
    prisma.clubMember.upsert({
      where: { userId_clubId: { userId: students[1].id, clubId: clubs[1].id } },
      update: { isActive: true, role: 'Performer' },
      create: { userId: students[1].id, clubId: clubs[1].id, role: 'Performer' },
    }),
    prisma.clubMember.upsert({
      where: { userId_clubId: { userId: students[2].id, clubId: clubs[2].id } },
      update: { isActive: true, role: 'Builder' },
      create: { userId: students[2].id, clubId: clubs[2].id, role: 'Builder' },
    }),
    prisma.clubMember.upsert({
      where: { userId_clubId: { userId: students[3].id, clubId: clubs[3].id } },
      update: { isActive: true, role: 'Lead Member' },
      create: { userId: students[3].id, clubId: clubs[3].id, role: 'Lead Member' },
    }),
    prisma.clubMember.upsert({
      where: { userId_clubId: { userId: students[4].id, clubId: clubs[4].id } },
      update: { isActive: true, role: 'Design Fellow' },
      create: { userId: students[4].id, clubId: clubs[4].id, role: 'Design Fellow' },
    }),
  ]);
  console.log('Club memberships seeded');

  // ── 6. Achievements ──────────────────────────────────────────
  const achievementDefs = [
    { key: 'FIRST_BOOKING', name: 'First Steps', description: 'Made your first event booking!', icon: '🎟️', points: 50, category: 'booking' },
    { key: 'FIVE_BOOKINGS', name: 'Event Enthusiast', description: 'Booked 5 events on VITVerse.', icon: '🌟', points: 100, category: 'booking' },
    { key: 'TEN_BOOKINGS', name: 'Campus Legend', description: 'Booked 10 events — you are a VIT legend!', icon: '👑', points: 200, category: 'booking' },
    { key: 'FIRST_PAYMENT', name: 'Paid It Forward', description: 'Completed your first paid event booking.', icon: '💳', points: 75, category: 'booking' },
    { key: 'EARLY_BIRD', name: 'Early Bird', description: 'Booked within 24 hours of an event going live.', icon: '🐦', points: 30, category: 'special' },
    { key: 'PROFILE_COMPLETE', name: 'Identity Confirmed', description: 'Completed your full profile.', icon: '✅', points: 25, category: 'social' },
    { key: 'VETERAN', name: 'VIT Veteran', description: 'Attended your first event — QR scanned at venue.', icon: '🎖️', points: 150, category: 'attendance' },
    { key: 'TEAM_PLAYER', name: 'Team Player', description: 'Registered as part of a team.', icon: '🤝', points: 40, category: 'social' },
    { key: 'NIGHT_OWL', name: 'Night Owl', description: 'Booked an event between midnight and 6 AM.', icon: '🦉', points: 20, category: 'special' },
    { key: 'STREAK_7', name: 'Weekly Warrior', description: 'Active on VITVerse for 7 days in a row.', icon: '🔥', points: 60, category: 'streak' },
    { key: 'STREAK_30', name: 'Monthly Master', description: 'Active for 30 days straight.', icon: '💎', points: 250, category: 'streak' },
    { key: 'CROSS_CAMPUS', name: 'Campus Explorer', description: 'Attended events at 2 different VIT campuses.', icon: '🗺️', points: 120, category: 'special' },
    { key: 'WINNER', name: 'Champion', description: 'Won first place at a VIT event.', icon: '🏆', points: 300, category: 'achievement' },
    { key: 'VOLUNTEER', name: 'Volunteer Hero', description: 'Volunteered at 3 or more events.', icon: '🦸', points: 100, category: 'social' },
  ];

  for (const def of achievementDefs) {
    await prisma.achievement.upsert({ where: { key: def.key }, update: {}, create: def });
  }
  console.log('✅ Achievements seeded');

  // ── 7. Events (25 rich events across all campuses) ─────────
  type EventInput = {
    title: string; slug: string; description: string; shortDesc: string;
    campus: Campus; campusId: string; categoryId: string; bannerUrl: string;
    status: EventStatus; isFree: boolean; ticketPrice: number;
    registrationStart: Date; registrationEnd: Date; maxRegistrations: number;
    tags: string[]; prizePool?: string; creatorId: string; clubId?: string;
    points: number; certificateEligible: boolean; isTeamEvent: boolean; teamSize: number; hasWaitlist: boolean; visibility: EventVisibility;
  };

  const eventInputs: EventInput[] = [
    // ─ VELLORE ──────────────────────────────────────────────────
    {
      title: 'HackVIT 2026 — 36H Hackathon', slug: 'hackvit-2026',
      description: '36-hour hackathon with teams from 100+ colleges. Problem statements from Google, Microsoft, and ISRO. ₹2L prize pool, internship offers, and product incubation support. Build something that matters.',
      shortDesc: '36-hour hackathon — ₹2L prize pool, industry problem statements.',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[0].id,
      bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(-3), registrationEnd: d(15), maxRegistrations: 600,
      tags: ['hackathon', 'coding', 'AI', 'prize', 'competition'], prizePool: '₹2,00,000',
      creatorId: president.id, clubId: club.id, points: 50, certificateEligible: true,
      isTeamEvent: true, teamSize: 4, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Riviera 2026 — Cultural Festival', slug: 'riviera-2026',
      description: 'VIT\'s iconic annual cultural extravaganza. Music, dance, drama, literary events, food stalls, and performances by national artists. 5000+ attendees, 200+ events, 3 days of pure celebration.',
      shortDesc: 'Annual cultural extravaganza — 5000+ attendees, 3 days.',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[1].id,
      bannerUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(-1), registrationEnd: d(20), maxRegistrations: 900,
      tags: ['cultural', 'music', 'dance', 'drama', 'fest'],
      creatorId: president.id, points: 30, certificateEligible: false,
      isTeamEvent: false, teamSize: 1, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Innovation Summit 2026', slug: 'innovation-summit-2026',
      description: 'Pitch your startup idea to a panel of angel investors and VCs. ₹1L funding grants, co-working space for 6 months, and mentorship from alumni founders. Prior prototype optional but preferred.',
      shortDesc: 'Pitch to investors — ₹1L funding, mentorship for top teams.',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[5].id,
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 200,
      registrationStart: d(0), registrationEnd: d(18), maxRegistrations: 200,
      tags: ['innovation', 'startup', 'pitch', 'funding', 'VC'], prizePool: '₹1,00,000',
      creatorId: president.id, points: 40, certificateEligible: true,
      isTeamEvent: true, teamSize: 3, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Python & Data Science Bootcamp', slug: 'python-ds-bootcamp-2026',
      description: 'Intensive 2-day bootcamp covering Python fundamentals, data wrangling with Pandas, visualization with Matplotlib, and intro to machine learning with scikit-learn. Hands-on labs at every step.',
      shortDesc: 'Beginner-friendly Python & ML bootcamp — certification included.',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[3].id,
      bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 350,
      registrationStart: d(0), registrationEnd: d(10), maxRegistrations: 120,
      tags: ['python', 'data science', 'ML', 'bootcamp', 'workshop'],
      creatorId: president.id, clubId: club.id, points: 25, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Global Youth Summit 2026', slug: 'global-youth-summit-2026',
      description: 'International summit bringing together delegates from 30+ countries to discuss technology, climate, and governance. Full-day event with keynotes, breakout sessions, and a gala dinner.',
      shortDesc: 'International summit — 30+ countries, 500+ delegates.',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[4].id,
      bannerUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 1200,
      registrationStart: d(0), registrationEnd: d(25), maxRegistrations: 600,
      tags: ['summit', 'international', 'leadership', 'diplomacy', 'global'],
      creatorId: president.id, points: 35, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Inter-Campus Sports Championship', slug: 'sports-championship-2026',
      description: 'Annual inter-campus sports championships covering cricket, football, badminton, chess, and athletics. Represent your campus and win the rolling trophy. Open to all VIT students.',
      shortDesc: 'Annual inter-campus sports — represent your campus!',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[2].id,
      bannerUrl: 'https://images.unsplash.com/photo-1540747913346-19378d07c12a?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(30), maxRegistrations: 500,
      tags: ['sports', 'cricket', 'football', 'badminton', 'athletics'],
      creatorId: president.id, points: 30, certificateEligible: true,
      isTeamEvent: true, teamSize: 11, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Design Thinking Workshop', slug: 'design-thinking-workshop',
      description: 'Learn the 5 stages of Design Thinking — Empathize, Define, Ideate, Prototype, Test. Work on real problems with UX mentors from top product companies. Portfolio-ready outcome.',
      shortDesc: 'Design Thinking with industry mentors — portfolio-ready.',
      campus: Campus.VELLORE, campusId: campuses[0].id, categoryId: categories[6].id,
      bannerUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 250,
      registrationStart: d(0), registrationEnd: d(8), maxRegistrations: 80,
      tags: ['design', 'UX', 'Figma', 'workshop', 'product'],
      creatorId: president.id, points: 20, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },

    // ─ CHENNAI ────────────────────────────────────────────────
    {
      title: 'AI & Data Science Conclave', slug: 'ai-data-conclave-chennai',
      description: 'Deep dives into AI, ML, and data-driven innovation with industry practitioners. Features hands-on labs, panel discussions, live model demos, and networking dinner with recruiters from top tech companies.',
      shortDesc: 'AI/ML deep dives — industry talks, hands-on labs, recruiter dinner.',
      campus: Campus.CHENNAI, campusId: campuses[1].id, categoryId: categories[0].id,
      bannerUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(12), maxRegistrations: 300,
      tags: ['AI', 'ML', 'data science', 'conclave', 'networking'],
      creatorId: superAdmin.id, points: 30, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Entrepreneurship Summit — Chennai', slug: 'entrepreneurship-summit-chennai',
      description: 'Full-day summit with startup founders, VCs, and corporate innovation leads. Panel on fundraising, product-market fit, and scaling. Lunch and networking included. Case studies from successful alumni.',
      shortDesc: 'Full-day startup summit — founders, VCs, and alumni case studies.',
      campus: Campus.CHENNAI, campusId: campuses[1].id, categoryId: categories[7].id,
      bannerUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 400,
      registrationStart: d(0), registrationEnd: d(22), maxRegistrations: 200,
      tags: ['entrepreneurship', 'startup', 'VC', 'networking', 'summit'],
      creatorId: superAdmin.id, points: 35, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Full-Stack Web Dev Bootcamp', slug: 'fullstack-bootcamp-chennai',
      description: 'Build a production-ready full-stack app from scratch using React, Node.js, Express, and PostgreSQL. Mentors at every table. Docker deployment. Beginner-friendly, bring your laptop.',
      shortDesc: 'Build a real app — React + Node + PostgreSQL, full deployment.',
      campus: Campus.CHENNAI, campusId: campuses[1].id, categoryId: categories[3].id,
      bannerUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 300,
      registrationStart: d(0), registrationEnd: d(14), maxRegistrations: 80,
      tags: ['web dev', 'React', 'Node.js', 'workshop', 'full-stack'],
      creatorId: superAdmin.id, points: 25, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Chennai Cultural Night', slug: 'chennai-cultural-night-2026',
      description: 'An evening of live music, contemporary dance, and fusion performances from Chennai campus student clubs. Special guest artist performance. Free entry for all VIT Chennai students.',
      shortDesc: 'Live performances from Chennai student clubs + guest artist.',
      campus: Campus.CHENNAI, campusId: campuses[1].id, categoryId: categories[1].id,
      bannerUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(18), maxRegistrations: 800,
      tags: ['cultural', 'music', 'dance', 'live', 'performance'],
      creatorId: superAdmin.id, points: 20, certificateEligible: false,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Photography & Storytelling Sprint', slug: 'photography-sprint-chennai',
      description: 'Learn composition, lighting, portrait photography, and visual storytelling from professional photographers and cinematographers. Mobile and DSLR sessions. Your work gets featured in the VIT magazine.',
      shortDesc: 'Photography masterclass — mobile + DSLR, feature in VIT magazine.',
      campus: Campus.CHENNAI, campusId: campuses[1].id, categoryId: categories[6].id,
      bannerUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(11), maxRegistrations: 100,
      tags: ['photography', 'design', 'storytelling', 'creative', 'media'],
      creatorId: superAdmin.id, points: 20, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Cybersecurity CTF — Chennai', slug: 'ctf-chennai-2026',
      description: 'Capture The Flag competition with challenges in web exploitation, reverse engineering, cryptography, and forensics. Industry mentors from CERT-In. Individual and team entries welcome.',
      shortDesc: 'CTF competition — web, crypto, forensics, reverse engineering.',
      campus: Campus.CHENNAI, campusId: campuses[1].id, categoryId: categories[8].id,
      bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(16), maxRegistrations: 200,
      tags: ['cybersecurity', 'CTF', 'hacking', 'competition', 'security'], prizePool: '₹50,000',
      creatorId: superAdmin.id, points: 45, certificateEligible: true,
      isTeamEvent: true, teamSize: 3, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },

    // ─ AP ─────────────────────────────────────────────────────
    {
      title: 'Startup Pitch Arena — AP', slug: 'startup-pitch-ap-2026',
      description: 'Showcase your startup idea to angel investors and alumni founders. Top 3 teams receive seed funding, co-working space, and 6 months mentorship. No prior startup experience required — just a great idea.',
      shortDesc: 'Pitch to investors — top teams get seed funding + mentorship.',
      campus: Campus.AP, campusId: campuses[2].id, categoryId: categories[7].id,
      bannerUrl: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 300,
      registrationStart: d(0), registrationEnd: d(15), maxRegistrations: 180,
      tags: ['startup', 'entrepreneurship', 'pitch', 'funding'], prizePool: '₹75,000',
      creatorId: superAdmin.id, points: 40, certificateEligible: true,
      isTeamEvent: true, teamSize: 3, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Green Campus Hackathon', slug: 'green-hackathon-ap',
      description: 'Hack practical solutions for energy efficiency, waste reduction, and water optimization on campus. Partnered with AP State Government\'s Smart City initiative. AICTE certified. Cash prizes + implementation grants.',
      shortDesc: 'Sustainability hackathon — smart city partnership, AICTE certified.',
      campus: Campus.AP, campusId: campuses[2].id, categoryId: categories[0].id,
      bannerUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(22), maxRegistrations: 180,
      tags: ['sustainability', 'hackathon', 'green', 'SDG', 'smart city'], prizePool: '₹60,000',
      creatorId: superAdmin.id, points: 50, certificateEligible: true,
      isTeamEvent: true, teamSize: 4, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Research Methodology Seminar', slug: 'research-seminar-ap',
      description: 'Academic seminar on research design, hypothesis formulation, data collection, statistical analysis (SPSS/R), and IEEE paper writing. Perfect for final-year students targeting journals and conferences.',
      shortDesc: 'Research seminar for final-year students — IEEE paper writing.',
      campus: Campus.AP, campusId: campuses[2].id, categoryId: categories[4].id,
      bannerUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(16), maxRegistrations: 450,
      tags: ['research', 'IEEE', 'seminar', 'academia', 'paper writing'],
      creatorId: superAdmin.id, points: 20, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'AP Cultural Showcase', slug: 'ap-cultural-2026',
      description: 'Celebrating Andhra and Telangana culture with classical Kuchipudi dance, Carnatic music, Bommalattam puppetry, traditional cuisine, and handicraft exhibitions. Free for all VIT students.',
      shortDesc: 'Kuchipudi, Carnatic, folk arts — celebrating AP heritage.',
      campus: Campus.AP, campusId: campuses[2].id, categoryId: categories[1].id,
      bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(19), maxRegistrations: 600,
      tags: ['cultural', 'folk', 'Kuchipudi', 'Andhra', 'heritage'],
      creatorId: superAdmin.id, points: 20, certificateEligible: false,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Drone & Robotics Showcase', slug: 'drone-robotics-ap',
      description: 'Live competitions for autonomous drones, line-following robots, and robotic arm manipulation. Individual and team entries. AICTE certified. Prizes from robotics industry sponsors.',
      shortDesc: 'Live drone and robot competitions — AICTE certified.',
      campus: Campus.AP, campusId: campuses[2].id, categoryId: categories[0].id,
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(24), maxRegistrations: 180,
      tags: ['robotics', 'drone', 'autonomous', 'engineering', 'competition'], prizePool: '₹40,000',
      creatorId: superAdmin.id, points: 45, certificateEligible: true,
      isTeamEvent: true, teamSize: 3, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },

    // ─ BHOPAL ─────────────────────────────────────────────────
    {
      title: 'Cybersecurity Bootcamp', slug: 'cybersecurity-bootcamp-bhopal',
      description: 'Intensive 2-day hands-on security bootcamp — live CTF challenges, penetration testing labs, bug bounty basics, and network analysis. Industry mentors from CERT-In and top security firms. Internship referrals for top performers.',
      shortDesc: 'CTF, pen testing, bug bounty — internship referrals for top performers.',
      campus: Campus.BHOPAL, campusId: campuses[3].id, categoryId: categories[8].id,
      bannerUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(28), maxRegistrations: 350,
      tags: ['cybersecurity', 'CTF', 'penetration testing', 'bug bounty'],
      creatorId: superAdmin.id, points: 40, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'IoT & Embedded Systems Workshop', slug: 'iot-workshop-bhopal',
      description: 'Build real IoT devices using Arduino, Raspberry Pi, and ESP32. Projects include smart home sensors, weather stations, and real-time dashboards with cloud integration. All components provided.',
      shortDesc: 'Build real IoT devices — all components provided.',
      campus: Campus.BHOPAL, campusId: campuses[3].id, categoryId: categories[3].id,
      bannerUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 450,
      registrationStart: d(0), registrationEnd: d(13), maxRegistrations: 80,
      tags: ['IoT', 'Arduino', 'Raspberry Pi', 'embedded', 'workshop'],
      creatorId: superAdmin.id, points: 25, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: true, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Business Case Competition', slug: 'business-case-bhopal',
      description: 'Solve real business problems from corporate sponsors. Teams present strategy, financial analysis, and go-to-market roadmap. ₹1L cash prizes from sponsors. Resume-worthy experience.',
      shortDesc: 'Solve real corporate problems — ₹1L in prizes.',
      campus: Campus.BHOPAL, campusId: campuses[3].id, categoryId: categories[7].id,
      bannerUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 200,
      registrationStart: d(0), registrationEnd: d(17), maxRegistrations: 120,
      tags: ['business', 'case study', 'strategy', 'competition'], prizePool: '₹1,00,000',
      creatorId: superAdmin.id, points: 40, certificateEligible: true,
      isTeamEvent: true, teamSize: 4, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'National Science Conclave', slug: 'science-conclave-bhopal',
      description: 'Presenting cutting-edge student research in physics, chemistry, biology, and interdisciplinary sciences. Poster presentations, oral defense, and paper submission. Best papers submitted to Springer proceedings.',
      shortDesc: 'National research presentations — best papers to Springer.',
      campus: Campus.BHOPAL, campusId: campuses[3].id, categoryId: categories[4].id,
      bannerUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: false, ticketPrice: 150,
      registrationStart: d(0), registrationEnd: d(21), maxRegistrations: 350,
      tags: ['science', 'research', 'conclave', 'Springer', 'poster'],
      creatorId: superAdmin.id, points: 30, certificateEligible: true,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Mental Wellness Retreat', slug: 'wellness-retreat-bhopal',
      description: 'A half-day retreat on stress management, mindfulness meditation, sleep hygiene, and academic well-being. Led by certified psychologists and wellness coaches. Inclusive, confidential, and free.',
      shortDesc: 'Mindfulness, stress management — certified psychologists.',
      campus: Campus.BHOPAL, campusId: campuses[3].id, categoryId: categories[9].id,
      bannerUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(11), maxRegistrations: 120,
      tags: ['wellness', 'mindfulness', 'mental health', 'meditation'],
      creatorId: superAdmin.id, points: 15, certificateEligible: false,
      isTeamEvent: false, teamSize: 1, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
    {
      title: 'Robotics Challenge — Bhopal', slug: 'robotics-bhopal-2026',
      description: 'Build autonomous robots and compete in live arena scenarios — line-following, maze-solving, and robotic arm manipulation. Individual and team entries. AICTE certified event with industry sponsor prizes.',
      shortDesc: 'Build and compete with autonomous robots — AICTE certified.',
      campus: Campus.BHOPAL, campusId: campuses[3].id, categoryId: categories[0].id,
      bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1400&q=80',
      status: EventStatus.PUBLISHED, isFree: true, ticketPrice: 0,
      registrationStart: d(0), registrationEnd: d(20), maxRegistrations: 80,
      tags: ['robotics', 'autonomous', 'engineering', 'competition'], prizePool: '₹30,000',
      creatorId: superAdmin.id, points: 40, certificateEligible: true,
      isTeamEvent: true, teamSize: 3, hasWaitlist: false, visibility: EventVisibility.PUBLIC,
    },
  ];

  const createdEvents: any[] = [];
  for (const input of eventInputs) {
    const event = await prisma.event.upsert({
      where: { slug: input.slug },
      update: {},
      create: input,
    });
    createdEvents.push(event);
  }
  console.log('✅ Events seeded:', createdEvents.length);

  // ── 8. Sessions (multi-session per event) ─────────────────────
  const createdEventIds = createdEvents.map((event) => event.id);
  const existingSessions = await prisma.eventSession.findMany({
    where: { eventId: { in: createdEventIds } },
    select: { id: true },
  });
  const existingSessionIds = existingSessions.map((session) => session.id);

  if (existingSessionIds.length > 0) {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { booking: { eventId: { in: createdEventIds } } },
          { title: { in: ['ðŸ’³ Payment Confirmed!', 'ðŸŽŸï¸ Booking Confirmed!', 'âŒ Booking Cancelled', 'ðŸŽŠ Spot Available!', 'Event Day Reminder'] } },
        ],
      },
    });
    await prisma.attendance.deleteMany({ where: { eventId: { in: createdEventIds } } });
    await prisma.waitlist.deleteMany({ where: { sessionId: { in: existingSessionIds } } });
    await prisma.booking.deleteMany({ where: { eventId: { in: createdEventIds } } });
    await prisma.seat.deleteMany({ where: { sessionId: { in: existingSessionIds } } });
    await prisma.eventSession.deleteMany({ where: { eventId: { in: createdEventIds } } });
  }

  type SessionInput = {
    eventId: string; venueId: string; title: string;
    sessionDate: Date; startTime: string; endTime: string;
    totalSeats: number; speakerName?: string;
  };

  const sessionData: SessionInput[] = [
    // HackVIT — 2 days
    { eventId: createdEvents[0].id, venueId: venues[3].id, title: 'Day 1 — Hacking + Mentoring', sessionDate: d(12), startTime: '09:00', endTime: '23:00', totalSeats: 200, speakerName: 'Industry Mentors' },
    { eventId: createdEvents[0].id, venueId: venues[3].id, title: 'Day 2 — Presentations + Awards', sessionDate: d(13), startTime: '09:00', endTime: '17:00', totalSeats: 200, speakerName: 'Jury Panel' },
    // Riviera — 3 days
    { eventId: createdEvents[1].id, venueId: venues[2].id, title: 'Day 1 — Opening Night', sessionDate: d(15), startTime: '17:00', endTime: '23:00', totalSeats: 900 },
    { eventId: createdEvents[1].id, venueId: venues[2].id, title: 'Day 2 — Main Events', sessionDate: d(16), startTime: '10:00', endTime: '23:00', totalSeats: 900 },
    { eventId: createdEvents[1].id, venueId: venues[2].id, title: 'Day 3 — Grand Finale', sessionDate: d(17), startTime: '17:00', endTime: '23:59', totalSeats: 900 },
    // Innovation Summit
    { eventId: createdEvents[2].id, venueId: venues[3].id, title: 'Morning Pitch Session', sessionDate: d(18), startTime: '09:00', endTime: '13:00', totalSeats: 100, speakerName: 'Ms. Priya Iyer, VC Partner' },
    { eventId: createdEvents[2].id, venueId: venues[3].id, title: 'Investor Meet & Awards', sessionDate: d(18), startTime: '14:00', endTime: '18:00', totalSeats: 100, speakerName: 'Mr. Raghav Nair, Angel Investor' },
    // Python Bootcamp
    { eventId: createdEvents[3].id, venueId: venues[5].id, title: 'Day 1 — Python Fundamentals', sessionDate: d(8), startTime: '09:00', endTime: '17:00', totalSeats: 120, speakerName: 'Mr. Suresh Dev' },
    { eventId: createdEvents[3].id, venueId: venues[5].id, title: 'Day 2 — ML & Deployment', sessionDate: d(9), startTime: '09:00', endTime: '17:00', totalSeats: 120, speakerName: 'Mr. Suresh Dev' },
    // Global Youth Summit
    { eventId: createdEvents[4].id, venueId: venues[0].id, title: 'Opening Plenary + Keynotes', sessionDate: d(22), startTime: '09:00', endTime: '18:00', totalSeats: 600, speakerName: 'Various International Speakers' },
    // Sports
    { eventId: createdEvents[5].id, venueId: venues[4].id, title: 'Sports Day — All Events', sessionDate: d(28), startTime: '07:00', endTime: '18:00', totalSeats: 500 },
    // Design Workshop
    { eventId: createdEvents[6].id, venueId: venues[1].id, title: 'Full-Day Design Sprint', sessionDate: d(7), startTime: '10:00', endTime: '17:00', totalSeats: 80, speakerName: 'Mr. Vikram Nair, Product Designer' },
    // AI Conclave Chennai
    { eventId: createdEvents[7].id, venueId: venues[8].id, title: 'AI Track — Morning', sessionDate: d(10), startTime: '10:00', endTime: '13:00', totalSeats: 150, speakerName: 'Dr. Meera Krishnan' },
    { eventId: createdEvents[7].id, venueId: venues[8].id, title: 'Data Track — Afternoon', sessionDate: d(10), startTime: '14:00', endTime: '17:00', totalSeats: 150, speakerName: 'Dr. Ananya Krishnan' },
    // Entrepreneurship Summit Chennai
    { eventId: createdEvents[8].id, venueId: venues[9].id, title: 'Summit Morning', sessionDate: d(20), startTime: '09:00', endTime: '13:00', totalSeats: 200, speakerName: 'Ms. Kavya Rajan, VC' },
    { eventId: createdEvents[8].id, venueId: venues[9].id, title: 'Networking + Afternoon', sessionDate: d(20), startTime: '14:00', endTime: '18:00', totalSeats: 200, speakerName: 'Mr. Anand VC' },
    // Fullstack Bootcamp Chennai
    { eventId: createdEvents[9].id, venueId: venues[8].id, title: 'Full-Day Workshop', sessionDate: d(12), startTime: '09:00', endTime: '17:00', totalSeats: 80, speakerName: 'Mr. Arun Full-Stack' },
    // Cultural Night Chennai
    { eventId: createdEvents[10].id, venueId: venues[6].id, title: 'Cultural Night Show', sessionDate: d(16), startTime: '18:00', endTime: '22:00', totalSeats: 650 },
    // Photography Sprint
    { eventId: createdEvents[11].id, venueId: venues[7].id, title: 'Photography Sprint', sessionDate: d(9), startTime: '10:00', endTime: '16:00', totalSeats: 100, speakerName: 'Ms. Deepa Lens' },
    // CTF Chennai
    { eventId: createdEvents[12].id, venueId: venues[8].id, title: 'CTF Competition Day 1', sessionDate: d(14), startTime: '09:00', endTime: '21:00', totalSeats: 150 },
    // Startup Pitch AP
    { eventId: createdEvents[13].id, venueId: venues[11].id, title: 'Pitch Day', sessionDate: d(14), startTime: '09:00', endTime: '17:00', totalSeats: 180, speakerName: 'Mr. Rajan, VC' },
    // Green Hackathon AP
    { eventId: createdEvents[14].id, venueId: venues[10].id, title: 'Hackathon Day', sessionDate: d(20), startTime: '09:00', endTime: '21:00', totalSeats: 180 },
    // Research Seminar AP
    { eventId: createdEvents[15].id, venueId: venues[10].id, title: 'Research Workshop', sessionDate: d(15), startTime: '10:00', endTime: '16:00', totalSeats: 450, speakerName: 'Dr. Venkat Rao' },
    // AP Cultural
    { eventId: createdEvents[16].id, venueId: venues[10].id, title: 'Cultural Showcase', sessionDate: d(18), startTime: '17:00', endTime: '22:00', totalSeats: 450 },
    // Drone Robotics AP
    { eventId: createdEvents[17].id, venueId: venues[11].id, title: 'Drone & Robot Showcase', sessionDate: d(22), startTime: '09:00', endTime: '18:00', totalSeats: 180, speakerName: 'Dr. Srinivas Reddy' },
    // Cyber Bootcamp Bhopal
    { eventId: createdEvents[18].id, venueId: venues[12].id, title: 'Bootcamp Day 1 — Labs', sessionDate: d(26), startTime: '09:00', endTime: '18:00', totalSeats: 120, speakerName: 'Mr. Kiran, CERT-In' },
    { eventId: createdEvents[18].id, venueId: venues[12].id, title: 'Bootcamp Day 2 — CTF', sessionDate: d(27), startTime: '09:00', endTime: '18:00', totalSeats: 120, speakerName: 'Mr. Kiran, CERT-In' },
    // IoT Workshop Bhopal
    { eventId: createdEvents[19].id, venueId: venues[13].id, title: 'IoT Day 1', sessionDate: d(11), startTime: '09:00', endTime: '17:00', totalSeats: 80, speakerName: 'Mr. Vivek IoT' },
    { eventId: createdEvents[19].id, venueId: venues[13].id, title: 'IoT Day 2', sessionDate: d(12), startTime: '09:00', endTime: '17:00', totalSeats: 80, speakerName: 'Mr. Vivek IoT' },
    // Business Case Bhopal
    { eventId: createdEvents[20].id, venueId: venues[14].id, title: 'Case Competition Finals', sessionDate: d(15), startTime: '09:00', endTime: '18:00', totalSeats: 120, speakerName: 'Ms. Shreya MBA' },
    // Science Conclave Bhopal
    { eventId: createdEvents[21].id, venueId: venues[14].id, title: 'Poster Presentation Day', sessionDate: d(19), startTime: '10:00', endTime: '17:00', totalSeats: 120, speakerName: 'Dr. Asha Bhatt' },
    // Wellness Retreat
    { eventId: createdEvents[22].id, venueId: venues[14].id, title: 'Mindfulness Morning', sessionDate: d(9), startTime: '08:00', endTime: '13:00', totalSeats: 120, speakerName: 'Dr. Priya Wellness' },
    // Robotics Bhopal
    { eventId: createdEvents[23].id, venueId: venues[13].id, title: 'Robotics Arena', sessionDate: d(18), startTime: '09:00', endTime: '18:00', totalSeats: 80, speakerName: 'Prof. Suresh Nair' },
  ];

  const createdSessions: any[] = [];
  for (const s of sessionData) {
    const session = await prisma.eventSession.create({ data: s });
    createdSessions.push(session);
  }
  console.log('✅ Sessions seeded:', createdSessions.length);

  // ── 9. Generate seats for key sessions ───────────────────────
  async function generateSeats(sessionId: string, count: number) {
    const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const seatsPerRow = Math.ceil(count / rows.length);
    const seats = [];
    let total = 0;
    for (let r = 0; r < rows.length && total < count; r++) {
      for (let s = 1; s <= seatsPerRow && total < count; s++) {
        const seatType = rows[r] === 'A' ? SeatType.VIP : SeatType.GENERAL;
        seats.push({ sessionId, seatNumber: `${rows[r]}${s}`, rowLabel: rows[r], seatType });
        total++;
      }
    }
    await prisma.seat.createMany({ data: seats, skipDuplicates: true });
    return total;
  }

  // Generate seats for first 6 sessions
  let totalSeats = 0;
  for (const session of createdSessions.slice(0, 8)) {
    const capacity = Math.min(session.totalSeats, 100);
    totalSeats += await generateSeats(session.id, capacity);
  }
  console.log('✅ Seats generated:', totalSeats);

  // ── 10. FOC Activities ──────────────────────────────────────
  const demoFreeSeat = await prisma.seat.findFirst({
    where: { sessionId: createdSessions[0].id, status: 'AVAILABLE' },
    orderBy: { seatNumber: 'asc' },
  });
  const demoPaidSeat = await prisma.seat.findFirst({
    where: { sessionId: createdSessions[7].id, status: 'AVAILABLE' },
    orderBy: { seatNumber: 'asc' },
  });
  const demoCheckinSeat = await prisma.seat.findFirst({
    where: { sessionId: createdSessions[2].id, status: 'AVAILABLE' },
    orderBy: { seatNumber: 'asc' },
  });

  const freeQrToken = `seed-free-${students[0].id.slice(0, 8)}`;
  const paidQrToken = `seed-paid-${students[1].id.slice(0, 8)}`;
  const checkinQrToken = `seed-checkin-${students[2].id.slice(0, 8)}`;

  const [freeQrCode, paidQrCode, checkinQrCode] = await Promise.all([
    QRCode.toDataURL(freeQrToken),
    QRCode.toDataURL(paidQrToken),
    QRCode.toDataURL(checkinQrToken),
  ]);

  const demoBookings = await Promise.all([
    prisma.booking.create({
      data: {
        bookingRef: 'VIT-DEMO-FREE',
        userId: students[0].id,
        eventId: createdEvents[0].id,
        sessionId: createdSessions[0].id,
        seatId: demoFreeSeat?.id,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.FREE,
        amountPaid: 0,
        qrToken: freeQrToken,
        qrCodeUrl: freeQrCode,
        confirmedAt: new Date(),
      },
    }),
    prisma.booking.create({
      data: {
        bookingRef: 'VIT-DEMO-PAID',
        userId: students[1].id,
        eventId: createdEvents[3].id,
        sessionId: createdSessions[7].id,
        seatId: demoPaidSeat?.id,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentRef: 'mock_order_seed_paid',
        razorpayPaymentId: 'mock_payment_seed_paid',
        amountPaid: 433,
        gstAmount: 63,
        processingFee: 20,
        qrToken: paidQrToken,
        qrCodeUrl: paidQrCode,
        confirmedAt: new Date(),
      },
    }),
    prisma.booking.create({
      data: {
        bookingRef: 'VIT-DEMO-CHECKEDIN',
        userId: students[2].id,
        eventId: createdEvents[1].id,
        sessionId: createdSessions[2].id,
        seatId: demoCheckinSeat?.id,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.FREE,
        amountPaid: 0,
        checkedIn: true,
        checkedInAt: new Date(),
        qrToken: checkinQrToken,
        qrCodeUrl: checkinQrCode,
        confirmedAt: new Date(),
      },
    }),
  ]);

  if (demoFreeSeat) {
    await prisma.seat.update({ where: { id: demoFreeSeat.id }, data: { status: 'BOOKED', bookedAt: new Date() } });
  }
  if (demoPaidSeat) {
    await prisma.seat.update({ where: { id: demoPaidSeat.id }, data: { status: 'BOOKED', bookedAt: new Date() } });
  }
  if (demoCheckinSeat) {
    await prisma.seat.update({ where: { id: demoCheckinSeat.id }, data: { status: 'BOOKED', bookedAt: new Date() } });
  }

  await prisma.attendance.create({
    data: {
      userId: students[2].id,
      eventId: createdEvents[1].id,
      sessionId: createdSessions[2].id,
      scannedByUserId: president.id,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: students[0].id,
        type: 'BOOKING_CONFIRMED',
        title: 'ðŸŽŸï¸ Booking Confirmed!',
        message: `You're registered for "${createdEvents[0].title}"!`,
        bookingId: demoBookings[0].id,
      },
      {
        userId: students[1].id,
        type: 'PAYMENT_RECEIVED',
        title: 'ðŸ’³ Payment Confirmed!',
        message: `â‚¹433 received for "${createdEvents[3].title}". Your ticket is ready!`,
        bookingId: demoBookings[1].id,
      },
      {
        userId: students[2].id,
        type: 'EVENT_REMINDER',
        title: 'Event Day Reminder',
        message: `You're checked in for "${createdEvents[1].title}". Enjoy the event!`,
        bookingId: demoBookings[2].id,
      },
    ],
  });
  console.log('âœ… Demo bookings seeded');

  await prisma.focActivity.upsert({ where: { id: 'seed-foc-1' }, update: {}, create: {
    id: 'seed-foc-1', userId: students[0].id, clubId: club.id, semester: 'Winter 2025',
    activityType: 'Club Membership', description: 'Active member of ISTE VIT for Winter 2025',
    hours: 20, credits: 1.0, status: FocStatus.APPROVED, approvedById: faculty.id, approvedAt: new Date(),
  }});
  await prisma.focActivity.upsert({ where: { id: 'seed-foc-2' }, update: {}, create: {
    id: 'seed-foc-2', userId: students[0].id, semester: 'Winter 2025',
    activityType: 'Event Volunteer', description: 'Volunteered at HackVIT 2025',
    hours: 10, credits: 0.5, status: FocStatus.PENDING,
  }});
  console.log('✅ FOC activities seeded');

  // ── 11. Badges & Achievements ────────────────────────────────
  const achievementRecords = await prisma.achievement.findMany();
  const firstBookingAch = achievementRecords.find(a => a.key === 'FIRST_BOOKING');

  if (firstBookingAch) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementKey: { userId: students[0].id, achievementKey: 'FIRST_BOOKING' } },
      update: {},
      create: { userId: students[0].id, achievementId: firstBookingAch.id, achievementKey: 'FIRST_BOOKING' },
    });
  }

  await prisma.userBadge.upsert({
    where: { userId_type_label: { userId: students[0].id, type: BadgeType.ATTENDANCE, label: 'First Event' } },
    update: {},
    create: { userId: students[0].id, type: BadgeType.ATTENDANCE, label: 'First Event' },
  });
  await prisma.userBadge.upsert({
    where: { userId_type_label: { userId: president.id, type: BadgeType.ORGANIZER, label: 'Event Organizer' } },
    update: {},
    create: { userId: president.id, type: BadgeType.ORGANIZER, label: 'Event Organizer' },
  });
  await prisma.userBadge.upsert({
    where: { userId_type_label: { userId: students[1].id, type: BadgeType.STREAK, label: '7-Day Streak' } },
    update: {},
    create: { userId: students[1].id, type: BadgeType.STREAK, label: '7-Day Streak' },
  });
  console.log('✅ Badges & achievements seeded');

  // ── 12. Announcements ────────────────────────────────────────
  await prisma.announcement.deleteMany({
    where: {
      title: {
        in: [
          'Welcome to VITVerse 2026! ðŸŽ‰',
          'FOC Submission Deadline',
          'HackVIT 2026 Registrations Open!',
        ],
      },
    },
  });
  await prisma.announcement.createMany({ data: [
    { title: 'Welcome to VITVerse 2026! 🎉', content: 'The new unified platform for all VIT campus events is live. Explore 25+ events, join clubs, track your FOC, and compete on the leaderboard!', authorId: superAdmin.id, pinned: true },
    { title: 'FOC Submission Deadline', content: 'Last date for Winter 2025 FOC activity submissions is December 15, 2025. Upload your proof before the deadline!', authorId: faculty.id, campus: Campus.VELLORE, pinned: false },
    { title: 'HackVIT 2026 Registrations Open!', content: 'Register now for HackVIT 2026 — ₹2L prize pool, Google, Microsoft & ISRO problem statements. Teams of up to 4.', authorId: president.id, pinned: true },
  ]});
  console.log('✅ Announcements seeded');

  // ── 13. Skill Radar for demo users ──────────────────────────
  await prisma.skillRadar.upsert({ where: { userId: students[0].id }, update: {}, create: {
    userId: students[0].id, technical: 72, leadership: 45, management: 38, creative: 55, social: 60,
  }});
  await prisma.skillRadar.upsert({ where: { userId: president.id }, update: {}, create: {
    userId: president.id, technical: 85, leadership: 90, management: 78, creative: 65, social: 88,
  }});
  console.log('✅ Skill radar seeded');

  console.log('\n🎉 VITVerse v2 seeding complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TEST CREDENTIALS (password: Test@1234)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Super Admin  → admin@vitverse.in');
  console.log('  Faculty      → faculty@vit.ac.in');
  console.log('  President    → president@vit.ac.in');
  console.log('  Student VEL  → rahul@vit.ac.in');
  console.log('  Student CHN  → priya@vit.ac.in');
  console.log('  Student AP   → akash@vitap.ac.in');
  console.log('  Student BPL  → sneha@vitbhopal.ac.in');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📊 ${createdEvents.length} events | ${createdSessions.length} sessions | ${totalSeats} seats`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });


