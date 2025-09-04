# BudgetWise App: UI Element Guide

This document provides a comprehensive overview of every user-facing element in the BudgetWise application, organized by tab and component.

---

## 🔒 Lock Screen

This is the first screen a user sees if a password is set. It secures the application data.

-   **Password Input**: Field where the user enters their password to unlock the application.
-   **Unlock Button**: Submits the entered password to gain access to the app's features.

---

## 🔝 Main Header

The header is always visible and provides a high-level summary and quick access to key actions.

-   **BudgetWise Title**: The name of the application.
-   **Advanced Export Button (Download Icon)**: Opens a modal with detailed options to export data in JSON or CSV format within a specific date range.
-   **Quick CSV Export Button (Upload Icon)**: Immediately downloads all transaction data into a single CSV file without extra options.
-   **Settings Button (Gear Icon)**: Opens the main settings modal for the application.
-   **Monthly Balance Card**: Displays the net financial position for the current month (Total Income - Total Expenses).
-   **Monthly Spent Card**: Shows the total amount of money spent from monthly budget categories in the current month.
-   **Custom Budgets Spent Card**: Displays the total amount spent across all active custom, purpose-driven budgets.
-   **Month Navigation (← and → buttons)**: Allows the user to navigate backward and forward through the months to view past or future financial data.

---

## 🧭 Bottom Navigation Bar

The primary method for switching between the main sections of the application.

-   **Add Button (+ Icon)**: Navigates to the form for adding a new transaction or editing an existing one.
-   **History Button (List Icon)**: Navigates to the screen that displays a complete list of all recorded transactions.
-   **Analytics Button (Chart Icon)**: Navigates to the dashboard for visualizing spending trends and financial analytics.
-   **Budget Button (Pie Chart Icon)**: Navigates to the section for managing both monthly and custom budgets.
-   **Settings Button (Gear Icon)**: Navigates to the application settings and data management page.
-   **Reminders Button (Bell Icon)**: Navigates to the bill reminders page.

---

## ➕ Add Transaction Tab

This is the central form for logging all financial activities.

-   **Expense / Income Buttons**: Toggles whether the transaction is money spent (expense) or money received (income).
-   **Monthly / Custom Budget Buttons**: Switches the transaction allocation between a general monthly category and a specific, purpose-driven custom budget.
-   **Category Dropdown (Monthly)**: Selects which standard monthly category (e.g., 'Food', 'Bills') the transaction belongs to.
-   **+ Add New Category Option**: Reveals an input field to create and add a new category to the monthly list.
-   **Custom Budget Dropdown**: Selects the specific custom budget (e.g., 'Vacation Fund') to which the transaction should be applied.
-   **Category within Budget Dropdown**: Selects the sub-category within the chosen custom budget (e.g., 'Flights', 'Hotels').
-   **Amount Input**: The field for entering the monetary value of the transaction.
-   **Description Input**: An optional field for adding notes. Typing here can trigger smart category suggestions.
-   **Tags Input**: A field for adding comma-separated tags (e.g., 'work', '2024') for advanced filtering and organization.
-   **Date Input**: A date picker to set when the transaction occurred.
-   **Recurring Transaction Toggle**: A switch to mark the transaction as one that reoccurs automatically.
-   **Frequency Dropdown (Recurring)**: Appears when recurring is toggled; sets the recurrence interval (daily, weekly, or monthly).
-   **Add / Update Transaction Button**: Saves the new transaction or applies changes to an existing one.
-   **Cancel Edit Button**: Appears only during an edit; discards changes and clears the form.

---

## 📜 History Tab / Activity Feed

This tab allows users to review, search, and manage their past financial activities, including both transactions and fund transfers.

-   **Sort by Dropdown**: Changes the order of the transaction list based on date, amount, or category name.
-   **Search Input**: Filters the transaction list in real-time based on text in the description or category.
-   **Filter Category Dropdown**: Narrows the list to show only transactions from a single, specific category.
-   **Transaction/Transfer List Item**: Each entry in the list displays details for a transaction or a fund transfer.
    -   **Edit Button (Pencil Icon)**: Loads the transaction's data into the 'Add' tab form for editing.
    -   **Delete Button (Trash Icon)**: Permanently removes the transaction from the records.

