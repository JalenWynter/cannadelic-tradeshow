// api.js - Final Multi-File Optimized Logic

const api = {
  // --- Search & Fetch ---
  async getContactByEmail(email) { return await window.electronAPI.jsonGet('Contacts', { email: email.toLowerCase().trim() }); },
  async getContactByPhone(phone) { return await window.electronAPI.jsonGet('Contacts', { phone: phone.replace(/\D/g, '') }); },
  async getContactById(id) { return await window.electronAPI.jsonGet('Contacts', { contact_id: id }); },
  async getAllRecentContacts(limit = 50) { return await window.electronAPI.jsonQuery('Contacts', {}, limit); },
  async searchContacts(searchTerm) {
    const list = await window.electronAPI.jsonQuery('Contacts', {});
    const term = searchTerm.toLowerCase().trim();
    return list.filter(c => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term) || c.phone.includes(term)).slice(0, 5);
  },
  async getEntryCount(contactId) { 
    const entries = await window.electronAPI.jsonQuery('GiveawayEntries', { contact_id: contactId }); 
    return entries.length; 
  },
  async getCompletedActions(contactId) {
    const actions = await window.electronAPI.jsonQuery('UserActions', { contact_id: contactId });
    const details = await Promise.all(actions.map(ua => window.electronAPI.jsonGet('Actions', { action_id: ua.action_id })));
    return details.filter(Boolean).map(a => a.action_name);
  },

  // --- Registration & Check-In ---
  async checkInOrRegister({ firstName, lastName, email, phone, ticketNumbers }) {
    const e = email ? email.toLowerCase().trim() : '';
    const p = phone ? phone.replace(/\D/g, '') : '';
    const newTickets = Array.isArray(ticketNumbers) ? ticketNumbers.filter(t => t.length === 6) : [];
    
    // Attempt to find existing user
    let contact = null;
    if (e) contact = await this.getContactByEmail(e);
    if (!contact && p) contact = await this.getContactByPhone(p);

    if (contact) {
      // Merge ticket numbers if provided
      if (newTickets.length > 0) {
        const existingTickets = contact.physical_tickets || [];
        const mergedTickets = [...new Set([...existingTickets, ...newTickets])];
        if (mergedTickets.length !== existingTickets.length) {
          await window.electronAPI.jsonRun('Contacts', 'update', { physical_tickets: mergedTickets }, { contact_id: contact.contact_id });
          contact.physical_tickets = mergedTickets;
        }
      }
      return { contactId: contact.contact_id, isNew: false, contact };
    }

    // New Registration
    if (!firstName || (!e && !p)) throw new Error('First Name and Email/Phone required');
    
    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();
    
    const res = await window.electronAPI.jsonRun('Contacts', 'insert', { 
      name: fullName,
      first_name: firstName.trim(),
      last_name: lastName ? lastName.trim() : '',
      email: e, 
      phone: p,
      physical_tickets: newTickets,
      is_vip: false, 
      total_points: 0, 
      flower_claimed: false 
    }, null, e ? { email: e } : { phone: p });
    
    await this.awardPoints(res.id, 'Booth Visit');
    const newContact = await this.getContactById(res.id);
    return { contactId: res.id, isNew: true, contact: newContact };
  },

  async registerContact({ firstName, lastName, email, phone, ticketNumbers }) {
    const e = email.toLowerCase().trim();
    const p = phone.replace(/\D/g, '');
    const newTickets = Array.isArray(ticketNumbers) ? ticketNumbers.filter(t => t.length === 6) : [];
    
    if (await this.getContactByEmail(e)) throw new Error('Email Taken');
    if (await this.getContactByPhone(p)) throw new Error('Phone Taken');

    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();

    const res = await window.electronAPI.jsonRun('Contacts', 'insert', { 
      name: fullName, 
      first_name: firstName.trim(),
      last_name: lastName ? lastName.trim() : '',
      email: e, 
      phone: p, 
      physical_tickets: newTickets,
      is_vip: false, 
      total_points: 0, 
      flower_claimed: false 
    }, null, { email: e }); // Unique check on email
    await this.awardPoints(res.id, 'Booth Visit');
    return res.id;
  },

  // --- VIP & Perks ---
  async grantVipStatus(contactId, staffName) {
    await window.electronAPI.jsonRun('Contacts', 'update', { is_vip: true }, { contact_id: contactId });
    await this.addRaffleEntries(contactId, 2, 'VIP Bonus');
    await window.electronAPI.logStaffAction({ type: 'VIP_UPGRADE', staff_name: staffName, contact_id: contactId });
  },
  async redeemPopcorn(contactId) {
    const c = await this.getContactById(contactId);
    if (c.vip_popcorn_last_redeemed_at) {
      if ((new Date() - new Date(c.vip_popcorn_last_redeemed_at)) < 600000) throw new Error('Wait 10 mins!');
    }
    await window.electronAPI.jsonRun('Contacts', 'update', { vip_popcorn_last_redeemed_at: new Date().toISOString() }, { contact_id: contactId });
  },
  async claimFlower(contactId, staffName) {
    await window.electronAPI.jsonRun('Contacts', 'update', { flower_claimed: true }, { contact_id: contactId });
    await window.electronAPI.logStaffAction({ type: 'PERK_CLAIM', staff_name: staffName, contact_id: contactId, item: '1g Flower' });
  },

  // --- Raffle & Points ---
  async addRaffleEntries(contactId, count, reason, staffName = 'System') {
    const g = await window.electronAPI.jsonGet('Giveaways', { giveaway_name: 'Night Market Grand Prize' });
    for (let i = 0; i < count; i++) {
      await window.electronAPI.jsonRun('GiveawayEntries', 'insert', { contact_id: contactId, giveaway_id: g.giveaway_id, entry_time: new Date().toISOString(), is_winner: false, source: reason });
    }
    if (staffName !== 'System') await window.electronAPI.logStaffAction({ type: 'RAFFLE_ADD', staff_name: staffName, contact_id: contactId, count });
  },
  async removeRaffleEntry(contactId, staffName) {
    const res = await window.electronAPI.removeRaffleEntry(contactId);
    if (res.success) {
        await window.electronAPI.logStaffAction({ type: 'RAFFLE_REMOVE', staff_name: staffName, contact_id: contactId });
    }
  },
  async awardPoints(contactId, actionName) {
    const a = await window.electronAPI.jsonGet('Actions', { action_name: actionName });
    const existing = await window.electronAPI.jsonGet('UserActions', { contact_id: contactId, action_id: a.action_id });
    if (existing) return;
    await window.electronAPI.jsonRun('UserActions', 'insert', { contact_id: contactId, action_id: a.action_id, timestamp: new Date().toISOString() });
    const c = await this.getContactById(contactId);
    await window.electronAPI.jsonRun('Contacts', 'update', { total_points: (c.total_points || 0) + a.points_awarded }, { contact_id: contactId });
  },
  async verifyAndAwardAction(contactId, actionName, staffName) {
    await this.awardPoints(contactId, actionName);
    await this.addRaffleEntries(contactId, 1, actionName, staffName);
  },
  async toggleVipWithLog(id, currentStatus, staffName) {
    if (!currentStatus) await this.grantVipStatus(id, staffName);
    else {
      await window.electronAPI.jsonRun('Contacts', 'update', { is_vip: false }, { contact_id: id });
      await window.electronAPI.logStaffAction({ type: 'VIP_REVOKE', staff_name: staffName, contact_id: id });
    }
  },
  async redeemPoints(contactId, points, staffName) {
    const c = await this.getContactById(contactId);
    await window.electronAPI.jsonRun('Contacts', 'update', { total_points: c.total_points - points }, { contact_id: contactId });
    await window.electronAPI.logStaffAction({ type: 'REDEMPTION', staff_name: staffName, contact_id: contactId, points_deducted: points });
  },
  async wipeAllData() {
    return await window.electronAPI.wipeAllData();
  },
  async getVote(contactId) {
    return await window.electronAPI.jsonGet('Votes', { contact_id: contactId });
  },
  async getKioskId() {
    return await window.electronAPI.getKioskId();
  },
  async toggleKiosk() {
    return await window.electronAPI.toggleKiosk();
  },
  async isKioskMode() {
    return await window.electronAPI.getKioskStatus();
  },
  async getLastBackupTime() {
    return await window.electronAPI.getLastBackupTime();
  },
  async getNextBackupTime() {
    return await window.electronAPI.getNextBackupTime();
  },
  async addTicketToContact(contactId, ticketNumber) {
    const ticket = ticketNumber.trim();
    if (ticket.length !== 6) throw new Error('Invalid ticket number (must be 6 digits)');
    
    // Check if ticket is already claimed by ANYONE
    const allContacts = await window.electronAPI.jsonQuery('Contacts', {});
    const isAlreadyClaimed = allContacts.some(c => (c.physical_tickets || []).includes(ticket));
    
    if (isAlreadyClaimed) throw new Error('This ticket has already been registered');
    
    const contact = await this.getContactById(contactId);
    if (!contact) throw new Error('Account not found');
    
    const existingTickets = contact.physical_tickets || [];
    const updatedTickets = [...existingTickets, ticket];
    
    await window.electronAPI.jsonRun('Contacts', 'update', { physical_tickets: updatedTickets }, { contact_id: contactId });
    
    // Optional: Automatically award a digital entry for the physical ticket
    await this.addRaffleEntries(contactId, 1, `Physical Ticket #${ticket}`);
    
    return { success: true, updatedTickets };
  },
  async castVote(contactId, seasoningName) {
    const existing = await window.electronAPI.jsonGet('Votes', { contact_id: contactId });
    if (existing) throw new Error('Already Voted!');
    
    await window.electronAPI.jsonRun('Votes', 'insert', { 
      contact_id: contactId, 
      seasoning_name: seasoningName, 
      timestamp: new Date().toISOString() 
    }, null, { contact_id: contactId }); // Ensure only one vote per contact
    
    await this.awardPoints(contactId, 'Seasoning Vote');
  },
  formatCivilianTime(isoString) {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  },
  async getStaffLogs(limit = 20) {
    const logs = await window.electronAPI.jsonQuery('StaffLogs', {});
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  },
  async getTotalStats() {
    const contacts = await window.electronAPI.jsonQuery('Contacts', {});
    const entries = await window.electronAPI.jsonQuery('GiveawayEntries', {});
    return {
      totalUsers: contacts.length,
      totalVips: contacts.filter(c => c.is_vip).length,
      totalEntries: entries.length
    };
  },
  async createSupportTicket(contactId, { subject, message, category, staffName }) {
    return await window.electronAPI.jsonRun('SupportTickets', 'insert', {
      contact_id: contactId,
      subject,
      message,
      category,
      status: 'Open',
      created_by_staff: staffName,
      timestamp: new Date().toISOString()
    });
  },
  async getSupportTickets(contactId = null) {
    const filter = contactId ? { contact_id: contactId } : {};
    const tickets = await window.electronAPI.jsonQuery('SupportTickets', filter);
    return tickets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },
  async updateTicketStatus(ticketId, status, staffName) {
    await window.electronAPI.jsonRun('SupportTickets', 'update', { status, resolved_by: staffName, resolved_at: new Date().toISOString() }, { ticket_id: ticketId });
    await window.electronAPI.logStaffAction({ type: 'TICKET_UPDATE', staff_name: staffName, details: `Ticket #${ticketId} set to ${status}` });
  }
};

export default api;
