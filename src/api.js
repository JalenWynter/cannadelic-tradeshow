// api.js - Final Multi-File Optimized Logic

import { contactDisplayReference, getLegacyGuestReference, hasPrehistoricGuestReference } from './guestReference.js';
import { colombiaRetreatSourceLabel, isColombiaRetreatInterested } from './retreatInterest.js';

const api = {
  // --- Search & Fetch ---
  async getContactByEmail(email) { return await window.electronAPI.jsonGet('Contacts', { email: email.toLowerCase().trim() }); },
  async getContactByPhone(phone) { return await window.electronAPI.jsonGet('Contacts', { phone: phone.replace(/\D/g, '') }); },
  async getContactById(id) { return await window.electronAPI.jsonGet('Contacts', { contact_id: id }); },
  async getAllRecentContacts(limit = 50) { return await window.electronAPI.jsonQuery('Contacts', {}, limit); },
  async getVipContacts() {
    const all = await window.electronAPI.jsonQuery('Contacts', {});
    return all.filter((c) => c.is_vip);
  },
  async searchContacts(searchTerm, limit = 30) {
    const list = await window.electronAPI.jsonQuery('Contacts', {});
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];
    return list.filter((c) => {
      const ref = (contactDisplayReference(c) || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').replace(/\D/g, '');
      const termDigits = term.replace(/\D/g, '');
      return (
        name.includes(term)
        || email.includes(term)
        || (termDigits && phone.includes(termDigits))
        || ref.includes(term)
        || String(c.contact_id) === term
      );
    }).slice(0, limit);
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
    const rawTickets = Array.isArray(ticketNumbers) ? ticketNumbers.filter(t => t.trim().length === 6) : [];
    const newTickets = [...new Set(rawTickets)];
    
    // Attempt to find existing user
    let contact = null;
    if (e) contact = await this.getContactByEmail(e);
    if (!contact && p) contact = await this.getContactByPhone(p);

    // Check global uniqueness for all input tickets, excluding the found contact if any
    for (const t of newTickets) {
      if (await this.isTicketDuplicate(t, contact ? contact.contact_id : null)) {
        throw new Error(`Ticket #${t} is already registered to another account.`);
      }
    }

    if (contact) {
      // Merge ticket numbers if provided, ensuring no duplicates
      if (newTickets.length > 0) {
        const existingTickets = contact.physical_tickets || [];
        const mergedTickets = [...new Set([...existingTickets, ...newTickets])];
        if (mergedTickets.length !== existingTickets.length) {
          await window.electronAPI.jsonRun('Contacts', 'update', { physical_tickets: mergedTickets }, { contact_id: contact.contact_id });
          contact.physical_tickets = mergedTickets;
          // Award raffle entry for every NEW ticket added
          const addedCount = mergedTickets.length - existingTickets.length;
          if (addedCount > 0) await this.addRaffleEntries(contact.contact_id, addedCount, 'Merged Physical Tickets');
        }
      }
      if (contact.mobile_signup_pending) {
        await window.electronAPI.jsonRun('Contacts', 'update', {
          mobile_signup_pending: false,
          mobile_signup_confirmed: true,
          mobile_signup_confirmed_at: new Date().toISOString(),
        }, { contact_id: contact.contact_id });
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
    const rawTickets = Array.isArray(ticketNumbers) ? ticketNumbers.filter(t => t.trim().length === 6) : [];
    
    // Check global uniqueness for all input tickets
    for (const t of rawTickets) {
      if (await this.isTicketDuplicate(t)) throw new Error(`Ticket #${t} is already registered.`);
    }

    // Deduplicate within input
    const newTickets = [...new Set(rawTickets)];

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
    // Award raffle entry for every ticket
    if (newTickets.length > 0) await this.addRaffleEntries(res.id, newTickets.length, 'Registration Physical Tickets');
    return res.id;
  },

  // --- VIP & Perks ---
  async grantVipStatus(contactId, staffName) {
    const c = await this.getContactById(contactId);
    if (!c) throw new Error('Contact not found');
    if (c.is_vip) return { success: true, already: true, contact: c };

    await window.electronAPI.jsonRun('Contacts', 'update', { is_vip: true, vip_popcorn_count: 0 }, { contact_id: contactId });
    await this.addRaffleEntries(contactId, 2, 'VIP Bonus');
    await window.electronAPI.logStaffAction({ type: 'VIP_UPGRADE', staff_name: staffName, contact_id: contactId });
    const updated = await this.getContactById(contactId);
    return { success: true, contact: updated };
  },

  /** VIP Lounge registration — check-in/register then auto-grant VIP + booth points + VIP raffle entries */
  async checkInOrRegisterVip({ firstName, lastName, email, phone, ticketNumbers, staffName = 'VIP Lounge' }) {
    const result = await this.checkInOrRegister({ firstName, lastName, email, phone, ticketNumbers });
    const vipResult = await this.grantVipStatus(result.contactId, staffName);
    const contact = vipResult.contact || (await this.getContactById(result.contactId));
    return {
      ...result,
      contact,
      vipGranted: !vipResult.already,
      isVip: Boolean(contact?.is_vip),
    };
  },
  async redeemPopcorn(contactId, staffName = null, dose = null) {
    const c = await this.getContactById(contactId);
    if (!c) throw new Error('Contact not found');
    if (!c.is_vip) throw new Error('Guest is not VIP');
    if (c.vip_popcorn_last_redeemed_at) {
      if ((new Date() - new Date(c.vip_popcorn_last_redeemed_at)) < 600000) throw new Error('Wait 10 mins before next refill');
    }
    await window.electronAPI.jsonRun('Contacts', 'update', {
      vip_popcorn_last_redeemed_at: new Date().toISOString(),
      vip_popcorn_count: (c.vip_popcorn_count || 0) + 1,
    }, { contact_id: contactId });
    if (staffName) {
      const doseLabel = dose === 'high' ? 'high dose' : dose === 'low' ? 'low dose' : null;
      await window.electronAPI.logStaffAction({
        type: 'POPCORN_REFILL',
        staff_name: staffName,
        contact_id: contactId,
        item: doseLabel ? `Popcorn (${doseLabel})` : 'Popcorn refill',
      });
    }
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
  async markColombiaRetreatInterest(contactId, source = 'kiosk_early_bird', staffName = 'System') {
    return await window.electronAPI.markColombiaRetreatInterest(contactId, source, staffName);
  },
  isColombiaRetreatInterested(contact) {
    return isColombiaRetreatInterested(contact);
  },
  colombiaRetreatSourceLabel(source) {
    return colombiaRetreatSourceLabel(source);
  },
  async getColombiaRetreatSignupUrl() {
    return await window.electronAPI.getColombiaRetreatSignupUrl();
  },
  async getPendingColombiaSignups() {
    return await window.electronAPI.getPendingMobileSignups('colombia_retreat');
  },
  async toggleVipWithLog(id, currentStatus, staffName) {
    if (!currentStatus) await this.grantVipStatus(id, staffName);
    else {
      await window.electronAPI.jsonRun('Contacts', 'update', { is_vip: false }, { contact_id: id });
      await window.electronAPI.logStaffAction({ type: 'VIP_REVOKE', staff_name: staffName, contact_id: id });
    }
  },
  async redeemPoints(contactId, points, itemName, staffName) {
    const c = await this.getContactById(contactId);
    if ((c.total_points || 0) < points) throw new Error('Insufficient points');
    const updates = { total_points: (c.total_points || 0) - points };
    if (itemName === 'VIP Upgrade') updates.is_vip = true;
    await window.electronAPI.jsonRun('Contacts', 'update', updates, { contact_id: contactId });
    await window.electronAPI.logStaffAction({
      type: itemName === 'VIP Upgrade' ? 'VIP_GRANT' : 'REDEMPTION',
      staff_name: staffName,
      contact_id: contactId,
      points_deducted: points,
      item: itemName
    });
  },
  async wipeAllData() {
    return await window.electronAPI.wipeAllData();
  },
  async isDevMode() {
    return await window.electronAPI.isDevMode();
  },
  async clearDevTestData(staffName, pin) {
    return await window.electronAPI.clearDevTestData(staffName, pin);
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
  async getBackupSize() {
    return await window.electronAPI.getBackupSize();
  },
  async getMobileSignupUrl() {
    return await window.electronAPI.getMobileSignupUrl();
  },
  async getMobileSignupStatus() {
    return await window.electronAPI.getMobileSignupStatus();
  },
  async getCloudStaffUrl() {
    return await window.electronAPI.getCloudStaffUrl();
  },
  async openCloudStaffPage() {
    return await window.electronAPI.openCloudStaffPage();
  },
  async getPendingMobileSignups() {
    return await window.electronAPI.getPendingMobileSignups();
  },
  async getAllPendingMobileSignups() {
    return await window.electronAPI.getAllPendingMobileSignups();
  },
  async confirmMobileSignup(contactId, staffName = 'Staff') {
    return await window.electronAPI.confirmMobileSignup(contactId, staffName);
  },
  async denyMobileSignup(contactId, staffName = 'Staff') {
    return await window.electronAPI.denyMobileSignup(contactId, staffName);
  },
  contactReference(contact) {
    return contactDisplayReference(contact);
  },
  isPrehistoricGuestReference(contact) {
    return hasPrehistoricGuestReference(contact);
  },
  legacyGuestReference(contact) {
    return getLegacyGuestReference(contact);
  },
  async ensureContactReference(contactId) {
    return await window.electronAPI.ensureGuestReference(contactId);
  },
  isContactDeclined(contact) {
    return Boolean(contact?.mobile_signup_denied || contact?.signup_status === 'declined');
  },
  onMobileSignupUpdate(callback) {
    return window.electronAPI.onMobileSignupUpdate(callback);
  },
  async isTicketDuplicate(ticket, excludeContactId = null) {
    const allContacts = await window.electronAPI.jsonQuery('Contacts', {});
    return allContacts.some(c => {
      if (excludeContactId && c.contact_id === excludeContactId) return false;
      return (c.physical_tickets || []).includes(ticket.trim());
    });
  },
  async addTicketToContact(contactId, ticketNumber) {
    const ticket = ticketNumber.trim();
    if (ticket.length !== 6) throw new Error('Invalid ticket number (must be 6 digits)');
    
    // Check if ticket is already claimed by ANYONE (Global Uniqueness)
    if (await this.isTicketDuplicate(ticket)) {
      throw new Error('This ticket has already been registered');
    }
    
    const contact = await this.getContactById(contactId);
    if (!contact) throw new Error('Account not found');
    
    const existingTickets = contact.physical_tickets || [];
    // Individual Uniqueness (redundant but safe)
    if (existingTickets.includes(ticket)) throw new Error('You have already added this ticket');

    const updatedTickets = [...existingTickets, ticket];
    
    await window.electronAPI.jsonRun('Contacts', 'update', { physical_tickets: updatedTickets }, { contact_id: contactId });
    
    // Automatically award a digital entry for the physical ticket
    await this.addRaffleEntries(contactId, 1, `Physical Ticket #${ticket}`);
    
    return { success: true, updatedTickets };
  },
  async castVote(contactId, seasoningName) {
    const existing = await window.electronAPI.jsonGet('Votes', { contact_id: contactId });
    if (existing) throw new Error(`Already voted for ${existing.seasoning_name}. One vote per guest.`);

    await window.electronAPI.jsonRun('Votes', 'insert', {
      contact_id: contactId,
      seasoning_name: seasoningName,
      timestamp: new Date().toISOString(),
    }, null, { contact_id: contactId });

    await this.awardPoints(contactId, 'Seasoning Vote');
  },
  async hasVoted(contactId) {
    return Boolean(await window.electronAPI.jsonGet('Votes', { contact_id: contactId }));
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
