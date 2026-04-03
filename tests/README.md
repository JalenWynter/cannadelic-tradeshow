# GŪDESSENCE - Scale & Stress Test Suite

These scripts help verify that the app handles large volumes of data and recovers from data integrity issues.

## 🏃‍♂️ Running the Tests

To generate test data, run from the root:
```bash
# Generate 1,000 users with valid entries
node tests/data_generator.js

# Generate 500 "broken" users with NO entries (to test Auto-Repair)
node tests/generate_broken_data.js
```

## 🛠️ Testing Procedure

1.  **Backup your real data** if you have any.
2.  **Generate a mock database** using one of the commands above.
3.  **Replace the active database files** (found in `%AppData%/gudessence-tradeshow-app/` on Windows or `~/Library/Application Support/gudessence-tradeshow-app/` on Mac) with the generated `MOCK_...` or `BROKEN_...` files.
4.  **Rename them** back to `DB_Attendees.json` and `DB_Engagement.json`.
5.  **Launch the app** and enter the **Staff Dashboard**.

### **What to look for:**

*   **UI Performance**: Does the table scroll smoothly with 1,000+ users?
*   **Search Speed**: Does searching for a user happen instantly?
*   **Data Integrity Button**: Click the health status button. It should identify and **repair** all the missing entries (e.g., for VIPs and physical tickets) in seconds.
*   **Physical Ticket Modal**: Tap a user's ticket count to see if the modal correctly lists all 6-digit tickets in a scrollable, high-impact view.

---
*GŪDESSENCE Tradeshow Kiosk - Test Suite April 2026*
