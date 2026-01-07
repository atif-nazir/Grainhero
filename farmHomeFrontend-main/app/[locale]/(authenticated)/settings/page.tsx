"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Settings,
  Bell,
  Database,
  Globe,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { api } from '@/lib/api'

interface TenantSettings {
  name: string
  email: string
  phone: string
  business_type: string
  location: {
    address: string
    city: string
    country: string
  }
  notifications: {
    email_alerts: boolean
    sms_alerts: boolean
    push_notifications: boolean
    weekly_reports: boolean
    monthly_reports: boolean
  }
  system: {
    auto_backup: boolean
    data_retention_days: number
    session_timeout_minutes: number
    two_factor_auth: boolean
  }
  integrations: {
    weather_api: boolean
    market_prices: boolean
    government_data: boolean
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings>({
    name: '',
    email: '',
    phone: '',
    business_type: 'farm',
    location: {
      address: '',
      city: '',
      country: ''
    },
    notifications: {
      email_alerts: true,
      sms_alerts: false,
      push_notifications: true,
      weekly_reports: true,
      monthly_reports: true
    },
    system: {
      auto_backup: true,
      data_retention_days: 365,
      session_timeout_minutes: 60,
      two_factor_auth: false
    },
    integrations: {
      weather_api: true,
      market_prices: true,
      government_data: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // Fetch current user data
      const userRes = await api.get('/api/user-management/users/profile')

      if (userRes.ok && userRes.data) {
        const user: Record<string, unknown> = userRes.data.user || userRes.data
        const tenantRes = await api.get('/api/tenant/settings').catch(() => null)
        setSettings({
          name: user.organization_name || user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          business_type: user.business_type || 'farm',
          location: {
            address: user.address || tenantRes?.data?.location?.address || '',
            city: user.city || tenantRes?.data?.location?.city || '',
            country: user.country || tenantRes?.data?.location?.country || 'Pakistan'
          },
          notifications: (tenantRes && tenantRes.data && tenantRes.data.notifications) ? tenantRes.data.notifications : {
            email_alerts: true,
            sms_alerts: false,
            push_notifications: true,
            weekly_reports: true,
            monthly_reports: true
          },
          system: (tenantRes && tenantRes.data && tenantRes.data.system) ? tenantRes.data.system : {
            auto_backup: true,
            data_retention_days: 365,
            session_timeout_minutes: 60,
            two_factor_auth: false
          },
          integrations: (tenantRes && tenantRes.data && tenantRes.data.integrations) ? tenantRes.data.integrations : {
            weather_api: true,
            market_prices: true,
            government_data: false
          }
        })
      } else {
        // Fallback to default settings if API fails
        setSettings({
          name: '',
          email: '',
          phone: '',
          business_type: 'farm',
          location: { address: '', city: '', country: 'Pakistan' },
          notifications: {
            email_alerts: true,
            sms_alerts: false,
            push_notifications: true,
            weekly_reports: true,
            monthly_reports: true
          },
          system: {
            auto_backup: true,
            data_retention_days: 365,
            session_timeout_minutes: 60,
            two_factor_auth: false
          },
          integrations: {
            weather_api: true,
            market_prices: true,
            government_data: false
          }
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save user profile data
      const profileRes = await api.put('/api/user-management/users/profile', {
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        business_type: settings.business_type,
        address: settings.location.address,
        city: settings.location.city,
        country: settings.location.country
      })

      // Save tenant settings if available
      await api.put('/api/tenant/settings', {
        notifications: settings.notifications,
        system: settings.system,
        integrations: settings.integrations,
        location: settings.location
      }).catch(() => {
        // If tenant settings endpoint doesn't exist, that's okay
        console.log('Tenant settings endpoint not available')
      })

      if (profileRes.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  const updateSettings = (section: keyof TenantSettings, field: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown>),
        [field]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your grain management system preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Saved successfully</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Save failed</span>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Clock className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Basic information about your grain operation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateSettings('name', 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateSettings('email', 'email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => updateSettings('phone', 'phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select value={settings.business_type} onValueChange={(value) => updateSettings('business_type', 'business_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farm">Farm</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="mill">Mill</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.location.address}
                  onChange={(e) => updateSettings('location', 'address', e.target.value)}
                  placeholder="Enter your full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.location.city}
                    onChange={(e) => updateSettings('location', 'city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={settings.location.country}
                    onChange={(e) => updateSettings('location', 'country', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you want to receive alerts and updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive critical alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.email_alerts}
                    onCheckedChange={(checked) => updateSettings('notifications', 'email_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive urgent alerts via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.sms_alerts}
                    onCheckedChange={(checked) => updateSettings('notifications', 'sms_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications in the mobile app
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.push_notifications}
                    onCheckedChange={(checked) => updateSettings('notifications', 'push_notifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly summary reports
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.weekly_reports}
                    onCheckedChange={(checked) => updateSettings('notifications', 'weekly_reports', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Monthly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive monthly detailed reports
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.monthly_reports}
                    onCheckedChange={(checked) => updateSettings('notifications', 'monthly_reports', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure system behavior and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically backup data daily
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.auto_backup}
                    onCheckedChange={(checked) => updateSettings('system', 'auto_backup', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all user logins
                    </p>
                  </div>
                  <Switch
                    checked={settings.system.two_factor_auth}
                    onCheckedChange={(checked) => updateSettings('system', 'two_factor_auth', checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retention">Data Retention (Days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={settings.system.data_retention_days}
                      onChange={(e) => updateSettings('system', 'data_retention_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Session Timeout (Minutes)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={settings.system.session_timeout_minutes}
                      onChange={(e) => updateSettings('system', 'session_timeout_minutes', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                External Integrations
              </CardTitle>
              <CardDescription>
                Connect with external services for enhanced functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weather API</Label>
                    <p className="text-sm text-muted-foreground">
                      Get real-time weather data for risk assessment
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.weather_api}
                    onCheckedChange={(checked) => updateSettings('integrations', 'weather_api', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Market Prices</Label>
                    <p className="text-sm text-muted-foreground">
                      Get current grain market prices
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.market_prices}
                    onCheckedChange={(checked) => updateSettings('integrations', 'market_prices', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Government Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Access government agricultural data
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.government_data}
                    onCheckedChange={(checked) => updateSettings('integrations', 'government_data', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
