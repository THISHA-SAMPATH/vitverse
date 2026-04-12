<<<<<<< HEAD
# VITVerse 🎓
### 4 Campuses, 1 Smart Clubs & Events Ecosystem

> A production-ready, full-stack platform for VIT Vellore, Chennai, AP, and Bhopal — featuring AI-powered recommendations, real-time seat booking, FOC/FSES tracking, cross-campus leaderboards, and a student portfolio system.

---

## 🏗️ Architecture Overview

```
vitverse/
├── backend/          # NestJS API (TypeScript)
│   ├── src/
│   │   ├── auth/           # JWT + RBAC authentication
│   │   ├── users/          # User management + sessions
│   │   ├── events/         # Event CRUD + attendance
│   │   ├── clubs/          # Club ecosystem + health scoring
│   │   ├── seats/          # ⚡ Concurrency engine (Redis + BullMQ)
│   │   ├── leaderboard/    # Points + rankings (PostgreSQL window fns)
│   │   ├── foc/            # FOC/FSES credit workflow
│   │   ├── portfolio/      # Student profiles + skill radar
│   │   ├── admin/          # Super admin + analytics
│   │   ├── ai/             # GPT-4o recommendations, OCR, chatbot
│   │   └── prisma/         # Database service
│   └── prisma/
│       ├── schema.prisma   # Full DB schema (20+ models)
│       └── seed.ts         # Dev seed data
│
└── frontend/         # Next.js 15 (TypeScript)
    └── src/
        ├── app/
        │   ├── auth/           # Login + Register pages
        │   ├── dashboard/      # Main dashboard (layout + page)
        │   ├── events/         # Events list, detail, create
        │   ├── clubs/          # Clubs list, detail
        │   ├── leaderboard/    # 3-tier leaderboard
        │   ├── foc/            # FOC tracking + submission
        │   ├── portfolio/      # Student portfolio
        │   └── admin/          # Admin dashboard
        ├── components/
        │   ├── layout/         # Sidebar + Header
        │   ├── events/         # EventCard, SeatMap
        │   └── ai/             # VITBot floating chatbot
        ├── lib/
        │   ├── api.ts          # Axios with token refresh
        │   └── utils.ts        # Shared utilities
        ├── store/
        │   └── auth.store.ts   # Zustand auth state
        └── types/
            └── index.ts        # Full TypeScript types
```

---

## ⚡ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| **State** | Zustand, TanStack Query v5 |
| **Backend** | NestJS, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache + Queues** | Redis (Upstash), BullMQ |
| **Realtime** | Socket.io (WebSockets) |
| **Auth** | JWT + Refresh tokens + RBAC |
| **AI** | OpenAI GPT-4o (recommendations, OCR, chatbot) |
| **Storage** | AWS S3 / Supabase Storage |
| **Hosting** | Vercel (frontend), Railway/Render (backend), Neon/Supabase (DB) |

---

## 🔥 Key Engineering Features

### ⚡ Seat Booking Concurrency Engine
- **5-minute hold** with Redis TTL — no DB write until confirmed
- **Distributed lock** (Redis SET NX EX) prevents race conditions
- **Optimistic UI** — seat appears held instantly on frontend
- **BullMQ** schedules automatic seat release after hold expires
- **WebSocket** broadcasts live seat map updates to all users
- **Oversell prevention** via PostgreSQL atomic transactions
- **Waitlist promotion** — notifies next user when seat frees

```
User clicks seat → Redis lock acquired → DB set to HELD →
BullMQ job scheduled → User confirms → DB set to BOOKED →
Redis lock released → Socket broadcasts update to room
```

### 🤖 AI Features
- **Event Recommendations** — GPT-4o ranks upcoming events by user interest profile
- **Poster OCR** — Upload poster image → AI extracts title, venue, date, tags
- **VITBot Campus Chatbot** — RAG over events/clubs/FOC data, campus-aware
- **Conflict Detection** — AI warns when new event clashes with existing ones
- **Semantic Search** — Natural language search (e.g. "Python + networking events")
- **Club Health Score** — Algorithm scores activity, retention, attendance

### 🏆 Leaderboard System
- **PostgreSQL RANK() window functions** for real-time rankings
- **3 tiers:** Student → Club → Campus
- **Podium UI** for top 3, glass table for the rest
- **Point transactions** tracked per event/action

### 📚 FOC/FSES Module (VIT-specific)
- **Activity submission** with proof upload
- **Faculty approval** workflow with notes
- **Credit computation** (hours × 0.5 = credits)
- **Progress visualization** with percentage bar
- **Auto-PDF report** generation per semester
- **Missing task alerts** via notifications

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Option 1: Docker Compose (Recommended)
```bash
# Clone the repo
git clone https://github.com/your-org/vitverse.git
cd vitverse

# Set environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit both .env files with your keys

# Start everything
docker-compose up -d

# Seed the database
docker exec vitverse-backend sh -c "npx prisma migrate dev && npx ts-node prisma/seed.ts"
```

