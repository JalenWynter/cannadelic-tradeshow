import fs from 'fs';

function generateBrokenData() {
  const contacts = [];
  const entries = [];

  for (let i = 1; i <= 500; i++) {
    const isVip = i % 2 === 0; // Every 2nd user is VIP
    const physicalTickets = i % 3 === 0 ? ['111111', '222222'] : []; // Every 3rd user has 2 physical tickets
    
    contacts.push({
      contact_id: i,
      name: `Broken User ${i}`,
      email: `broken${i}@example.com`,
      phone: `555111${i.toString().padStart(4, '0')}`,
      is_vip: isVip,
      physical_tickets: physicalTickets,
      total_points: 0,
      flower_claimed: false,
      created_at: new Date().toISOString()
    });

    // PURPOSELY DO NOT ADD ENTRIES TO TEST AUTO-REPAIR
  }

  fs.writeFileSync('tests/BROKEN_DB_Attendees.json', JSON.stringify({ Contacts: contacts }, null, 2));
  fs.writeFileSync('tests/BROKEN_DB_Engagement.json', JSON.stringify({ GiveawayEntries: [] }, null, 2));

  console.log('Generated 500 users with NO entries. Use this to test the "Data Integrity" repair button.');
}

generateBrokenData();
