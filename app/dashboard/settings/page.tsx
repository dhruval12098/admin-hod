'use client'

import { useState } from 'react'
import { Save, Key, Bell, Shield, Users, Building2 } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'notifications' | 'security' | 'team'>('general')
  const [settings, setSettings] = useState({
    storeName: 'House of Diams',
    storeEmail: 'contact@houseofdiams.com',
    timezone: 'UTC-5',
    currency: 'USD',
    language: 'English',
  })

  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: 'Stripe Live Key', value: 'pk_live_*****', created: '2024-01-01', status: 'active' },
    { id: 2, name: 'Development Key', value: 'sk_test_*****', created: '2023-12-15', status: 'active' },
  ])

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your dashboard and store settings</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'general', label: 'General', icon: Building2 },
          { id: 'api', label: 'API Keys', icon: Key },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'team', label: 'Team', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-150 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Store Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Store Name</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => handleSettingChange('storeName', e.target.value)}
                  className="w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Store Email</label>
                <input
                  type="email"
                  value={settings.storeEmail}
                  onChange={(e) => handleSettingChange('storeEmail', e.target.value)}
                  className="w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option>UTC-8</option>
                    <option>UTC-5</option>
                    <option>UTC-0</option>
                    <option>UTC+5:30</option>
                    <option>UTC+8</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                  <select
                    value={settings.currency}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    className="w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>JPY</option>
                    <option>AUD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full rounded border border-border bg-white px-4 py-2 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Chinese</option>
                </select>
              </div>
            </div>
            <button className="mt-6 flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'api' && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
              <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
                Generate New Key
              </button>
            </div>

            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded border border-border p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{key.value}</p>
                    <p className="text-xs text-muted-foreground mt-2">Created: {key.created}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {key.status}
                    </span>
                    <button className="rounded px-3 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              {[
                { label: 'Order Notifications', description: 'Get notified when new orders arrive' },
                { label: 'Customer Messages', description: 'Alerts for customer inquiries' },
                { label: 'Weekly Reports', description: 'Receive weekly sales reports' },
                { label: 'Inventory Alerts', description: 'Low stock warnings' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-border pb-4 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              ))}
            </div>
            <button className="mt-6 flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              <Save size={16} />
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">Security Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mt-1">Add an extra layer of security</p>
                </div>
                <button className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Change Password</p>
                  <p className="text-xs text-muted-foreground mt-1">Update your account password</p>
                </div>
                <button className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Active Sessions</p>
                  <p className="text-xs text-muted-foreground mt-1">Manage your active sessions</p>
                </div>
                <button className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team */}
      {activeTab === 'team' && (
        <div className="space-y-6 max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
              <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
                Invite Member
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: 'You', email: 'admin@houseofdiams.com', role: 'Owner' },
                { name: 'John Doe', email: 'john@houseofdiams.com', role: 'Editor' },
                { name: 'Jane Smith', email: 'jane@houseofdiams.com', role: 'Viewer' },
              ].map((member) => (
                <div key={member.email} className="flex items-center justify-between rounded border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={member.role.toLowerCase()}
                      className="rounded border border-border bg-white px-3 py-1 text-xs transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="owner">Owner</option>
                    </select>
                    {member.name !== 'You' && (
                      <button className="rounded px-3 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
