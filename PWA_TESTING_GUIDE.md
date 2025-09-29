# PWA Testing Guide - Emmanuel Assembly

## Overview

This guide covers testing the Progressive Web App (PWA) features of the Emmanuel Assembly Church Management System.

## PWA Features Implemented

### 1. Web App Manifest

- **Location**: `/public/manifest.json`
- **Features**:
  - App name, description, and branding
  - Multiple icon sizes (72x72 to 512x512)
  - Theme colors matching church branding
  - App shortcuts for quick access
  - Standalone display mode

### 2. Service Worker

- **Location**: `/public/sw.js`
- **Features**:
  - Offline caching of static assets
  - Network-first strategy for API calls
  - Cache-first strategy for static resources
  - Offline fallback page
  - Background sync capabilities

### 3. Push Notifications

- **Implementation**: Service worker + PWA hooks
- **Features**:
  - Notification permission handling
  - Push subscription management
  - Click handling for notifications
  - Custom notification styling

### 4. Offline Synchronization

- **Component**: `components/offline-sync.tsx`
- **Features**:
  - Queue management for offline actions
  - Automatic sync when online
  - Manual sync triggers
  - Error handling and retry logic
  - Status indicators

### 5. Install Prompts

- **Components**: `components/pwa-install-prompt.tsx`
- **Features**:
  - Automatic install prompts
  - Floating install button
  - Installation status tracking
  - User-friendly installation flow

## Testing Instructions

### Desktop Testing (Chrome/Edge)

1. **Open the application** in Chrome or Edge
2. **Check PWA indicators**:
   - Look for install icon in address bar
   - Check Application tab in DevTools
3. **Test installation**:
   - Click install icon or use menu "Install Emmanuel Assembly"
   - Verify app appears in applications list
   - Test standalone mode (no browser UI)
4. **Test offline functionality**:
   - Go offline in DevTools Network tab
   - Navigate to different pages
   - Verify offline page appears when needed
   - Test cached content loads

### Mobile Testing (Android/iOS)

#### Android (Chrome)

1. **Open in Chrome** on Android device
2. **Install prompt** should appear automatically
3. **Add to Home Screen**:
   - Tap menu (three dots)
   - Select "Add to Home screen"
   - Confirm installation
4. **Test as installed app**:
   - Launch from home screen
   - Verify standalone mode
   - Test offline functionality

#### iOS (Safari)

1. **Open in Safari** on iOS device
2. **Add to Home Screen**:
   - Tap Share button
   - Select "Add to Home Screen"
   - Confirm installation
3. **Test as installed app**:
   - Launch from home screen
   - Verify standalone mode
   - Test offline functionality

### PWA Audit Testing

1. **Lighthouse PWA Audit**:

   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Select "Progressive Web App"
   - Run audit
   - Verify all PWA criteria pass

2. **Manifest Validation**:

   - Visit: https://web.dev/manifest/
   - Upload or test manifest.json
   - Verify all fields are valid

3. **Service Worker Testing**:
   - Open DevTools Application tab
   - Check Service Workers section
   - Verify registration and activation
   - Test cache storage

### Feature-Specific Testing

#### Offline Sync Component

1. **Navigate to Dashboard**
2. **Check offline sync status**:
   - Verify online/offline indicator
   - Check pending items count
   - Test manual sync button
3. **Test offline scenarios**:
   - Go offline
   - Perform actions (add member, record attendance)
   - Go back online
   - Verify automatic sync

#### Push Notifications

1. **Grant notification permission**
2. **Test notification display**:
   - Use "Enable Notifications" button
   - Verify notification appears
3. **Test notification click**:
   - Click notification
   - Verify app opens/focuses
   - Check correct page loads

#### Install Prompts

1. **First visit** should show install prompt
2. **Dismiss prompt** and verify floating button appears
3. **Test installation flow**:
   - Click install button
   - Follow installation steps
   - Verify app installs successfully

## Performance Testing

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: Should be < 2.5s
- **FID (First Input Delay)**: Should be < 100ms
- **CLS (Cumulative Layout Shift)**: Should be < 0.1

### PWA Performance

- **First Contentful Paint**: Should be fast due to caching
- **Time to Interactive**: Should be improved with service worker
- **Offline functionality**: Should work without network

## Browser Compatibility

### Supported Browsers

- **Chrome**: 70+
- **Firefox**: 70+
- **Safari**: 11.1+
- **Edge**: 79+

### Feature Support

- **Service Workers**: Chrome 40+, Firefox 44+, Safari 11.1+
- **Push Notifications**: Chrome 42+, Firefox 44+, Safari 16+
- **Web App Manifest**: Chrome 38+, Firefox 41+, Safari 11.3+

## Troubleshooting

### Common Issues

1. **Service Worker Not Registering**:

   - Check browser console for errors
   - Verify sw.js is accessible
   - Check HTTPS requirement

2. **Install Prompt Not Showing**:

   - Verify manifest.json is valid
   - Check PWA criteria are met
   - Ensure user engagement

3. **Offline Page Not Loading**:

   - Check service worker cache
   - Verify offline.html exists
   - Test network conditions

4. **Notifications Not Working**:
   - Check permission status
   - Verify VAPID keys (if using)
   - Test on supported browsers

### Debug Tools

1. **Chrome DevTools**:

   - Application tab for PWA features
   - Lighthouse for PWA audit
   - Network tab for offline testing

2. **PWA Builder**:
   - Visit: https://www.pwabuilder.com/
   - Test manifest and service worker
   - Generate platform-specific packages

## Production Deployment

### Pre-deployment Checklist

- [ ] Manifest.json is valid
- [ ] Service worker is registered
- [ ] All icons are generated and optimized
- [ ] HTTPS is enabled
- [ ] PWA audit passes
- [ ] Offline functionality works
- [ ] Push notifications work
- [ ] Install prompts work

### Deployment Steps

1. **Build the application**: `npm run build`
2. **Test locally**: `npm run start`
3. **Deploy to production**
4. **Verify PWA features** in production
5. **Submit to app stores** (optional)

## Monitoring

### Analytics

- Track PWA installations
- Monitor offline usage
- Measure performance metrics
- Track notification engagement

### Error Monitoring

- Service worker errors
- Cache failures
- Sync failures
- Notification failures

## Next Steps

### Enhancements

1. **Background Sync**: Implement for critical data
2. **Push Notifications**: Add server-side push
3. **App Store Distribution**: Create platform packages
4. **Advanced Caching**: Implement more sophisticated strategies
5. **Offline-First**: Make core features work offline

### Maintenance

1. **Regular PWA audits**
2. **Service worker updates**
3. **Cache management**
4. **Performance monitoring**
5. **User feedback collection**