---

## 📊 Budget Tab

This is the hub for creating, viewing, and managing all budgets.

### Monthly Budget Section
-   **Category Dropdown**: Selects a monthly category to define a spending limit for.
-   **Budget Amount Input**: The field to enter the spending limit for the selected category.
-   **Set Monthly Budget Button**: Saves or updates the budget for the chosen category.

### Custom Purpose Budget Section
-   **Budget Name/Amount/Description/Deadline/Priority**: Input fields for creating a new purpose-driven budget (e.g., for a vacation).
-   **Budget Categories Input & Add Button**: Allows for the creation of sub-categories within the custom budget.
-   **Category Budgets List**: A list of inputs to allocate portions of the total custom budget to its sub-categories.
-   **Create / Update Custom Budget Button**: Saves the new or edited custom budget.
-   **Save as Template Button**: Saves the current form's structure as a reusable template for future budgets.

### Budget Templates Section
-   **Create from Template Dropdown**: Selects a previously saved template.
-   **Apply Button**: Populates the custom budget form with data from the selected template.
-   **Manage Templates List**: Displays all saved templates, each with a `Delete` button.

### Budget Automation Section
-   **Source/Destination Dropdowns**: Selects a monthly category (source) and a custom budget (destination) for a rollover rule.
-   **Create Rollover Rule Button**: Creates a rule to automatically transfer any month-end surplus from the source to the destination.
-   **Process End-of-Month Rollovers Button**: Manually triggers all created rollover rules to execute.

### Manage Funds Section
-   **Transfer Funds Button**: Opens a modal to move money between two different custom budgets.

### Budget Lists
-   **Active/Paused Custom Budgets**: A list of cards, each representing a custom budget and showing its progress.
    -   **Pause/Resume Button**: Toggles a budget between active and paused states.
    -   **Edit Button**: Loads a budget's details into the form for modification.
-   **Monthly Budget Overview**: A list of cards showing spending progress for each monthly category budget.

---

## 📈 Analytics Tab

This tab provides a dashboard of advanced analytics and personalized insights into spending habits.

-   **Timeframe Buttons (30, 60, 90 Days)**: Adjusts the date range for all analytics on the page.
-   **Financial Health Score**: A gauge chart showing a score from 0-100 with a status (e.g., "Thriving", "Caution") and an "Improve Score" button.
-   **Cash Flow Reality Check**:
    -   A waterfall chart visualizing the flow from Income → Expenses → Savings.
    -   Cards for "Projected Monthly Savings", "Budget Burn Rate", and "Income Optimization".
    -   An editable "Monthly Savings Goal" input field to make analytics more personal.
-   **Your Habits**:
    -   **Spending Personality**: A card that identifies the user's spending type (e.g., "Weekend Spender", "Weekday Warrior").
    -   **Daily Spending Goal**: A card showing the user's streak of staying under a daily spending limit, with an editable goal amount.
-   **Emergency Preparedness**: A card displaying the user's "Financial Runway" in months, indicating how long their savings would last.
-   **Budget Scenario Planning**: An interactive section with sliders that allow the user to see how hypothetical changes to their monthly budgets would affect their Financial Health Score in real-time.
-   **Smart Category Breakdown**: A list of spending categories showing total spend, trend vs. the last period, the largest single transaction, and actionable smart text insights.

---

## ⚙️ Settings Tab

This section contains app-level configurations and data management tools.

### Security Section
-   **Remove/Set Password Controls**: Allows the user to add, change, or remove the password used to lock the app.

### Data Management Section
-   **Backup Data (JSON) Button**: Downloads a complete snapshot of all app data (transactions, budgets, etc.) as a JSON file.
-   **Restore from Backup Button**: Opens a file dialog to upload a previously saved JSON backup, overwriting current data.
-   **Export to Excel Button**: Generates and downloads a multi-sheet `.xlsx` file with detailed financial data.
-   **Generate PDF Report Button**: Creates and downloads a summarized financial report in PDF format.
-   **Generate HTML Report Button**: Creates and downloads a highly detailed, styled report in HTML format.

