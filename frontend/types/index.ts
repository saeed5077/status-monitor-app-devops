export interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  logo_url: string | null;
  brand_color: string;
  owner_email: string;
  created_at: string;
}

export interface Monitor {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  check_interval_seconds: number;
  status: 'operational' | 'degraded' | 'outage';
  last_checked_at: string | null;
  created_at: string;
}

export interface UptimeLog {
  id: string;
  monitor_id: string;
  checked_at: string;
  response_time_ms: number | null;
  status_code: number | null;
  is_up: boolean;
}

export interface UptimeStats {
  date: string;
  uptime_percentage: number;
  total_checks: number;
  up_checks: number;
}

export interface MonitorWithUptime extends Monitor {
  uptime_stats: UptimeStats[];
}

export interface Incident {
  id: string;
  tenant_id: string;
  monitor_id: string | null;
  title: string;
  message: string | null;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  duration_minutes?: number | null;
}

export interface Subscriber {
  id: string;
  tenant_id: string;
  email: string;
  confirmed: boolean;
  created_at: string;
}

export interface PublicMonitorStatus {
  id: string;
  name: string;
  status: string;
  uptime_percentage_30d: number;
}

export interface PublicIncidentStatus {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  affected_monitor: string | null;
}

export interface PublicStatusResponse {
  tenant: Tenant;
  overall_status: string;
  monitors: PublicMonitorStatus[];
  active_incidents: PublicIncidentStatus[];
  recent_incidents: PublicIncidentStatus[];
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  tenant: Tenant;
}

export interface UserMeResponse {
  id: string;
  email: string;
  tenant: Tenant;
}
