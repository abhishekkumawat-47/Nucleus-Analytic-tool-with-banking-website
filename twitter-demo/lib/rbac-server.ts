import fs from 'fs';
import path from 'path';
import { UserRole } from './rbac';

export interface RBACConfig {
  super_admins: string[];
  app_admins: Record<string, string[]>;
}

export function getRbacConfig(): RBACConfig {
  try {
    // Both apps run in their respective folders inside nucleus
    // so ../rbac.json points to nucleus/rbac.json
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
  
  if (config.super_admins?.includes(email)) return 'super_admin';
  
  for (const appId in config.app_admins) {
    const admins = config.app_admins[appId];
    if (admins && admins.includes(email)) {
      return 'app_admin';
    }
  }
  
  return 'user';
}

export function getAdminApps(email: string | null | undefined): string[] {
  if (!email) return [];
  
  const config = getRbacConfig();
  const apps: string[] = [];
  
  for (const appId in config.app_admins) {
    const admins = config.app_admins[appId];
    if (admins && admins.includes(email)) {
      apps.push(appId);
    }
  }
  
  return apps;
}
