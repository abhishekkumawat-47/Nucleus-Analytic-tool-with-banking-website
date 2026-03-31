import fs from 'fs';
import path from 'path';
import { UserRole } from './rbac';

export interface RBACConfig {
  super_admins: string[];
  app_admins: Record<string, string[]>;
}

export function getRbacConfig(): RBACConfig {
  try {
    // Assuming the app is run from nucleus/analytics-dashboard via `npm run dev`
    // So the config is at nucleus/rbac.json
    const configPath = path.resolve(process.cwd(), '../rbac.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error("Error reading rbac.json:", error);
  }
  return { super_admins: [], app_admins: {} };
}

export function getUserRole(email: string | null | undefined): UserRole {
  if (!email) return 'user';
  
  const config = getRbacConfig();
  
  // Super admins: strict whitelist
  if (config.super_admins?.includes(email)) return 'super_admin';
  
  // Any authenticated user gets app_admin access
  // (Any logged-in user can view the analytics dashboard)
  return 'app_admin';
}

export function getAdminApps(email: string | null | undefined): string[] {
  if (!email) return [];
  
  const config = getRbacConfig();
  
  // Check if user has specific app assignments in rbac.json
  const assignedApps: string[] = [];
  for (const appId in config.app_admins) {
    const admins = config.app_admins[appId];
    if (admins && admins.includes(email)) {
      assignedApps.push(appId);
    }
  }
  
  // If user has explicit assignments, return those
  if (assignedApps.length > 0) return assignedApps;
  
  // Otherwise, grant access to all registered apps
  // (Any authenticated admin can see all apps)
  return Object.keys(config.app_admins);
}
