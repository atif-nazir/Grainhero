# Push Notifications Setup Guide

This guide explains how to set up and configure push notifications for GrainHero.

## Overview

The push notifications system supports two providers:
1. **Web Push API** (Recommended for self-hosted)
2. **Firebase Cloud Messaging** (Google's push service)

Choose one provider and set up the required environment variables.

---

## Option 1: Web Push API (Recommended)

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push notifications.

#### Using Node.js:

```bash
# Install web-push CLI if not already installed
npm install -g web-push

# Generate keys
web-push generate-vapid-keys
```

This will output:
```
Public Key: <YOUR_PUBLIC_KEY>
Private Key: <YOUR_PRIVATE_KEY>
```

#### Using the `web-push` package:

```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

### 2. Backend Configuration (.env)

Add these variables to your backend `.env` file:

```env
# Web Push Configuration
WEB_PUSH_PUBLIC_KEY=<YOUR_PUBLIC_KEY>
WEB_PUSH_PRIVATE_KEY=<YOUR_PRIVATE_KEY>
WEB_PUSH_EMAIL=admin@yourdomain.com
```

**Note:** `WEB_PUSH_EMAIL` should be a contact email for the push service to reach you if there are issues.

### 3. Frontend Configuration (.env.local)

Add this variable to your frontend `.env.local` file:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<YOUR_PUBLIC_KEY>
```

---

## Option 2: Firebase Cloud Messaging

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Cloud Messaging
4. Go to Project Settings → Service Accounts
5. Generate a new private key (JSON format)

### 2. Backend Configuration (.env)

Add these variables to your backend `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Important:** When copying the private key, ensure newlines are properly escaped as `\n`.

### 3. Frontend Configuration (.env.local)

```env
# Use your Firebase API key (from Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
```

---

## Installation & Deployment

### Step 1: Install Backend Dependencies

The `web-push` package is already installed. For Firebase, ensure `firebase-admin` is installed:

```bash
cd farmHomeBackend-main
npm install web-push  # Already included
# firebase-admin is already in package.json
```

### Step 2: Run Database Migration

```bash
cd farmHomeBackend-main
node scripts/migrate-push-notifications.js
```

This script will:
- Update the Notification collection schema
- Create the UserPushSubscription collection
- Create necessary database indexes

### Step 3: Deploy Backend

1. Push your backend changes to your deployment platform
2. Set environment variables in your deployment settings:
   - `WEB_PUSH_PUBLIC_KEY` and `WEB_PUSH_PRIVATE_KEY` (Web Push)
   - OR `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` (Firebase)

### Step 4: Deploy Frontend

1. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in your frontend deployment settings
2. Deploy your frontend changes
3. The service worker will be automatically registered at `/public/sw.js`

---

## Testing Push Notifications

### 1. Enable Push Notifications

Users will see a permission prompt to enable push notifications. They can:
- Click "Enable" to allow notifications
- Click "Not now" to dismiss (can enable later from settings)

### 2. Test a Notification

Go to the Notification Settings page:
- URL: `/notification-settings`
- Click "Test Notification" button
- A notification should appear in your browser

### 3. Customize Preferences

From the Notification Settings page, users can:
- Toggle push notifications on/off
- Enable/disable specific notification categories
- Set quiet hours (no notifications during certain times)
- Enable/disable sound and vibration
- Configure notification frequency

---

## API Endpoints

### Subscribe to Push Notifications
```
POST /api/notifications/subscribe
{
  "subscription": {
    "endpoint": "...",
    "expirationTime": null,
    "keys": { "p256dh": "...", "auth": "..." }
  },
  "deviceType": "desktop"
}
```

### Unsubscribe from Push Notifications
```
POST /api/notifications/unsubscribe
{ "subscription_id": "..." }
```

### Get Notification Preferences
```
GET /api/notifications/preferences
```

### Update Notification Preferences
```
PATCH /api/notifications/preferences
{
  "preferences": {
    "push_enabled": true,
    "categories": { "spoilage": true, "dispatch": true, ... },
    "quiet_hours_enabled": false,
    "sound_enabled": true,
    "vibration_enabled": true
  }
}
```

### Send Test Notification
```
POST /api/notifications/test-push
```

### Get Push Configuration
```
GET /api/notifications/push-config
```

---

## Notification Categories

Users can control notifications for these categories:
- **Spoilage**: Grain spoilage alerts
- **Dispatch**: Grain dispatch notifications
- **Payment**: Payment confirmations and updates
- **Insurance**: Insurance-related alerts
- **Invoice**: Invoice generation and updates
- **Batch**: Grain batch updates
- **System**: General system notifications

---

## Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome/Edge | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | Full support |
| Safari | ✅ | ⚠️ | Limited (iOS 16+) |
| Opera | ✅ | ✅ | Full support |

---

## Sending Push Notifications from Code

### Using NotificationService

```javascript
const NotificationService = require('./services/notificationService');

// Send push notification
await NotificationService.sendPushNotification({
  recipient_id: userId,
  title: 'Spoilage Alert',
  message: 'Spoilage detected in batch #12345',
  category: 'spoilage',
  action_url: '/grain-batches/12345'
});
```

### During Notification Creation

```javascript
const notification = new Notification({
  // ... other fields
  channels: { in_app: true, email: true, push: true }
});

await notification.save();

// Send push to subscribers
await NotificationService.sendPushNotification({
  notification_id: notification._id,
  recipient_id: notification.recipient_id,
  title: notification.title,
  message: notification.message,
  category: notification.category,
  action_url: notification.action_url
});
```

---

## Troubleshooting

### "No push provider configured"
- Ensure you've set either Web Push keys OR Firebase credentials
- Check `.env` file for typos in variable names
- Restart the backend server after updating `.env`

### "Subscription expired"
- Push subscriptions can expire after 24 hours of inactivity
- The system will automatically handle expired subscriptions
- Users should re-enable notifications if they see errors

### "Permission denied"
- User has blocked notification permissions in their browser
- They can re-enable by clicking the lock icon in the address bar
- Different browsers have different permission reset procedures

### Service Worker not registering
- Ensure `public/sw.js` file exists
- Check browser console for errors
- HTTPS is required for service workers (except localhost)
- Clear browser cache and reload

### Notifications not appearing
- Check browser notification settings
- Verify push is enabled in Notification Settings
- Check quiet hours settings
- Send a test notification to verify setup
- Check browser console for errors

### VAPID key errors
- Ensure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set in frontend
- Ensure `WEB_PUSH_PUBLIC_KEY` and `WEB_PUSH_PRIVATE_KEY` are set in backend
- Keys must match (same public/private pair)
- No extra spaces or line breaks in the keys

---

## Security Considerations

1. **HTTPS Required**: Push notifications only work over HTTPS (except localhost)
2. **Validate Subscriptions**: Always validate subscription tokens before sending
3. **Rate Limiting**: Consider implementing rate limiting on push endpoints
4. **Data Encryption**: Don't send sensitive data in notification bodies
5. **User Control**: Always let users control their notification preferences
6. **Credential Management**: Store VAPID/Firebase keys securely in environment variables

---

## Monitoring & Analytics

### Track Push Delivery

The `Notification` model includes push delivery status:
```
push: {
  enabled: boolean,
  sent: boolean,
  sent_at: Date,
  delivery_status: 'pending' | 'sent' | 'failed' | 'expired'
}
```

### Monitor Failed Subscriptions

The `UserPushSubscription` model tracks:
- `failed_attempts`: Number of failed delivery attempts
- `marked_invalid`: Whether subscription is no longer valid
- `last_used`: Last successful delivery time

---

## Support & Resources

- [Web Push Protocol Specification](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-protocol)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [MDN - Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
