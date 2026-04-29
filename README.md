# Insighta Labs+ Backend

A secure, multi-interface profile intelligence platform built with NestJS and PostgreSQL.

## System Architecture

┌─────────────────────────────────────────────────────┐
│                    Insighta Labs+                    │
├─────────────┬──────────────────┬────────────────────┤
│   CLI Tool  │   Web Portal     │   Direct API       │
│  (Node.js)  │   (Next.js)      │   (REST)           │
└──────┬──────┴────────┬─────────┴────────┬───────────┘
│               │                  │
└───────────────▼──────────────────┘
│
┌────────▼────────┐
│  NestJS Backend │
│   Port 3000     │
├─────────────────┤
│  Auth Module    │
│  Profile Module │
│  RBAC Guards    │
│  Rate Limiting  │
└────────┬────────┘
│
┌────────▼────────┐
│   PostgreSQL    │
│   (Supabase)    │
│                 │
│  users          │
│  profiles       │
│  refresh_tokens │
└─────────────────┘

## Auth Flow

1. Client initiates login → `GET /auth/github`
2. Backend sets `cli_redirect` cookie (CLI flow) then redirects to GitHub OAuth
3. User authorizes on GitHub
4. GitHub redirects to `GET /auth/github/callback`
5. Backend exchanges code, finds or creates user, issues tokens
6. Backend redirects to frontend/CLI with `access_token` + `refresh_token`
7. Client stores tokens and includes `Authorization: Bearer <token>` on all requests

### PKCE (CLI Flow)
- CLI opens `GET /auth/github?cli_redirect=http://localhost:9876/callback`
- Backend stores redirect in cookie before OAuth handshake
- After GitHub callback, backend redirects to CLI local server with tokens
- CLI stores credentials at `~/.insighta/credentials.json`

### Token Expiry
| Token | Expiry |
|-------|--------|
| Access token | 3 minutes |
| Refresh token | 5 minutes |

- Refresh tokens are single-use — invalidated immediately after use
- New pair issued on every refresh
- Logout invalidates the refresh token server-side

## Role Enforcement Logic

Two roles: `admin` and `analyst`. Default role on signup: `analyst`.

| Endpoint | Analyst | Admin |
|----------|---------|-------|
| GET /api/profiles | ✓ | ✓ |
| GET /api/profiles/search | ✓ | ✓ |
| GET /api/profiles/export | ✓ | ✓ |
| GET /api/profiles/:id | ✓ | ✓ |
| POST /api/profiles | ✗ | ✓ |

Enforcement is handled globally via two NestJS guards registered as `APP_GUARD`:
- `JwtAuthGuard` — validates Bearer token on every request
- `RolesGuard` — checks `@Roles()` decorator against `user.role`

Routes marked `@Public()` bypass JWT guard entirely (auth endpoints).

## API Versioning

All `/api/*` endpoints require the header:

Missing header returns `400 Bad Request`.

## Rate Limiting

| Scope | Limit |
|-------|-------|
| `/auth/*` | 10 requests/minute |
| All other endpoints | 60 requests/minute per user |

## Natural Language Parsing

The NLP parser (`src/profile/nlp/query-parser.ts`) extracts structured filters from free-text queries using keyword matching and pattern recognition:

- Gender: detects "male", "female", "men", "women", "boys", "girls"
- Age groups: detects "young", "adult", "senior", "child", "teenager"
- Age ranges: detects patterns like "under 30", "over 25", "between 20 and 40"
- Countries: detects country names and ISO codes (e.g. "Nigeria" → "NG")

Example: `"young males from Nigeria"` → `{ gender: "male", age_group: "young adult", country_id: "NG" }`

## Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your values

# Run in development
npm run start:dev

# Run in production
npm run build
npm run start:prod
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=3m
JWT_REFRESH_EXPIRES_IN=5m
PORT=3000
FRONTEND_URL=http://localhost:3001
```

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /auth/github | Public | Initiate GitHub OAuth |
| GET | /auth/github/callback | Public | OAuth callback |
| POST | /auth/refresh | Public | Refresh tokens |
| POST | /auth/logout | Bearer | Logout |
| GET | /auth/me | Bearer | Current user |

### Profiles
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | /api/profiles | Any | List profiles |
| GET | /api/profiles/search | Any | Natural language search |
| GET | /api/profiles/export | Any | Export CSV |
| GET | /api/profiles/:id | Any | Get profile |
| POST | /api/profiles | Admin | Create profile |

## Tech Stack

- NestJS + TypeScript
- PostgreSQL (Supabase)
- TypeORM
- Passport.js (GitHub OAuth + JWT)
- @nestjs/throttler (rate limiting)