### Recurring Transactions Section
-   **Automatic / Manual Buttons**: Allows the user to choose how recurring transactions are processed. 'Automatic' processes them on app launch, while 'Manual' requires the user to press a button.
-   **Process Recurring Transactions Button**: Appears only in 'Manual' mode; triggers the app to check for and create any due recurring transactions.

---

## 🔔 Reminders Tab

This tab is dedicated to managing upcoming bill reminders to help users stay on top of their payments.

-   **Bill Name Input**: Field to enter the name of the bill (e.g., 'Credit Card Payment').
-   **Amount Input**: Field for the bill's amount.
-   **Due Date Input**: A date picker to set the bill's due date.
-   **Add/Update Reminder Button**: Saves a new reminder or updates an existing one.
-   **Cancel Edit Button**: Appears only during an edit; discards changes and clears the form.
-   **Upcoming Bills List**: A list of all saved reminders, sorted by the nearest due date.
    -   **Edit Button (Pencil Icon)**: Loads the reminder's data into the form for editing.
    -   **Delete Button (Trash Icon)**: Permanently removes the reminder.

---

##  modals

These are pop-up dialogs for specific actions.

### Export Data Modal
-   **Export Type Buttons (All, Monthly, Custom)**: Filters the export to include all data or only data from a specific budget type.
-   **Date Range Inputs**: Allows the user to select a custom start and end date for the export (max 90 days).
-   **Format Buttons (JSON, CSV)**: Selects the file format for the downloaded data.
-   **Export Data Button**: Initiates the download using the specified filters and format.

### Fund Transfer Modal
-   **From/To Budget Dropdowns**: Selects the source and destination custom budgets for the transfer.
-   **Amount to Transfer Input**: Field to enter the amount of money to be moved.
-   **Transfer Button**: Executes the fund transfer, creating corresponding transactions in the history.


-------------------------------------------------------------------------------------------------------------------------------------

## 🛠️ Developer Guide: Building for Android

This guide outlines the steps to wrap the BudgetWise web application into a native Android APK using Capacitor.

### Prerequisites

Before you begin, ensure you have the following installed on your system:
-   **Node.js** (LTS version recommended)
-   **Android Studio** with the Android SDK

### Step 1: Install Dependencies

Navigate to your project's root directory in the terminal and install the necessary Capacitor dependencies.

```bash
npm install @capacitor/cli @capacitor/core --save-dev
npm install @capacitor/android --save-dev
```

### Step 2: Initialize Capacitor

If this is the first time setting up Capacitor for the project, run the `init` command.

```bash
npx cap init
```

You will be prompted for the following:
-   **App Name**: `BudgetWise`
-   **App ID**: `com.budgetwise.app` (a unique identifier for your app)

This creates a `capacitor.config.ts` file. Ensure the `webDir` is set to `'dist'`, which is Vite's default output directory.

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budgetwise.app',
  appName: 'BudgetWise',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### Step 3: Add the Android Platform

This command creates the native Android project in an `android/` directory at the root of your project.

```bash
npx cap add android
```

### Step 4: Build and Sync the Web App

Whenever you make changes to the web application code (in the `src` folder), you must create a production build and sync it with the native project.

1.  **Build the web assets:**
    ```bash
npm run build
    ```
2.  **Sync with Android:** This copies the web files from `dist/` into the native project.
    ```bash
npx cap sync
    ```

### Step 5: Build the APK in Android Studio

1.  **Open the project in Android Studio:**
    ```bash
npx cap open android
    ```
    Android Studio will launch and load the native project. The initial Gradle sync may take a few moments.

2.  **Build the APK:**
    -   From the Android Studio menu bar, select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    -   Once the build is complete, a notification will appear with a link to the generated `app-debug.apk` file.
    -   You can install this APK on an Android emulator or a physical device for testing.


--------------------------------------------------------------------------------------------------------------------------------------
---

## 🌐 Developer Guide: Running as a Web App

The BudgetWise application can also be run as a standard web application locally for testing and development purposes. This leverages Vite's built-in development server.

### Steps to Run Locally

1.  **Navigate to the project directory** in your terminal.

2.  **Install dependencies** (if you haven't already):
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```
    After running this command, your terminal will display a local URL (e.g., `http://localhost:5173/`). Open this URL in your web browser to access the application. Changes to your code will automatically update in the browser due to Hot Module Replacement (HMR).
