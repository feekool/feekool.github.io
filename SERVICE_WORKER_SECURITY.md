# Service Worker Security Implementation

## Overview
This implementation uses a Service Worker to securely handle GitHub API authentication, preventing token exposure in browser DevTools Network tab.

## Architecture

### 1. Token Storage
- GitHub Personal Access Token is stored in IndexedDB within the Service Worker context
- Token is never accessible from the main application thread after initial setup
- Token is encrypted at rest using browser's IndexedDB security

### 2. Request Interception
- Service Worker intercepts all requests to `https://api.github.com`
- Adds `Authorization: Bearer <token>` header to intercepted requests
- Main application makes requests without auth headers

### 3. Security Benefits
- **Network Tab Protection**: Authorization headers are not visible in DevTools
- **Token Isolation**: Token exists only in Service Worker scope
- **Automatic Cleanup**: Token cleared on logout
- **CSP Compliance**: Requests are made through controlled proxy

### 4. Implementation Files

#### `/public/sw.js`
Service Worker that handles request interception and token storage.

#### `/src/lib/serviceWorker.ts`
Manager class for Service Worker registration and token management.

#### `/src/lib/github.ts`
GitHub API client (modified to not include auth headers directly).

#### `/src/config/app.ts`
Configuration with token validation and Service Worker initialization.

## Usage

1. **Registration**: Service Worker registers automatically on app start
2. **Token Setup**: Token is sent to Service Worker on app initialization
3. **API Calls**: All GitHub API calls are intercepted and authenticated
4. **Cleanup**: Token cleared from storage on user logout

## Security Considerations

- Service Worker code is public but token is stored securely in IndexedDB
- Token is never logged or exposed in error messages
- All network requests are sanitized
- CSP headers prevent unauthorized script execution

## Browser Support

- Modern browsers with Service Worker support
- IndexedDB for secure token storage
- Fallback to direct requests if Service Worker fails