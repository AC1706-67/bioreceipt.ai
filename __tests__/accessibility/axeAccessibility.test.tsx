/**
 * Axe Accessibility Tests
 * Automated WCAG 2.1 AA compliance testing using jest-axe
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { axe, toHaveNoViolations } from 'jest-axe';

// Import components to test
import { TipCard } from '../../src/components/tips/TipCard';
import { ProgressCard } from '../../src/components/progress/ProgressCard';
import { FriendlyErrorScreen } from '../../src/components/error/FriendlyErrorScreen';
import { ConsentManager } from '../../src/components/analytics/ConsentManager';

// Mock data
const mockTip = {
  id: 'tip-1',
  title: 'Stay Hydrated',
  content: 'Drink at least 8 glasses of water daily for optimal health.',
  category: 'wellness' as const,
  difficulty: 'easy' as const,
  estimatedReadTime: 2,
  tags: ['hydration', 'health'],
  imageUrl: 'https://example.com/water.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProgress = {
  currentStreak: 5,
  longestStreak: 12,
  totalTipsCompleted: 25,
  weeklyGoal: 7,
  completedThisWeek: 4,
};

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Accessibility (WCAG 2.1 AA) Compliance Tests', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('TipCard Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TipCard
          tip={mockTip}
          onAction={jest.fn()}
          isLiked={false}
          isBookmarked={false}
          isCompleted={false}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with interactive states', async () => {
      const { container } = render(
        <TipCard
          tip={mockTip}
          onAction={jest.fn()}
          isLiked={true}
          isBookmarked={true}
          isCompleted={false}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations when completed', async () => {
      const { container } = render(
        <TipCard tip={mockTip} onAction={jest.fn()} isCompleted={true} />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ProgressCard Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ProgressCard
          title="Weekly Progress"
          progress={mockProgress}
          onViewDetails={jest.fn()}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with zero progress', async () => {
      const zeroProgress = {
        ...mockProgress,
        currentStreak: 0,
        completedThisWeek: 0,
      };

      const { container } = render(
        <ProgressCard
          title="Starting Progress"
          progress={zeroProgress}
          onViewDetails={jest.fn()}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('FriendlyErrorScreen Component', () => {
    it('should have no accessibility violations for network error', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const { container } = render(
        <FriendlyErrorScreen
          error={networkError}
          onRetry={jest.fn()}
          onGoHome={jest.fn()}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for validation error', async () => {
      const validationError = new Error('Invalid input provided');
      validationError.name = 'ValidationError';

      const { container } = render(
        <FriendlyErrorScreen
          error={validationError}
          onRetry={jest.fn()}
          onGoHome={jest.fn()}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for generic error', async () => {
      const genericError = new Error('Something went wrong');

      const { container } = render(
        <FriendlyErrorScreen
          error={genericError}
          onRetry={jest.fn()}
          onGoHome={jest.fn()}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ConsentManager Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ConsentManager
          onConsentChange={jest.fn()}
          initialConsents={{
            analytics: false,
            marketing: false,
            personalization: true,
          }}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with all consents granted', async () => {
      const { container } = render(
        <ConsentManager
          onConsentChange={jest.fn()}
          initialConsents={{
            analytics: true,
            marketing: true,
            personalization: true,
          }}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Elements Accessibility', () => {
    it('should have no violations for text inputs with labels', async () => {
      const TestForm = () => (
        <form>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            aria-describedby="email-help"
          />
          <div id="email-help">Enter your email address</div>

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            required
            aria-describedby="password-help"
          />
          <div id="password-help">Password must be at least 8 characters</div>

          <button type="submit">Sign In</button>
        </form>
      );

      const { container } = render(<TestForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for checkbox groups', async () => {
      const TestCheckboxGroup = () => (
        <fieldset>
          <legend>Notification Preferences</legend>

          <div>
            <input
              type="checkbox"
              id="email-notifications"
              name="notifications"
              value="email"
            />
            <label htmlFor="email-notifications">Email Notifications</label>
          </div>

          <div>
            <input
              type="checkbox"
              id="push-notifications"
              name="notifications"
              value="push"
            />
            <label htmlFor="push-notifications">Push Notifications</label>
          </div>

          <div>
            <input
              type="checkbox"
              id="sms-notifications"
              name="notifications"
              value="sms"
            />
            <label htmlFor="sms-notifications">SMS Notifications</label>
          </div>
        </fieldset>
      );

      const { container } = render(<TestCheckboxGroup />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for radio button groups', async () => {
      const TestRadioGroup = () => (
        <fieldset>
          <legend>Difficulty Level</legend>

          <div>
            <input
              type="radio"
              id="easy"
              name="difficulty"
              value="easy"
              defaultChecked
            />
            <label htmlFor="easy">Easy</label>
          </div>

          <div>
            <input type="radio" id="medium" name="difficulty" value="medium" />
            <label htmlFor="medium">Medium</label>
          </div>

          <div>
            <input type="radio" id="hard" name="difficulty" value="hard" />
            <label htmlFor="hard">Hard</label>
          </div>
        </fieldset>
      );

      const { container } = render(<TestRadioGroup />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Navigation and Landmarks', () => {
    it('should have no violations for navigation structure', async () => {
      const TestNavigation = () => (
        <div>
          <header>
            <nav aria-label="Main navigation">
              <ul>
                <li>
                  <a href="/home">Home</a>
                </li>
                <li>
                  <a href="/tips">Tips</a>
                </li>
                <li>
                  <a href="/progress">Progress</a>
                </li>
                <li>
                  <a href="/profile">Profile</a>
                </li>
              </ul>
            </nav>
          </header>

          <main>
            <h1>Welcome to Healthy Tips</h1>
            <p>Your journey to better health starts here.</p>
          </main>

          <aside aria-label="Quick actions">
            <h2>Quick Actions</h2>
            <ul>
              <li>
                <button>View Today's Tip</button>
              </li>
              <li>
                <button>Check Progress</button>
              </li>
            </ul>
          </aside>

          <footer>
            <p>&copy; 2024 Healthy Tips App</p>
          </footer>
        </div>
      );

      const { container } = render(<TestNavigation />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for skip navigation', async () => {
      const TestSkipNav = () => (
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>

          <nav aria-label="Main navigation">
            <ul>
              <li>
                <a href="/home">Home</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
            </ul>
          </nav>

          <main id="main-content">
            <h1>Main Content</h1>
            <p>This is the main content area.</p>
          </main>
        </div>
      );

      const { container } = render(<TestSkipNav />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Dynamic Content and Live Regions', () => {
    it('should have no violations for live regions', async () => {
      const TestLiveRegions = () => (
        <div>
          <div aria-live="polite" aria-label="Status updates">
            <p>Tip saved successfully</p>
          </div>

          <div aria-live="assertive" aria-label="Error messages">
            <p role="alert">Please fix the following errors:</p>
          </div>

          <div aria-live="off" aria-label="Background updates">
            <p>Background sync in progress...</p>
          </div>
        </div>
      );

      const { container } = render(<TestLiveRegions />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations for progress indicators', async () => {
      const TestProgressIndicators = () => (
        <div>
          <div>
            <label htmlFor="file-upload">Upload Progress</label>
            <progress
              id="file-upload"
              value="32"
              max="100"
              aria-describedby="upload-status"
            >
              32%
            </progress>
            <div id="upload-status">32% complete</div>
          </div>

          <div>
            <label htmlFor="loading-spinner">Loading</label>
            <div
              id="loading-spinner"
              role="progressbar"
              aria-valuenow={undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Loading content"
            >
              <span aria-hidden="true">⟳</span>
            </div>
          </div>
        </div>
      );

      const { container } = render(<TestProgressIndicators />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images and Media', () => {
    it('should have no violations for images with alt text', async () => {
      const TestImages = () => (
        <div>
          <img
            src="https://example.com/health-tip.jpg"
            alt="Person drinking water outdoors"
          />

          <img
            src="https://example.com/decoration.jpg"
            alt=""
            role="presentation"
          />

          <figure>
            <img
              src="https://example.com/chart.jpg"
              alt="Bar chart showing weekly progress"
            />
            <figcaption>
              Weekly progress chart showing 5 out of 7 goals completed
            </figcaption>
          </figure>
        </div>
      );

      const { container } = render(<TestImages />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tables and Data', () => {
    it('should have no violations for data tables', async () => {
      const TestTable = () => (
        <table>
          <caption>Weekly Health Tip Completion</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Tips Completed</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Monday</th>
              <td>2</td>
              <td>Complete</td>
            </tr>
            <tr>
              <th scope="row">Tuesday</th>
              <td>1</td>
              <td>Partial</td>
            </tr>
            <tr>
              <th scope="row">Wednesday</th>
              <td>0</td>
              <td>Not Started</td>
            </tr>
          </tbody>
        </table>
      );

      const { container } = render(<TestTable />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Error Handling and Validation', () => {
    it('should have no violations for form validation errors', async () => {
      const TestFormErrors = () => (
        <form>
          <div>
            <label htmlFor="email-error">Email Address</label>
            <input
              id="email-error"
              type="email"
              name="email"
              required
              aria-invalid="true"
              aria-describedby="email-error-message"
            />
            <div id="email-error-message" role="alert" aria-live="assertive">
              Please enter a valid email address
            </div>
          </div>

          <div>
            <label htmlFor="password-error">Password</label>
            <input
              id="password-error"
              type="password"
              name="password"
              required
              aria-invalid="true"
              aria-describedby="password-error-message"
            />
            <div id="password-error-message" role="alert" aria-live="assertive">
              Password must be at least 8 characters long
            </div>
          </div>

          <button type="submit">Submit</button>
        </form>
      );

      const { container } = render(<TestFormErrors />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
