# Anginat Backend

Real-Time Incident Reporting & Resource Coordination Platform - Backend API

## Tech Stack

- **Runtime**: Node.js 18.19.0
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript
- **Database**: PostgreSQL 15.5
- **ORM**: Prisma 5.7.1
- **Real-time**: Socket.IO 4.7.5
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **File Upload**: Multer 1.4.5-lts.1
- **Validation**: Zod 3.22.4
- **Media Storage**: Cloudinary

## Features

- ✅ RESTful API for incident lifecycle management
- ✅ Real-time WebSocket updates via Socket.IO
- ✅ JWT-based authentication with role-based access control
- ✅ Media upload to Cloudinary
- ✅ Duplicate incident detection (distance + time based)
- ✅ Community verification through upvoting
- ✅ Rate limiting for abuse prevention
- ✅ Production-ready deployment configuration

## Project Structure

```
backend/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── config/
│   │   ├── env.ts             # Environment validation
│   │   └── cloudinary.ts      # Cloudinary config
│   ├── middleware/
│   │   ├── auth.middleware.ts # JWT authentication
│   │   ├── error.middleware.ts# Error handling
│   │   └── rateLimit.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── incident.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── incident.controller.ts
│   ├── services/
│   │   ├── incident.service.ts
│   │   └── socket.service.ts
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── distance.ts
│   │   └── duplicateDetector.ts
│   └── validations/
│       ├── auth.schema.ts
│       └── incident.schema.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Local Development Setup

### Prerequisites

- Node.js 18.19.0 or higher
- PostgreSQL 15.5 (local or cloud)
- Cloudinary account

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/anginat?schema=public"

# JWT (use a strong secret in production!)
JWT_SECRET="your-super-secret-key-min-32-chars"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Seed Admin User (Optional)

Create a file `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  
  await prisma.user.upsert({
    where: { email: 'admin@anginat.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@anginat.com',
      passwordHash,
      role: 'ADMIN',
    },
  });
  
  console.log('Seeded admin user');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run with: `npx tsx prisma/seed.ts`

### 5. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login user | ❌ |
| POST | `/api/auth/register` | Register user | ❌ |
| GET | `/api/auth/me` | Get profile | ✅ |

### Incidents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/incidents` | Create incident | ❌ (rate limited) |
| GET | `/api/incidents` | List incidents | ❌ |
| GET | `/api/incidents/:id` | Get incident | ❌ |
| PATCH | `/api/incidents/:id/status` | Update status | ✅ Admin |
| POST | `/api/incidents/:id/upvote` | Upvote incident | ✅ |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health status |

## Socket.IO Events

### Client → Server

- `join:incidents` - Join incidents room for real-time updates
- `subscribe:incident` - Subscribe to specific incident updates
- `unsubscribe:incident` - Unsubscribe from incident updates

### Server → Client

- `incident:new` - New incident created
- `incident:update` - Incident status changed
- `incident:updated` - Specific incident updated (room-based)

## Deployment to Render

### 1. Create Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings → Database → Connection string
3. Copy the connection string (use "Transaction" mode)

### 2. Deploy to Render

1. Connect your GitHub repository to [render.com](https://render.com)
2. Create a new **Web Service**
3. Configure:
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

### 3. Set Environment Variables on Render

```
NODE_ENV=production
PORT=10000
DATABASE_URL=<supabase-connection-string>
JWT_SECRET=<strong-random-string>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CORS_ORIGINS=https://your-frontend.vercel.app
```

### 4. Run Migrations

After deployment, run migrations via Render shell:

```bash
npx prisma migrate deploy
```

## Business Logic

### Duplicate Detection

Incidents are flagged as potential duplicates if:
- Same incident type
- Within 200 meters of an existing incident
- Reported within 10 minutes of an existing incident

### Verification System

- Users can upvote incidents to increase trust score
- After reaching the threshold (default: 5 upvotes), status changes to `VERIFIED`
- Each user can only upvote an incident once

### Rate Limiting

- General API: 100 requests per minute per IP
- Incident creation: 10 requests per minute per IP
- Auth endpoints: 10 attempts per 15 minutes per IP

## License

ISC
