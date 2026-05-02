# Push Notifications Quick Start

## What Was Built
A complete push notification system for GrainHero including browser notifications, user preferences, quiet hours, and notification categories.

---

## Quick Setup (5 Steps)

### 1. Generate VAPID Keys
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### 2. Set Backend Environment Variables
```env
WEB_PUSH_PUBLIC_KEY=your_public_key
WEB_PUSH_PRIVATE_KEY=your_private_key
WEB_PUSH_EMAIL=admin@yourdomain.com
```

### 3. Set Frontend Environment Variables
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
```

### 4. Run Migration Script
```bash
cd farmHomeBackend-main
node scripts/migrate-push-notifications.js
```

### 5. Deploy & Test
- Deploy backend and frontend
- Load app, enable notifications when prompted
- Go to `/notification-settings` to customize preferences
- Click "Test Notification" to verify

---

## File Structure

### Backend
```
farmHomeBackend-main/
├── models/
│   ├── Notification.js (modified - added push fields)
│   └── UserPushSubscription.js (NEW)
├── services/
│   ├── notificationService.js (modified - added push methods)
│   └── pushNotificationAdapter.js (NEW)
├── routes/
│   └── notifications.js (modified - added push endpoints)
└── scripts/
    └── migrate-push-notifications.js (NEW)
```

### Frontend
```
farmHomeFrontend-main/
├── public/
│   └── sw.js (NEW - Service Worker)
├── lib/
│   └── push-notifications.ts (NEW - Push manager)
├── components/
│   └── push-notification-permission.tsx (NEW)
├── app/[locale]/
│   ├── providers.tsx (modified - added push init)
│   └── (authenticated)/
│       └── notification-settings/
│           └── page.tsx (NEW)
└── PUSH_NOTIFICATIONS_*.md (NEW - Documentation)
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications/subscribe` | POST | Register for push |
| `/api/notifications/unsubscribe` | POST | Unregister |
| `/api/notifications/preferences` | GET | Get settings |
| `/api/notifications/preferences` | PATCH | Update settings |
| `/api/notifications/test-push` | POST | Send test |
| `/api/notifications/push-config` | GET | Get config |

---

## Core Components

### Frontend
1. **PushNotificationManager** - Handles subscription and preferences
2. **PushPermissionPrompt** - User permission request UI
3. **NotificationSettings Page** - Full preferences UI

### Backend
1. **UserPushSubscription Model** - Stores subscriptions and preferences
2. **pushNotificationAdapter** - Handles Web Push/Firebase
3. **NotificationService** - Integrates push with existing notifications

---

## Usage Examples

### Send Push Notification
```javascript
await NotificationService.sendPushNotification({
  recipient_id: userId,
  title: 'Spoilage Alert',
  message: 'Spoilage detected in batch #123',
  category: 'spoilage',
  action_url: '/grain-batches/123'
});
```

### Get User Preferences
```javascript
const manager = getPushManager();
const { preferences } = await manager.getPreferences();
```

### Update Preferences
```javascript
const manager = getPushManager();
await manager.updatePreferences({
  push_enabled: true,
  categories: { spoilage: true, dispatch: false }
});
```

---

## Notification Categories
- **spoilage** - Grain spoilage alerts
- **dispatch** - Dispatch notifications
- **payment** - Payment confirmations
- **insurance** - Insurance alerts
- **invoice** - Invoice updates
- **batch** - Batch updates
- **system** - System notifications

---

## Features

✅ Real-time browser notifications  
✅ Granular notification preferences  
✅ Quiet hours (no notifications during sleep)  
✅ Sound and vibration control  
✅ Test notification  
✅ Device detection (desktop/mobile/tablet)  
✅ Subscription management  
✅ Web Push API + Firebase support  
✅ Automatic cleanup of invalid subscriptions  
✅ Type-safe TypeScript utilities  

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ⚠️ Limited (iOS 16+) |
| Opera | ✅ Full |

---

## Debugging

### Enable Logs
Service Worker logs start with `[SW]`  
Push Manager logs start with `[Push]`  
Check browser console for errors

### Test Subscription
Navigate to `/notification-settings` and click "Test Notification"

### Check Preferences
```javascript
const manager = getPushManager();
const data = await manager.getPreferences();
console.log(data);
```

### Verify Service Worker
- Open DevTools → Application → Service Workers
- Should see `/sw.js` with status "activated and running"

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No VAPID key error | Generate and set keys in .env |
| Service Worker not installing | Clear cache, reload, check HTTPS |
| Notifications not appearing | Check browser permissions, quiet hours, preferences |
| Subscription expired | Auto-cleaned by system, user can re-enable |
| Permission denied | User blocked in browser settings, can reset |

---

## Files to Review

1. **Setup**: `PUSH_NOTIFICATIONS_SETUP.md`
2. **Implementation**: `PUSH_NOTIFICATIONS_IMPLEMENTATION.md`
3. **Service Worker**: `public/sw.js`
4. **Push Manager**: `lib/push-notifications.ts`
5. **Settings Page**: `app/[locale]/(authenticated)/notification-settings/page.tsx`
6. **Backend Routes**: `routes/notifications.js`
7. **Push Adapter**: `services/pushNotificationAdapter.js`

---

## Next Steps

1. Configure environment variables
2. Run migration script
3. Deploy backend
4. Deploy frontend
5. Test in development
6. Monitor in production

---

## Rollout Strategy

1. **Week 1**: Deploy code, migration complete
2. **Week 2**: Soft launch (visible in UI, optional)
3. **Week 3**: Monitor adoption, fix issues
4. **Week 4**: Full rollout with announcements

---

## Support

See full documentation in:
- `PUSH_NOTIFICATIONS_SETUP.md` - Complete setup guide
- `PUSH_NOTIFICATIONS_IMPLEMENTATION.md` - Technical details
- Code comments in implementation files

Generated: 2026-05-03
System: GrainHero Push Notifications v1.0