### Option 2: Manual Setup

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL, REDIS_*, JWT_SECRET, OPENAI_API_KEY

npx prisma migrate dev --name init
npx prisma generate
npx ts-node prisma/seed.ts

npm run start:dev
# → API running at http://localhost:4000
# → Swagger docs at http://localhost:4000/api/docs
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local

npm run dev
# → App running at http://localhost:3000
```

---

## 🔑 Test Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@vitverse.in | Test@1234 |
| Faculty | faculty@vit.ac.in | Test@1234 |
| Club President | president@vit.ac.in | Test@1234 |
| Student (Vellore) | rahul@vit.ac.in | Test@1234 |
| Student (Chennai) | priya@vit.ac.in | Test@1234 |

---

## 📡 API Reference

Full Swagger documentation available at `http://localhost:4000/api/docs`

### Core Endpoints

```
POST   /api/v1/auth/register           Register new user
POST   /api/v1/auth/login              Login + get tokens
POST   /api/v1/auth/refresh            Refresh access token
POST   /api/v1/auth/verify-otp         Verify email OTP

GET    /api/v1/events                  List events (with filters)
POST   /api/v1/events                  Create event (President/Admin)
GET    /api/v1/events/:slug            Event detail
PATCH  /api/v1/events/:id/publish      Publish draft event
POST   /api/v1/events/:id/attendance   Mark QR attendance

GET    /api/v1/events/:id/seats        Live seat map
POST   /api/v1/events/:id/seats/hold   Hold seat (5-min TTL)
POST   /api/v1/events/:id/seats/confirm Confirm booking

GET    /api/v1/clubs                   List clubs
GET    /api/v1/clubs/:slug             Club detail
POST   /api/v1/clubs/:id/join          Join club
POST   /api/v1/clubs/:id/leave         Leave club

GET    /api/v1/leaderboard/students    Student leaderboard
GET    /api/v1/leaderboard/clubs       Club leaderboard
GET    /api/v1/leaderboard/campuses    Campus leaderboard

GET    /api/v1/foc/progress            FOC progress summary
POST   /api/v1/foc/submit              Submit FOC activity
GET    /api/v1/foc/report/:semester    Generate PDF report data

GET    /api/v1/portfolio/me            My full portfolio
GET    /api/v1/portfolio/me/resume     Resume data export

POST   /api/v1/ai/chat                 VITBot chatbot
POST   /api/v1/ai/ocr                  Poster OCR extraction
GET    /api/v1/ai/recommendations      Personalized recommendations
POST   /api/v1/ai/conflict-check       Event conflict detection
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#0052CC` | Buttons, active states, branding |
| `secondary` | `#6366F1` | Links, accents, AI features |
| `success` | `#10B981` | Leaderboards, FOC approvals |
| `warning` | `#F59E0B` | Seat hold timer, deadlines |
| Background | `#0F172A` | Main background (dark mode) |
| Surface | `#1E293B / 40%` | Cards, sidebar, overlays |

**Glass morphism** is used throughout via the `.glass` utility class:
```css
background: rgba(30, 41, 59, 0.6);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.08);
```

---

## 🗺️ Phased Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| 1 — Foundation | ✅ | Auth, Dashboard, Events CRUD, Club pages |
| 2 — Core Scale | ✅ | Seat booking, Redis locks, WebSocket, QR attendance |
| 3 — VIT Special | ✅ | FOC/FSES, Points, Leaderboards, President dashboards |
| 4 — AI Layer | ✅ | OCR, Chatbot, Recommendations, Health scores |
| 5 — Production | 🔄 | CI/CD, Monitoring, Load testing, Rate limiting |

---

## 📦 Deployment

### Frontend → Vercel
```bash
vercel --prod
# Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL in Vercel dashboard
```

### Backend → Railway
```bash
railway up
# Set all backend env vars in Railway dashboard
```

### Database → Neon / Supabase
```
DATABASE_URL=postgresql://...@...neon.tech/vitverse?sslmode=require
```

### Redis → Upstash
```
REDIS_HOST=...upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=...
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run `npm run lint` and `npm test`
4. Commit with conventional commits (`feat: add QR scanner`)
5. Open a PR

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ for VIT students by the VITVerse team.
=======
# vitverse
Full-stack VIT campus app | Next.js + NestJS + PostgreSQL + Redis + Socket.io + AI 
>>>>>>> 2a896cac63241c0a391475989396cf0f91d34018
