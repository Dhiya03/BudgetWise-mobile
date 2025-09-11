import { FinancialTip, SupportedLanguage, SUPPORTED_LANGUAGES } from '../types';
import tipsData from '../data/financial-tips.json' with { type: 'json' };
import { getTier } from '../subscriptionManager';

const SHOWN_TIPS_STORAGE_KEY = 'budgetwise_shown_tip_ids';
const USER_LANGUAGE_STORAGE_KEY = 'budgetwise_user_language';

class FinancialTipsService {
  /**
   * Retrieves the user's preferred language from localStorage.
   * Defaults to 'en' if no language is set.
   */
  public static getUserLanguage(): SupportedLanguage {
    const lang = localStorage.getItem(USER_LANGUAGE_STORAGE_KEY);
    // Type guard to ensure the stored language is one of the supported ones.
    if (lang && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }
    return 'en';
  }

  /**
   * Gets the list of IDs of tips that have already been shown to the user.
   */
  private static getShownTipIds(): string[] {
    const storedIds = localStorage.getItem(SHOWN_TIPS_STORAGE_KEY);
    return storedIds ? JSON.parse(storedIds) : [];
  }

  /**
   * Saves the updated list of shown tip IDs to localStorage.
   */
  private static saveShownTipIds(ids: string[]): void {
    localStorage.setItem(SHOWN_TIPS_STORAGE_KEY, JSON.stringify(ids));
  }

  /**
   * Selects a random, un-shown tip for the day.
   * It ensures that tips do not repeat until all have been shown.
   * @returns A FinancialTip object or null if no tips are available.
   */
  public static getTodaysTip(): FinancialTip | null {
    const allTipsFromFile: FinancialTip[] = tipsData as FinancialTip[];
    const userTier = getTier();

    // Filter tips based on user's subscription tier
    const allowedDifficulties = {
      free: ['beginner'],
      plus: ['beginner', 'intermediate'],
      premium: ['beginner', 'intermediate', 'advanced'],
    };

    const allTips = allTipsFromFile.filter(tip =>
      allowedDifficulties[userTier].includes(tip.difficulty)
    );

    if (allTips.length === 0) {
      return null;
    }

    let shownIds = this.getShownTipIds();

    // Find tips that have not been shown yet
    let availableTips = allTips.filter(tip => !shownIds.includes(tip.id));

    // If all tips have been shown, reset the list and start over
    if (availableTips.length === 0 && allTips.length > 0) {
      shownIds = [];
      availableTips = allTips;
    }

    // Select a random tip from the available ones
    const randomIndex = Math.floor(Math.random() * availableTips.length);
    const selectedTip = availableTips[randomIndex];

    // Update the list of shown IDs and save it
    shownIds.push(selectedTip.id);
    this.saveShownTipIds(shownIds);

    return selectedTip;
  }
}

export default FinancialTipsService;