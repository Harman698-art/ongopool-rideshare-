# OnGoPool Rideshare Platform

## Project Overview
OnGoPool is a comprehensive rideshare platform connecting drivers and passengers across Canada with transparent pricing, real-time tracking, and secure payments. This mobile web application uses vanilla HTML, CSS, and JavaScript to create a responsive and interactive user experience.

## Key Features
- User authentication (passenger/driver roles)
- Ride posting and searching
- Booking management
- Earnings tracking and analytics
- Payment processing
- User profiles and settings

## Architecture
The application follows a single-page architecture (SPA) pattern with page-based navigation managed through the `showPage()` function in `js/app.js`.

### File Structure
```
src/
├── index.html          # Main entry point with all pages
├── css/
│   ├── styles.css      # Main stylesheet
│   └── new-pages-styles.css # Additional page styles
└── js/
    ├── app.js          # Main application logic and page management
    ├── auth.js         # Authentication functionality
    ├── rides.js        # Ride management features
    ├── maps.js         # Location and mapping features
    ├── payments.js     # Payment processing
    ├── notifications.js # Notification system
    ├── pwa.js          # Progressive Web App features
    └── supabase.js     # Database connection
```

## Development Commands

### Local Development
```bash
# Serve locally using any static file server
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

## Important Implementation Details

### Page Navigation System
The app uses a page-based navigation system where all "pages" exist in the DOM but only one is shown at a time via the `showPage()` method in `app.js`. When navigating between pages:

1. The current page slides out with animation
2. The target page slides in
3. Page-specific data is loaded via the `loadPageData()` method

### Query Selectors and DOM Elements
**IMPORTANT:** Many elements with the same class name exist across different pages. When selecting elements:
- Always scope selectors to the specific page context (e.g., `earningsPage.querySelectorAll('.stat-card')`)
- Do not use document-wide selectors for page-specific elements
- Use page-specific IDs to distinguish between similar elements

### Earnings Page Implementation
The earnings page contains several dynamic components:
- Earnings summary cards with weekly/monthly statistics
- Interactive chart with filter tabs for different time periods
- Performance metrics display
- Transaction history

When making changes to the earnings page, ensure:
- All query selectors are scoped to the `#earnings-page` container
- The `setupEarningsPage()` function is called when navigating to the page
- Chart data updates respond to filter tab changes

### Common Issues and Solutions
- **Error: null is not an object when updating statistics**: Always scope element selectors to the current page context
- **Page transitions not working**: Check that pages have the correct class structure with `.page` class
- **Data not loading**: Verify the page-specific data loading function is called in `loadPageData()`

## Testing
Manual testing is currently the primary method for verifying functionality. For each feature:
1. Test basic navigation and UI rendering
2. Verify data loading and display
3. Test all interactive elements (buttons, forms, filters)
4. Check responsive behavior on different screen sizes

## Browser Support
The application is optimized for mobile browsers but should work on all modern browsers. It includes touch-specific interaction improvements for mobile users.