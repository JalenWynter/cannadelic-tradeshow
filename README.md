# GŪDESSENCE Tradeshow Kiosk App - Official Briefing

## 🚀 Setup & Installation (Windows)

To run this app on a Windows machine, follow these steps:

### 1. Prerequisites
You will need to install the following tools:
*   **Node.js (LTS Version):** Download and install from [nodejs.org](https://nodejs.org/). This includes `npm`.
*   **Git:** Download and install from [git-scm.com](https://git-scm.com/).

### 2. Clone the Repository
Open a terminal (Command Prompt, PowerShell, or Git Bash) and run:
```bash
git clone <repository-url>
cd gudessence-tradeshow-app
```

### 3. Install Dependencies
In the project directory, run:
```bash
npm install
```

### 4. Run the App in Development Mode
To start the app for development:
```bash
npm run dev
```
*This will launch the Vite development server and the Electron app automatically.*

### 5. Build for Production (Executable)
To create a standalone `.exe` installer:
```bash
npm run build:win
```
*The installer will be generated in the `release/` folder.*

---

## 🌟 Overview
The **GŪDESSENCE Tradeshow App** is a high-performance, dual-terminal kiosk system designed for the Cannadelic Night Market. It functions as an offline-first interactive experience for attendees to register, explore the menu, earn points, and enter the grand prize giveaway.

---

## 🖥️ Kiosk Configuration
*   **Dual-Window Spanning:** The app automatically detects two connected monitors and spans a fullscreen, touch-optimized window to each.
*   **Kiosk Mode:** The app is "locked" (Always on Top, No Taskbar, No Right-Click) to prevent users from escaping to the Windows desktop.
*   **Offline Stable:** No internet is required. All data is saved locally on the machine.

---

## 🏃‍♂️ Main Functions for Attendees

### 1. Check-In & Registration
*   Users register using their **First Name**, **Email**, or **Phone Number**.
*   **Physical Tickets:** Users can enter multiple 6-digit ticket numbers to link their physical raffle tickets to their digital profile.
*   **Virtual Keyboard:** A custom touch-friendly keyboard appears for all inputs.

### 2. Event Menus
*   **Infused Menu:** Detailed pricing and pairing notes for popcorn, drinks, and premium seasoning kits.
*   **Merchandise Shop:** A browsable catalog of flower, apparel, and wellness products.

### 3. GŪD Engagement & Rewards
*   **Flavor Voting:** Users rate their favorite seasoning to earn **50 points**.
*   **Grand Prize Giveaway:** Users can track their total raffle entries and see the "Wellness Stoner Bundle" package.
*   **Task Verification:** Users earn extra entries by showing staff they have completed social media posts or reviews.
*   **Colombia Retreat:** A dedicated view showcasing the luxury retreat with amenities like cannabis farm tours, private boat tours, and luxury chef experiences. Attendees can sign up for the **$1,500 Early Bird special** ($500 discount!).

### 4. VIP Lounge
*   **Exclusive Access:** Only users with VIP status can enter.
*   **Popcorn Refills:** VIPs get a "Refill" button with a **10-minute cooldown timer**.
*   **Flower Claim:** A one-time 1g flower claim verified by staff.
*   **VIP Enticement:** Non-VIP users are periodically shown a high-impact popup to upgrade for **$20**.

---

## 👨‍💼 Staff Operations Guide

### Accessing the Staff Portal
1.  On the **Home Screen**, scroll to the bottom and tap the small, subtle "Staff Portal" text.
2.  Select your name from the dropdown.
3.  Enter your unique **4-digit PIN** (e.g., Jalen: 1004, Ed: 1003).

### Common Staff Tasks

#### A. Verifying Social Media/Reviews
1.  Attendee goes to the **Giveaway Hub**.
2.  Attendee taps "Verify with Staff" for a specific task (e.g., Google Review).
3.  Staff enters their PIN on the attendee's screen to award the entry instantly.

#### B. Managing the Raffle (Dashboard)
1.  Enter the **Staff Dashboard**.
2.  Locate the user in the master list.
3.  Tap the **🎟️ icon** next to their name.
4.  Use the **+1 / -1** buttons to manually adjust their entries if they purchased extra tickets or seasoning kits.

#### C. Granting VIP Status
1.  Attendee goes to the **VIP Lounge**.
2.  Staff searches for the user's account.
3.  If they aren't VIP, tap **"Grant VIP Status"** and verify with your PIN.

#### D. End of Event (Data Wipe)
1.  Go to the **Staff Dashboard**.
2.  Tap the red **"Wipe Data"** button.
3.  **Warning:** This requires entering your PIN twice and will permanently delete all attendees and logs. Only do this for a clean start at a new show.

---

## 🛠️ Technical Maintenance

### Data Storage & Backups
*   **Data Location:** All data is saved at `%AppData%\gudessence-tradeshow-app`.
*   **Intelligent Sync:** On startup, the app automatically merges data from the most recent backup folder in `src/backups` with the current local database.
*   **Auto-Backups:** The system creates a compressed backup of the entire database every **10 minutes**.
*   **Backup Retention:** Backups older than 48 hours are automatically deleted to save space.

### Troubleshooting
*   **Screen Swap:** If Kiosk 1 and Kiosk 2 are on the wrong monitors, check the "Identify" label in the top-right. Swap the HDMI/USB cables on the back of the PC to fix.
*   **App Won't Save:** Ensure the PC's hard drive isn't full.
*   **Touch Inaccurate:** Use the Windows "Tablet PC Settings" in the Control Panel to calibrate the touchscreens.

---
*Generated for GŪDESSENCE - April 2026*