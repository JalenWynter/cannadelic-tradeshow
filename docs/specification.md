# Gudessence Cannadelic Night Market Tradeshow App

## 1. Introduction & Overview

This document outlines the specifications for the Gudessence Cannadelic Night Market Tradeshow App. The application is designed as a dedicated, offline, touch-kiosk interface for tradeshow staff to engage with attendees, collect leads, manage VIPs, track engagement points, and facilitate giveaways. It prioritizes a seamless, immersive user experience aligned with the Gudessence brand and the "Cannadelic Night Market" theme.

## 2. Project Goals & Features

*   **Primary Goal:** To enhance tradeshow engagement and lead generation by providing an intuitive, offline, and themed interactive application.
*   **Core Features:**
    *   **Contact Data Collection:** Capture name, email, phone, and social media handles (platform and handle).
    *   **Point System:** Award points for various user actions (booth visit, data provision, social media engagement, giveaway entry).
    *   **VIP Management:** Identify and track VIP status, manage unlimited popcorn rewards with a cooldown mechanism.
    *   **Giveaway Management:** Collect entries for a single, random draw.
    *   **Point Redemption:** Staff-controlled, password-protected interface for redeeming points for rewards.
    *   **Input Validation:** Ensure data accuracy and prevent duplicate entries.
    *   **Sound Confirmations:** Provide audio feedback for user actions.
    *   **Offline Operation:** All data is stored and processed locally.

## 3. Technical Specifications

*   **Development Language:** JavaScript/TypeScript
*   **Framework:** React
*   **Desktop Application Framework:** Electron
*   **Database:** SQLite
*   **Development Command:** `npm run dev`
*   **Theming:** "Cannadelic Night Market" aesthetic -
    *   **Color Palette:** Deep purples/blacks base, with neon lime, electric violet, cyber pink accents.
    *   **Visuals:** Neon signage, holographic textures, stylized cannabis motifs, geometric patterns, night market elements.
    *   **Typography:** Futuristic, bold sans-serif fonts, potential neon effects.
    *   **Atmosphere:** Immersive, nocturnal, high-contrast, surreal.
*   **Sound:** Integrated sound effects library for confirmations.

## 4. Data Model (SQLite Schema Summary)

*   **`Contacts`**: Stores core attendee information (`contact_id`, `name`, `email` (UNIQUE, case-insensitive), `phone` (UNIQUE, case-insensitive), `is_vip`, `vip_popcorn_last_redeemed_at`, `total_points`).
*   **`SocialMedia`**: Stores attendee social media handles (`social_id`, `contact_id` FK, `platform`, `handle`).
*   **`Actions`**: Defines redeemable actions and their point values (`action_id`, `action_name`, `points_awarded`).
*   **`UserActions`**: Logs points awarded per contact per action (`user_action_id`, `contact_id` FK, `action_id` FK, `timestamp`). Prevents double-earning for single-instance actions.
*   **`Giveaways`**: Defines available giveaways (`giveaway_id`, `giveaway_name`, `description`).
*   **`GiveawayEntries`**: Records attendee entries for giveaways (`entry_id`, `contact_id` FK, `giveaway_id` FK, `entry_time`, `is_winner`).

## 5. Feature Details

### 5.1. Point System
*   **Actions & Points:**
    *   Booth Visit: 10 pts
    *   Provide Name: 5 pts
    *   Provide Email: 15 pts
    *   Provide Phone: 15 pts
    *   Follow Gudessence IG: 20 pts (Staff verified)
    *   Follow Gudessence TikTok: 20 pts
    *   Follow Gudessence Facebook: 15 pts
    *   Follow Gudessence X: 15 pts
    *   Follow Gudessence Snapchat: 15 pts
    *   Social Media Story Post: 30 pts (Staff verified)
    *   Social Media Feed Post: 50 pts (Staff verified)
    *   Enter Giveaway: 25 pts
    *   Google Review: 150 pts (High reward)
    *   Apple Maps Review: 150 pts (High reward)
*   **Point Exchange:** Points can be redeemed for tiered rewards, e.g., Popcorn (100 pts), Swag Bag (500 pts).

### 5.2. VIP Management
*   **Status:** Identified by `is_vip` flag in `Contacts`.
*   **Perk:** Unlimited popcorn at the booth.
*   **Cooldown:** 1-hour cooldown enforced via `vip_popcorn_last_redeemed_at` timestamp in `Contacts`.

### 5.3. Giveaway System
*   **Mechanism:** A single, random draw conducted once.
*   **Entries:** Recorded in `GiveawayEntries` table.

### 5.4. Staff Operations
*   **Redemption Interface:** Accessible via a password-protected screen/mode.
*   **Functionality:** Search contacts, view current points, deduct points for redeemed rewards, log redemption activity.

## 6. Development Setup & Running

*   **Prerequisites:** Node.js and npm installed.
*   **Project Setup:**
    1.  Clone the repository: `git clone <repository_url>`
    2.  Navigate to the project directory: `cd <project_directory>`
    3.  Install dependencies: `npm install`
*   **Running in Development:**
    1.  Start the application: `npm run dev`
    *   This command will launch the Electron app in development mode, enabling live reloading and debugging.

## 7. Key Considerations & Implementation Notes

*   **Offline First:** Ensure all critical data operations (saving contacts, logging actions, checking VIP status) function without network access. SQLite is file-based and ideal for this.
*   **Touch-Friendly UI:** Design all UI elements (buttons, forms, navigation) with large touch targets and clear visual feedback. Minimize reliance on keyboard input.
*   **Sound Integration:** Implement sound effects for key interactions (e.g., form submission, point awarded, VIP popcorn served, redemption successful) using JavaScript audio APIs or a dedicated library.
*   **Uniqueness & Duplication:**
    *   Email and phone numbers must be unique regardless of case. Implement case normalization (e.g., to lowercase) before database checks/inserts.
    *   Prevent double earning for one-time actions (e.g., 'Follow IG') by checking `UserActions` before awarding points.
*   **Staff Password:** Implement a secure, but simple, password mechanism for staff-only redemption features.
