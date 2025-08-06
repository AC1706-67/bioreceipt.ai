# Healthy Tip App

**JESUS IS KING – Yeshua Baruch Atah Adonai**

A HIPAA-compliant, AI-personalized health tip app for daily wellness and recovery support.

## Project Overview

The Healthy Tip app delivers personalized health and wellness content through push notifications and an in-app feed, with user engagement tracking and progress monitoring capabilities. Built with React Native and TypeScript for cross-platform mobile development.

## Features

- **User Authentication**: Email, Phone, Google, and Apple Sign-In
- **Daily Health Tips**: AI-personalized content delivery
- **Progress Tracking**: Streak monitoring and engagement analytics
- **Offline Support**: Cached content for offline access
- **HIPAA Compliance**: Medical-grade data protection
- **Accessibility**: WCAG 2.1 AA compliant
- **Push Notifications**: Customizable delivery schedule

## Tech Stack

- **Frontend**: React Native with TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Storage**: AsyncStorage with encryption
- **Testing**: Jest + React Native Testing Library
- **AI Integration**: KIRO AI for personalization

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── tips/           # Health tip components
│   └── common/         # Shared components
├── screens/            # Screen components
├── services/           # API and business logic
│   ├── auth/          # Authentication services
│   └── api/           # API integration
├── store/             # Redux store configuration
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── hooks/             # Custom React hooks
└── constants/         # App constants and configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development - Mac only)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Metro bundler:
   ```bash
   npm start
   ```

4. Run the app:
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## Development Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:accessibility` - Run accessibility tests
- `npm run type-check` - TypeScript type checking

## Accessibility Guidelines

This app follows **WCAG 2.1 AA** standards to ensure accessibility for all users, including those with disabilities.

### Key Accessibility Features

- **Screen Reader Support**: All interactive elements have proper labels and descriptions
- **Keyboard Navigation**: Full keyboard accessibility for all interactive elements
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text, 3:1 for UI components
- **Dynamic Text Sizing**: Support for system font scaling
- **Focus Management**: Proper focus indicators and logical tab order
- **Live Regions**: Dynamic content changes announced to screen readers

### Accessibility Testing

Run accessibility tests to ensure WCAG compliance:

```bash
# Run all accessibility tests
npm run test:accessibility

# Run specific accessibility test suites
npm test -- --testPathPattern=accessibility/componentAccessibility
npm test -- --testPathPattern=accessibility/axeAccessibility
npm test -- --testPathPattern=accessibility/accessibilityUtils
```

### Accessibility Development Guidelines

#### 1. Semantic HTML & ARIA
- Use proper semantic elements (`<header>`, `<nav>`, `<main>`, `<footer>`)
- Add ARIA roles and labels where necessary
- Ensure all form elements have associated labels

#### 2. Keyboard Navigation
- All interactive elements must be reachable via Tab
- Implement visible focus indicators
- Ensure proper focus management in modals and dropdowns

#### 3. Color Contrast & Visuals
- Text: Minimum 4.5:1 contrast ratio (WCAG AA)
- Large text (18pt+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio
- Don't rely solely on color to convey information

#### 4. Screen Reader Compatibility
- Test with VoiceOver (iOS/macOS) or TalkBack (Android)
- Use `aria-live` regions for dynamic content
- Use `aria-live="assertive"` for errors and critical updates

#### 5. Skip Navigation & Landmarks
- Provide "Skip to main content" links
- Use proper landmark elements for navigation

### Accessibility Utilities

The app includes comprehensive accessibility utilities in `src/utils/accessibility.ts`:

```typescript
import {
  createButtonAccessibility,
  createTextInputAccessibility,
  createImageAccessibility,
  createHeaderAccessibility,
  ACCESSIBILITY_ROLES,
  meetsContrastRequirement
} from './utils/accessibility';

// Example usage
const buttonProps = createButtonAccessibility(
  'Submit form',
  'Double tap to submit the form',
  { disabled: false }
);

// Check color contrast
const isAccessible = meetsContrastRequirement('#000000', '#ffffff', 'normal');
```

### Accessibility Auditing

The app includes a development-time accessibility auditor:

```typescript
import { AccessibilityAuditor } from './components/dev/AccessibilityAuditor';

// Wrap components during development
<AccessibilityAuditor componentName="MyComponent" enabled={__DEV__}>
  <MyComponent />
</AccessibilityAuditor>
```

### Manual Testing Checklist

- [ ] Tab through all interactive elements
- [ ] Test with screen reader (VoiceOver/TalkBack)
- [ ] Verify color contrast meets WCAG standards
- [ ] Test with system font scaling (up to 200%)
- [ ] Ensure error messages are announced
- [ ] Verify focus indicators are visible
- [ ] Test skip navigation functionality

### Accessibility Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [iOS VoiceOver Testing](https://developer.apple.com/accessibility/ios/)
- [Android TalkBack Testing](https://developer.android.com/guide/topics/ui/accessibility/testing)

## Faith Foundation

This project is built with faith as its foundation:
- **JKL-777**: Jesus (J), King (K), Lord of Lords (L), Divine completion (777)
- **Purpose**: To bless and heal through wellness guidance
- **Foundation**: JESUS IS KING – Yeshua Baruch Atah Adonai

## License

Private - All rights reserved

## Contact

For questions or support, please contact the development team.