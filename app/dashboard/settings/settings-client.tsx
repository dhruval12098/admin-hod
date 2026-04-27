'use client'

import { useMemo, useState } from 'react'
import { KeyRound, MessageCircle, Save } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { CatalogGstSlab } from '@/lib/product-catalog'

type SettingsTab = 'general' | 'security'

export type SiteSettings = {
  whatsapp_number: string
  default_gst_slab_id?: string
}

type WhatsappForm = {
  countryCode: string
  localNumber: string
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type SettingsPageData = {
  settings: SiteSettings
  gstSlabs: CatalogGstSlab[]
}

const emptyPasswordForm: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const whatsappCountryCodes = [
  { label: 'India', value: '+91' },
  { label: 'United States', value: '+1' },
  { label: 'United Kingdom', value: '+44' },
  { label: 'United Arab Emirates', value: '+971' },
  { label: 'Australia', value: '+61' },
  { label: 'Canada', value: '+1' },
  { label: 'Singapore', value: '+65' },
]

async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function normalizeWhatsappNumber(value: string) {
  return value.replace(/[^\d]/g, '')
}

function splitWhatsappNumber(value: string): WhatsappForm {
  const digits = normalizeWhatsappNumber(value)
  const matchedCode = whatsappCountryCodes
    .map((item) => item.value.replace('+', ''))
    .sort((a, b) => b.length - a.length)
    .find((code) => digits.startsWith(code))

  if (matchedCode) {
    return {
      countryCode: `+${matchedCode}`,
      localNumber: digits.slice(matchedCode.length),
    }
  }

  return {
    countryCode: '+91',
    localNumber: digits,
  }
}

function buildStoredWhatsappNumber(form: WhatsappForm) {
  const countryDigits = form.countryCode.replace(/[^\d]/g, '')
  const localDigits = normalizeWhatsappNumber(form.localNumber)
  return `${countryDigits}${localDigits}`
}

export function SettingsClient({ initialData }: { initialData: SettingsPageData }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [savingSettings, setSavingSettings] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>(initialData.settings)
  const [gstSlabs] = useState<CatalogGstSlab[]>(initialData.gstSlabs)
  const [defaultGstSlabId, setDefaultGstSlabId] = useState(initialData.settings.default_gst_slab_id ?? '')
  const [whatsappForm, setWhatsappForm] = useState<WhatsappForm>(splitWhatsappNumber(initialData.settings.whatsapp_number ?? ''))
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm)
  const [settingsConfirmOpen, setSettingsConfirmOpen] = useState(false)
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false)

  const whatsappPreviewLink = useMemo(() => {
    const digits = normalizeWhatsappNumber(buildStoredWhatsappNumber(whatsappForm))
    return digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent("Hi, I'd like to enquire about House of Diams")}`
      : ''
  }, [whatsappForm])

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')

      const nextSettings = {
        whatsapp_number: buildStoredWhatsappNumber(whatsappForm),
        default_gst_slab_id: defaultGstSlabId || null,
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(nextSettings),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to save settings.')
      }

      setSettings({
        whatsapp_number: nextSettings.whatsapp_number,
        default_gst_slab_id: nextSettings.default_gst_slab_id ?? '',
      })

      toast({
        title: 'Saved',
        description: 'Settings updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unable to save settings.',
        variant: 'destructive',
      })
    } finally {
      setSavingSettings(false)
      setSettingsConfirmOpen(false)
    }
  }

  const changePassword = async () => {
    setChangingPassword(true)
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) throw new Error('Missing access token.')

      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(passwordForm),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to change password.')
      }

      setPasswordForm(emptyPasswordForm)
      toast({
        title: 'Password changed',
        description: payload?.message ?? 'Password updated successfully. Please sign in again for a fresh session.',
      })
    } catch (error) {
      toast({
        title: 'Password change failed',
        description: error instanceof Error ? error.message : 'Unable to change password.',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
      setPasswordConfirmOpen(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-10">
        <h1 className="font-jakarta text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage live store support details and your admin account security.</p>
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto border-b border-border">
        {[
          { id: 'general', label: 'General', icon: MessageCircle },
          { id: 'security', label: 'Security', icon: KeyRound },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
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

      {activeTab === 'general' ? (
        <div className="max-w-3xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-6">
              <h2 className="font-jakarta text-lg font-semibold text-foreground">Floating WhatsApp Number</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This number is used by the floating WhatsApp icon on the live storefront.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">WhatsApp Number</label>
                <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <select
                    value={whatsappForm.countryCode}
                    onChange={(e) => setWhatsappForm((prev) => ({ ...prev, countryCode: e.target.value }))}
                    className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {whatsappCountryCodes.map((item, index) => (
                      <option key={`${item.value}-${item.label}-${index}`} value={item.value}>
                        {item.label} ({item.value})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={whatsappForm.localNumber}
                    onChange={(e) => setWhatsappForm((prev) => ({ ...prev, localNumber: e.target.value }))}
                    placeholder="Enter WhatsApp number"
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Choose the country code first, then enter the rest of the number. We will save one clean WhatsApp number for the live floating button.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-sm font-semibold text-foreground">Live Preview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {whatsappPreviewLink || 'Enter a WhatsApp number to generate the live floating button link.'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saved format: {buildStoredWhatsappNumber(whatsappForm) || 'No number yet'}
                </p>
                {settings.whatsapp_number ? (
                  <p className="mt-2 text-xs text-muted-foreground">Current saved number: {settings.whatsapp_number}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Default Checkout Tax</label>
                <select
                  value={defaultGstSlabId}
                  onChange={(e) => setDefaultGstSlabId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Use first active GST slab as fallback</option>
                  {gstSlabs
                    .filter((item) => item.status !== 'hidden')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.percentage}%)
                      </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground">
                  Used in checkout when a product has no GST slab assigned.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettingsConfirmOpen(true)}
              disabled={savingSettings}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === 'security' ? (
        <div className="max-w-3xl space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-6">
              <h2 className="font-jakarta text-lg font-semibold text-foreground">Change Password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your current password is required first. Changing your password keeps the same admin account and role, but you should sign in again after changing it.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-foreground">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Confirm Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:border-input focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Minimum 8 characters. After a successful password change, sign in again for a clean admin session.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPasswordConfirmOpen(true)}
              disabled={changingPassword}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound size={16} />
              Update Password
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={settingsConfirmOpen}
        title="Save general settings?"
        description="This will update the floating WhatsApp link and the default checkout tax fallback."
        confirmText="Save"
        cancelText="Cancel"
        type="confirm"
        isLoading={savingSettings}
        onConfirm={() => void saveSettings()}
        onCancel={() => {
          if (!savingSettings) setSettingsConfirmOpen(false)
        }}
      />

      <ConfirmDialog
        isOpen={passwordConfirmOpen}
        title="Change your admin password?"
        description="This updates the password for your current admin account. Your role and RLS access stay tied to the same user, but you should sign in again after this change."
        confirmText="Change Password"
        cancelText="Cancel"
        type="warning"
        isLoading={changingPassword}
        onConfirm={() => void changePassword()}
        onCancel={() => {
          if (!changingPassword) setPasswordConfirmOpen(false)
        }}
      />
    </div>
  )
}
