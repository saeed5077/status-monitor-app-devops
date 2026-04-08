# Status Page SaaS Platform
A production-ready, multi-tenant white-label Status Page & Uptime Monitor SaaS platform with microservice architecture.
#Test-chage
## Architecture

- **Backend**: FastAPI (Python) with async/await, SQLAlchemy 2.0, PostgreSQL, Redis
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Reverse Proxy**: Caddy for custom domain support with automatic TLS
- **Infrastructure**: Docker, Kubernetes, Jenkins CI/CD

## Project Structure

```
statuspage/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/routes/   # API endpoints
│   │   ├── core/         # Config, database, security, redis
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic (monitor worker, notifier)
│   │   └── main.py       # Application entry point
│   ├── alembic/          # Database migrations
│   ├── Dockerfile
│   ├── Jenkinsfile
│   └── values.yaml       # Helm values
├── frontend/             # Next.js application
│   ├── app/              # App Router pages
│   │   ├── (auth)/       # Login/Register
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── status/       # Public status pages
│   │   └── page.tsx      # Landing page
│   ├── components/       # React components
│   ├── lib/              # API client, utilities
│   ├── types/            # TypeScript types
│   ├── Dockerfile
│   ├── Jenkinsfile
│   └── values.yaml
├── caddy/                # Reverse proxy
│   ├── Caddyfile
│   └── Dockerfile
├── k8s/                  # Kubernetes manifests
│   ├── namespace.yaml
│   ├── postgres/
│   ├── redis/
│   └── caddy/
└── docker-compose.yml    # Local development
```

## Quick Start (Local Development)

1. **Clone and navigate to the project:**
   ```bash
   cd statuspage
   ```

2. **Create environment files:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start all services:**
   ```bash
   docker-compose up
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Features

### Multi-Tenancy
- Each tenant gets their own white-labeled status page
- Custom domain support (e.g., status.company.com)
- Unique slug for subdomain fallback

### Uptime Monitoring
- HTTP health checks with configurable intervals (1, 5, 10 minutes)
- Response time tracking
- Automatic incident creation on service failure
- Real-time status updates via WebSocket

### Incident Management
- Manual and automatic incident creation
- Severity levels (minor, major, critical)
- Status tracking (investigating, identified, monitoring, resolved)
- Incident timeline and duration calculation

### Subscriber Notifications
- Email subscription with confirmation
- Automatic email notifications on incidents
- Unsubscribe functionality

### White-Label Customization
- Custom logo upload
- Brand color selection
- No platform branding on public pages

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tenants
- `GET /api/tenants/me` - Get tenant info
- `PUT /api/tenants/me` - Update tenant settings

### Monitors
- `GET /api/monitors` - List monitors
- `POST /api/monitors` - Create monitor
- `PUT /api/monitors/{id}` - Update monitor
- `DELETE /api/monitors/{id}` - Delete monitor
- `GET /api/monitors/{id}/uptime` - Get uptime stats

### Incidents
- `GET /api/incidents` - List incidents
- `POST /api/incidents` - Create incident
- `PUT /api/incidents/{id}` - Update incident
- `DELETE /api/incidents/{id}` - Delete incident

### Subscribers
- `POST /api/subscribers` - Subscribe to updates
- `GET /api/subscribers/confirm/{token}` - Confirm subscription
- `GET /api/subscribers/unsubscribe/{token}` - Unsubscribe

### Public
- `GET /api/public/{tenant_slug}` - Get public status
- `GET /api/public/{tenant_slug}/history` - Get uptime history
- `WS /api/ws/{tenant_slug}` - WebSocket for real-time updates

## Deployment

### Docker Compose (Local)
```bash
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/caddy/
```

### CI/CD
Each service has its own Jenkinsfile for:
- Code quality checks
- Docker image build
- Trivy security scan
- Push to registry
- Helm deployment

## Environment Variables

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT secret key
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` - Email settings
- `FRONTEND_URL` - Frontend URL for email links

### Frontend
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL
- `NEXT_PUBLIC_APP_URL` - App URL

## Monitoring & Background Jobs

The monitor worker (APScheduler) runs background health checks:
- Automatically detects service outages
- Creates incidents when monitors go down
- Resolves incidents when services recover
- Sends email notifications to subscribers

## License

MIT
