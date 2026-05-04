# Rate Limit Error Handling

## Overview

This feature automatically detects GitHub API rate limit errors and shows a user-friendly modal with instructions on how to resolve the issue.

## How It Works

1. **Error Detection**: All GitHub API calls are monitored for rate limit errors
2. **Modal Display**: When a rate limit is detected, a modal appears with helpful instructions
3. **Multilingual Support**: Messages are shown in English or Russian based on user language preference
4. **Non-Blocking**: Users can close the modal and continue using other features

## Error Patterns Detected

The system detects rate limit errors by checking for these patterns in error messages:
- "rate limit"
- "api rate limit"
- "too many requests"
- "403 forbidden" (GitHub returns 403 for rate limits)
- "secondary rate limit"
- "exceeded"
- "limit exceeded"

## User Experience

### English Version
```
Rate Limit Exceeded
You have exceeded the GitHub API rate limit. To continue using the application, please enable VPN or change your IP address.

What to do:
• Enable VPN
• Change your IP address
• Wait for limit reset (usually 1 hour)
```

### Russian Version
```
Превышен лимит запросов
Вы превысили лимит запросов к API GitHub. Чтобы продолжить пользоваться приложением, включите VPN или смените IP-адрес.

Что делать:
• Включите VPN
• Смените IP-адрес
• Подождите сброса лимита (обычно 1 час)
```

## Implementation Details

### Files Modified
- `src/components/RateLimitModal.tsx` - Modal component with bilingual messages
- `src/lib/rateLimit.tsx` - Context provider for modal management
- `src/lib/apiErrorHandler.ts` - Error detection and handling logic
- `src/lib/github.ts` - Updated to use new error handler
- `src/App.tsx` - Added RateLimitProvider to component tree

### Security Considerations
- Rate limit events are logged securely without exposing tokens
- Modal can be dismissed by user
- No sensitive information is displayed in error messages
- Compatible with existing error handling systems

## Testing

To test the rate limit modal:
1. Temporarily modify the token to an invalid one
2. Make API calls until rate limit is triggered
3. The modal should appear automatically

## Future Enhancements

- Automatic retry with exponential backoff
- Rate limit status display in UI
- Integration with GitHub's rate limit headers for proactive warnings