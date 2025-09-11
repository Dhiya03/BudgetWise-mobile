import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { hasAccessTo, Feature } from '../subscriptionManager';
import { trackEvent } from '../utils/analytics';
import type { Mock } from 'vitest';
import { renderWithProvider } from '../setupTests';

// Mock dependencies
vi.mock('../subscriptionManager');
vi.mock('../utils/analytics');
vi.mock('@capacitor/local-notifications');
vi.mock('@capacitor/app');
vi.mock('../billing/AdsManager');
vi.mock('../billing/BillingManager');
vi.mock('../components/FinancialTipsService', () => ({
  default: {
    getUserLanguage: () => 'en',
    getTodaysTip: () => null,
  }
}));

describe('SettingsTab Language Selection', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    // Default to premium user
    (hasAccessTo as Mock).mockReturnValue(true);
  });

  it('should show language selection dropdown for premium users', async () => {
    // Arrange: User has access to the feature
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature === Feature.LanguageSelection);

    // Act
    renderWithProvider(<App />);
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
    renderWithProvider(<App />);
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

  it('should call the language change handler and update localStorage when a new language is selected', async () => {
    // Arrange: User has access
    (hasAccessTo as Mock).mockImplementation((feature: Feature) => feature === Feature.LanguageSelection);

    // Act
    renderWithProvider(<App />);
    // Navigate to the settings tab
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    const languageSelect = screen.getByLabelText('App Language');
    await fireEvent.change(languageSelect, { target: { value: 'hi' } });

    // Assert
    expect(screen.getByText('Language changed to हिंदी (Hindi)')).toBeInTheDocument();
    expect(localStorage.setItem).toHaveBeenCalledWith('budgetwise_user_language', 'hi');
  });
});