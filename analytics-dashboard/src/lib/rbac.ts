/**
 * RBAC Configuration — Central role whitelist.
 * 
 * Roles:
 *   super_admin → Overall platform admin
 *                 Sees aggregated cloud summary only. NO raw/detailed data.
 *   app_admin   → App-level admin for a specific app
 *                 Sees the FULL detailed analytics dashboard for their app.
 *   user        → Normal user, can use apps but cannot access any dashboards.
 */

export type UserRole = 'super_admin' | 'app_admin' | 'user';

/**
 * Strict route-based access control.
 * 
 * super_admin:
 *   ✅ / (landing), /admin (global summary), /apps/* (per-app summaries)
 *   ❌ /dashboard, /features, /funnel, /tenants, /settings, /governance
 * 
 * app_admin:
 *   ✅ / (landing), /dashboard, /features, /funnel, /tenants, /settings, /governance
 *   ❌ /admin, /apps/* (these show cross-tenant data the app admin shouldn't see)
 * 
 * user:
 *   ❌ Everything — should only use their assigned application
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Login and unauthorized pages are always accessible
  if (pathname === '/login' || pathname === '/unauthorized') return true;
  
  // Public API routes
  if (pathname.startsWith('/api/auth')) return true;
  
  // Normal users can't access anything in the analytics dashboard
  if (role === 'user') return false;
  
  // Super admin: aggregated summary views ONLY
  if (role === 'super_admin') {
    if (pathname === '/') return true;
    if (pathname === '/admin') return true;
    if (pathname.startsWith('/apps/')) return true;
    // Block all detailed analytics routes
    return false;
  }
  
  // App admin: full detailed analytics for their app
  if (role === 'app_admin') {
    if (pathname === '/') return true;
    if (pathname === '/dashboard') return true;
    if (pathname.startsWith('/features')) return true;
    if (pathname.startsWith('/funnel')) return true;
    if (pathname.startsWith('/tenants')) return true;
    if (pathname.startsWith('/settings')) return true;
    if (pathname.startsWith('/governance')) return true;
    if (pathname.startsWith('/transparency')) return true;
    if (pathname.startsWith('/ai-report')) return true;
    if (pathname.startsWith('/license-usage')) return true;
    if (pathname.startsWith('/user-journey')) return true;
    if (pathname.startsWith('/predictive')) return true;
    // Block super admin routes — app admin shouldn't see cross-tenant data
    if (pathname === '/admin') return false;
    if (pathname.startsWith('/apps/')) return false;
    return false;
  }
  
  return false;
}
