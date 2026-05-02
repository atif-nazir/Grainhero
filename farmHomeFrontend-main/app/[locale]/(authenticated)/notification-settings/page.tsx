'use client';

import { useState, useEffect } from 'react';
import { Bell, Save, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getPushManager } from '@/lib/push-notifications';
import type { NotificationPreferences } from '@/lib/push-notifications';

export default function NotificationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const pushManager = getPushManager();
      const isAvailable = await pushManager.isAvailable();
      setHasSubscription(isAvailable);

      const data = await pushManager.getPreferences();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePush = async () => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      push_enabled: !preferences.push_enabled
    };

    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleToggleCategory = async (category: string) => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: !preferences.categories[category as keyof typeof preferences.categories]
      }
    };

    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleToggleQuietHours = async () => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      quiet_hours_enabled: !preferences.quiet_hours_enabled
    };

    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleQuietHoursChange = (field: 'start' | 'end' | 'timezone', value: string) => {
    if (!preferences) return;

    const newPreferences = { ...preferences };
    if (field === 'start') {
      newPreferences.quiet_hours_start = value;
    } else if (field === 'end') {
      newPreferences.quiet_hours_end = value;
    } else if (field === 'timezone') {
      newPreferences.quiet_hours_timezone = value;
    }

    setPreferences(newPreferences);
  };

  const handleToggleSound = async () => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      sound_enabled: !preferences.sound_enabled
    };

    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleToggleVibration = async () => {
    if (!preferences) return;

    const newPreferences = {
      ...preferences,
      vibration_enabled: !preferences.vibration_enabled
    };

    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const savePreferences = async (prefs: NotificationPreferences) => {
    setIsSaving(true);
    try {
      const pushManager = getPushManager();
      const result = await pushManager.updatePreferences(prefs);

      if (result.success) {
        toast.success('Preferences saved successfully');
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!preferences) return;
    await savePreferences(preferences);
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const pushManager = getPushManager();
      const result = await pushManager.sendTestNotification();

      if (result.success) {
        toast.success('Test notification sent!');
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-slate-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">Failed to load preferences</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Notification Settings
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Customize how you receive notifications from GrainHero
          </p>
        </div>

        {!hasSubscription && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              Push notifications are not enabled. Enable push notifications in the notification permission prompt to customize your settings.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Push Notifications Toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Push Notifications
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Receive real-time notifications directly in your browser
                </p>
              </div>
              <button
                onClick={handleTogglePush}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  preferences.push_enabled
                    ? 'bg-green-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    preferences.push_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Notification Categories */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Notification Categories
            </h2>
            <div className="space-y-3">
              {Object.entries(preferences.categories).map(([category, enabled]) => (
                <div key={category} className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggleCategory(category)}
                      className="rounded border-slate-300"
                      disabled={!preferences.push_enabled}
                    />
                    <span className="text-slate-700 dark:text-slate-300 capitalize">
                      {category === 'batch'
                        ? 'Batch Updates'
                        : category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                  </label>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {enabled ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sound & Vibration */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Notification Behavior
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.sound_enabled}
                    onChange={handleToggleSound}
                    className="rounded border-slate-300"
                    disabled={!preferences.push_enabled}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Sound</span>
                </label>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    preferences.sound_enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {preferences.sound_enabled ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.vibration_enabled}
                    onChange={handleToggleVibration}
                    className="rounded border-slate-300"
                    disabled={!preferences.push_enabled}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Vibration</span>
                </label>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    preferences.vibration_enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {preferences.vibration_enabled ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Quiet Hours
              </h2>
              <button
                onClick={handleToggleQuietHours}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  preferences.quiet_hours_enabled
                    ? 'bg-green-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    preferences.quiet_hours_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {preferences.quiet_hours_enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start || '22:00'}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end || '08:00'}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., America/New_York"
                    value={preferences.quiet_hours_timezone || 'UTC'}
                    onChange={(e) => handleQuietHoursChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Uses IANA timezone format (e.g., America/New_York, Europe/London)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleTestNotification}
              disabled={isTesting || !hasSubscription}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isTesting ? 'Sending...' : 'Test Notification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
