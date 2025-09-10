import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { hasAccessTo, Feature } from '../subscriptionManager';
import { trackEvent } from '../utils/analytics';
import type { Mock } from 'vitest';

// Mock dependencies
vi.mock('../subscriptionManager');
vi.mock('../utils/analytics');
vi.mock('@capacitor/local-notifications');
vi.mock('@capacitor/app');
vi.mock('../billing/AdsManager');
vi.mock('../billing/BillingManager');

describe('SettingsTab Language Selection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should show language selection dropdown for premium users', async () => {
    // Arrange: User has access to the feature
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature === Feature.LanguageSelection);

    // Act
    render(<App />);
    // Navigate to the settings tab
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    // Assert
    expect(screen.getByText('Language Settings')).toBeInTheDocument();
    expect(screen.queryByText('Unlock 3 Indian Languages')).not.toBeInTheDocument();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('should show upgrade banner and track events for free users', async () => {
    // Arrange: User does not have access
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature !== Feature.LanguageSelection);

    // Act
    render(<App />);
    // Navigate to the settings tab
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    // Assert: Banner is shown and view event is tracked
    expect(screen.getByText('Unlock 3 Indian Languages')).toBeInTheDocument();
    expect(screen.queryByText('Language Settings')).not.toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('upgrade_prompt_viewed', {
      feature: 'language_selection',
    });

    // Act: User clicks the upgrade button
    const viewPlansButton = screen.getByRole('button', { name: /view plans/i });
    fireEvent.click(viewPlansButton);

    // Assert: Click event is tracked
    expect(trackEvent).toHaveBeenCalledWith('upgrade_prompt_clicked', {
      feature: 'language_selection',
    });
    expect(trackEvent).toHaveBeenCalledTimes(2);
  });
});