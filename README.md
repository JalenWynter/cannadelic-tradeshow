<<<<<<< HEAD
# GŪDESSENCE Tradeshow Kiosk App

**Internal documentation:** [docs/README.md](./docs/README.md) — architecture, security, network, runbooks, and deployment for IT/systems teams.

**Source of truth (GitLab):** [gudessence-tech/app-sandbox/tradeshow-cannadelic-app](https://gitlab.gudessence.dev/gudessence-tech/app-sandbox/tradeshow-cannadelic-app).

> ### ⚠️ **WINDOWS QUICK START (FOR THE SHOW)** ⚠️
> **1. Install [Node.js (LTS)](https://nodejs.org/) and [Git](https://git-scm.com/)**
> **2. Open terminal and run:**
> ```bash
> git clone https://gitlab.gudessence.dev/gudessence-tech/app-sandbox/tradeshow-cannadelic-app.git
> cd tradeshow-cannadelic-app
> npm install
> npm run dev
> ```
> **To create a standalone .exe installer, run: `npm run build:win`**

---

## 🚀 Setup & Installation (Windows)

To run this app on a Windows machine, follow these steps:

### 1. Prerequisites
You will need to install the following tools:
*   **Node.js (LTS Version):** Download and install from [nodejs.org](https://nodejs.org/). This includes `npm`.
*   **Git:** Download and install from [git-scm.com](https://git-scm.com/).

### 2. Clone the Repository
Open a terminal (Command Prompt, PowerShell, or Git Bash) and run:
```bash
git clone https://gitlab.gudessence.dev/gudessence-tech/app-sandbox/tradeshow-cannadelic-app.git
cd tradeshow-cannadelic-app
```

### 3. Install Dependencies
In the project directory, run:
```bash
npm install
```

### 4. Run the App in Development Mode (Recommended for Show)
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
3.  Enter your unique **4-digit PIN** (configured in `%AppData%\gudessence-tradeshow-app\staff.roster.json` — see [docs/security.md](./docs/security.md)).

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
=======
# tradeshow-cannadelic-app



## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.gudessence.dev/gudessence-tech/app-sandbox/tradeshow-cannadelic-app.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.gudessence.dev/gudessence-tech/app-sandbox/tradeshow-cannadelic-app/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
* [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> bcdcd41d5aeffe68eb808b64bc39b74c866c400a
