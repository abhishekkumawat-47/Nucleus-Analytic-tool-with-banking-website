/**
 * RBAC Configuration for the Twitter Demo App.
 * 
 * Roles:
 *   super_admin → Overall platform admin (omeshmehta70@gmail.com)
 *                 Can use app normally + sees "Admin" link to cloud summary
 *   app_admin   → Twitter app admin (omeshmehta03@gmail.com)
 *                 Can use app normally + sees "Analytics" link to detailed dashboard
 *   user        → Normal user — can use app normally (post, like, interact)
 *                 No admin links shown
 */

export type UserRole = 'super_admin' | 'app_admin' | 'user';


