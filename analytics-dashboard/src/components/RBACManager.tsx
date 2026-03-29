'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, UserPlus } from 'lucide-react';

export default function RBACManager() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [targetApp, setTargetApp] = useState('twitter');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/rbac');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      } else {
        setError('Failed to load RBAC configuration');
      }
    } catch (e) {
      setError('Error fetching config');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (action: 'add' | 'remove', email: string, appId: string) => {
    setIsUpdating(true);
    setError('');
    try {
      const res = await fetch('/api/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email, appId })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        if (action === 'add') setNewEmail('');
      } else {
        setError(data.error || 'Failed to update roles');
      }
    } catch (e) {
      setError('Network error updating roles');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="animate-pulse bg-gray-100 h-48 rounded-xl"></div>;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">App Access Management</h3>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Add New App Admin */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <UserPlus size={16} /> Assign New App Admin
        </h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="admin@company.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select 
            value={targetApp} 
            onChange={(e) => setTargetApp(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="twitter">Twitter Demo</option>
            {/* Can be dynamic based on APP_REGISTRY in the future */}
          </select>
          <button
            onClick={() => handleUpdateRole('add', newEmail, targetApp)}
            disabled={!newEmail || isUpdating}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Admin
          </button>
        </div>
      </div>

      {/* List existing App Admins */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Current App Admins</h4>
        {config?.app_admins && Object.keys(config.app_admins).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(config.app_admins).map(([appId, emails]) => (
              <div key={appId} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">App: {appId}</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {(emails as string[]).map(email => (
                    <li key={email} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                      <span className="text-sm text-gray-900 font-medium">{email}</span>
                      <button
                        onClick={() => handleUpdateRole('remove', email, appId)}
                        disabled={isUpdating}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove Access"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                  {(emails as string[]).length === 0 && (
                    <li className="px-4 py-3 text-sm text-gray-500 italic">No admins assigned to this app.</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No app admins configured.</p>
        )}
      </div>
      
    </div>
  );
}
