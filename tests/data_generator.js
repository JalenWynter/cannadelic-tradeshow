import fs from 'fs';
import path from 'path';

const TOTAL_USERS = 1000;
const TICKET_PROBABILITY = 0.3; // 30% of users have physical tickets

function generateData() {
  const contacts = [];
  const entries = [];
  const supportTickets = [];
  const staffLogs = [];

  for (let i = 1; i <= TOTAL_USERS; i++) {
    const isVip = Math.random() > 0.8;
    const physicalTickets = [];
    if (Math.random() < TICKET_PROBABILITY) {
      const numTickets = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numTickets; j++) {
        physicalTickets.push(Math.floor(100000 + Math.random() * 900000).toString());
      }
    }

    contacts.push({
      contact_id: i,
      name: `User ${i} Test`,
      first_name: `User ${i}`,
      last_name: `Test`,
      email: `user${i}@example.com`,
      phone: `555000${i.toString().padStart(4, '0')}`,
      physical_tickets: physicalTickets,
      is_vip: isVip,
      total_points: Math.floor(Math.random() * 1000),
      flower_claimed: isVip && Math.random() > 0.5,
      created_at: new Date().toISOString()
    });

    // Add entries for physical tickets
    physicalTickets.forEach(t => {
      entries.push({
        contact_id: i,
        giveaway_id: 1,
        entry_time: new Date().toISOString(),
        is_winner: false,
        source: `Physical Ticket #${t}`,
        giveawayentrie_id: entries.length + 1
      });
    });

    // Add VIP bonus
    if (isVip) {
      for (let v = 0; v < 2; v++) {
        entries.push({
          contact_id: i,
          giveaway_id: 1,
          entry_time: new Date().toISOString(),
          is_winner: false,
          source: 'VIP Bonus',
          giveawayentrie_id: entries.length + 1
        });
      }
    }
  }

  const dbAttendees = { Contacts: contacts };
  const dbEngagement = { 
    UserActions: [], 
    GiveawayEntries: entries, 
    Votes: [],
    SupportTickets: [] 
  };

  fs.writeFileSync('tests/MOCK_DB_Attendees.json', JSON.stringify(dbAttendees, null, 2));
  fs.writeFileSync('tests/MOCK_DB_Engagement.json', JSON.stringify(dbEngagement, null, 2));
  
  console.log(`Generated ${TOTAL_USERS} users and ${entries.length} entries.`);
  console.log('Saved to tests/MOCK_DB_Attendees.json and tests/MOCK_DB_Engagement.json');
}

generateData();
