import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './home-animations.css';
import api from './api';
import playSound from './sound';
import { QRCodeCanvas } from 'qrcode.react';
import { HomeMenuCard, HomeMenuRow, HomeRetreatCard } from './components/HomeMenuCard.jsx';
import { AnimatedBrandTitle } from './components/AnimatedBrandTitle.jsx';
import { COLOMBIA_RETREAT_HERO_IMAGE } from './colombiaRetreatMedia.js';

// --- Giveaway Configuration ---
const GIVEAWAY_PACKAGE = [
  "Sauna Blanket",
  "Free Greenroom Event Class (+1 for a friend)",
  "Exclusive Discounts",
  "Merch + Swag",
  "Signature Seasoning Kit",
  "Wellness Stoner Basket (Bluetooth speaker, snacks, yoga mat, candles, etc.)",
];

const VIP_POINTS_THRESHOLD = 500;
const POPCORN_COOLDOWN_MS = 600000;

const VIP_EXPERIENCE_PERKS = [
  { label: 'Gold wristband' },
  { label: '10% off everything at booth' },
  { label: '+1G Free 🌸' },
  { label: 'Free Popcorn' },
  { label: '2 free raffle entries', center: true },
];

/** Earn-points tasks — points must match DB_Settings.json Actions */
const EARN_POINTS_TASKS = [
  {
    actionName: 'Google Review',
    title: 'Google Review',
    points: 150,
    raffleEntry: true,
    verifyLabel: 'Find Guest & Verify',
    verifyType: 'staff',
    qrUrl: 'https://search.google.com/local/writereview?placeid=ChIJRYOSq0vzwogRnYP5n_UBNkQ',
    qrCaption: 'Scan to review',
  },
  {
    actionName: 'YouTube Subscription',
    title: 'YouTube Subscribe',
    points: 150,
    raffleEntry: true,
    verifyLabel: 'Find Guest & Verify',
    verifyType: 'staff',
    qrUrl: 'https://www.youtube.com/@GUDESSENCE?sub_confirmation=1',
    qrCaption: 'Scan to subscribe',
  },
  {
    actionName: 'Social Media Story Post',
    title: 'IG Story Post',
    points: 30,
    raffleEntry: true,
    verifyLabel: 'Find Guest & Verify',
    verifyType: 'staff',
    qrUrl: 'https://www.instagram.com/gudessence.clearwater/',
    qrCaption: 'Scan to follow / tag',
  },
  {
    actionName: 'Seasoning Vote',
    title: 'Flavor Vote',
    points: 50,
    raffleEntry: false,
    verifyLabel: 'Rate a Flavor',
    verifyType: 'navigate',
    navigateTo: 'vote',
  },
  {
    actionName: 'Booth Visit',
    title: 'Booth Check-In',
    points: 10,
    raffleEntry: false,
    verifyLabel: 'Automatic on register',
    verifyType: 'auto',
  },
];

const GuestReferenceDisplay = ({ contact, declined = false, monospace = true }) => {
  const ref = api.contactReference(contact);
  const legacy = api.legacyGuestReference(contact);
  const prehistoric = api.isPrehistoricGuestReference(contact);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span
        style={{
          fontFamily: monospace ? 'ui-monospace, monospace' : 'inherit',
          color: ref ? (declined ? 'rgba(255,255,255,0.45)' : 'var(--neon-lime)') : 'rgba(255,255,255,0.35)',
        }}
      >
        {ref || '—'}
      </span>
      {prehistoric && legacy ? (
        <span
          title={`Prehistoric reference: ${legacy}`}
          style={{
            display: 'inline-block',
            padding: '2px 6px',
            borderRadius: '999px',
            fontSize: '0.62rem',
            fontWeight: 'bold',
            letterSpacing: '0.04em',
            background: 'rgba(255,165,0,0.15)',
            color: '#ffb347',
            border: '1px solid rgba(255,165,0,0.35)',
          }}
        >
          PREHISTORIC
        </span>
      ) : null}
    </span>
  );
};

const ColombiaRetreatBadge = ({ contact, compact = false }) => {
  if (!api.isColombiaRetreatInterested(contact) && !contact?.colombia) return null;
  const source = contact?.colombia_retreat_source;
  const label = source === 'kiosk_early_bird' ? 'EARLY BIRD' : 'RETREAT';
  return (
    <span
      title={source ? api.colombiaRetreatSourceLabel(source) : 'Colombia retreat interest'}
      style={{
        display: 'inline-block',
        padding: compact ? '2px 6px' : '3px 8px',
        borderRadius: '999px',
        fontSize: compact ? '0.62rem' : '0.68rem',
        fontWeight: 'bold',
        letterSpacing: '0.04em',
        background: 'rgba(255,140,0,0.15)',
        color: '#ffb347',
        border: '1px solid rgba(255,140,0,0.35)',
      }}
    >
      🇨🇴 {label}
    </span>
  );
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("App Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="view-container" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
          <h1 className="neon-text-pink">System Glitch</h1>
          <p>The kiosk encountered an unexpected error.</p>
          <button className="btn btn-lime" onClick={() => window.location.reload()}>Reboot System</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Keyboard Components ---

const clampKeyboardPosition = (x, y, width, height) => ({
  x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
  y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
});

const computeKeyboardPositionBelowAnchor = (anchorRect, keyboardWidth, keyboardHeight) => {
  const gap = 14;
  let x = anchorRect.left + (anchorRect.width / 2) - (keyboardWidth / 2);
  let y = anchorRect.bottom + gap;

  if (y + keyboardHeight > window.innerHeight - 8) {
    y = anchorRect.top - keyboardHeight - gap;
  }

  return clampKeyboardPosition(x, y, keyboardWidth, keyboardHeight);
};

const VirtualKeyboard = ({ value, onChange, onClear, onClose, onNext, layout = 'default', maxLength, anchorRect }) => {
  const keyboardRef = useRef(null);
  const dragRef = useRef({ active: false, pointerId: null, offsetX: 0, offsetY: 0 });
  const [position, setPosition] = useState(null);
  const [positionReady, setPositionReady] = useState(!anchorRect);

  const layouts = {
    default: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '@', '.', '_'],
      ['SPACE', 'BACKSPACE', onNext ? 'NEXT' : 'DONE']
    ],
    numeric: [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['CLEAR', '0', 'BACKSPACE'],
      [onNext ? 'NEXT' : 'DONE']
    ]
  };

  const handleDragStart = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const el = keyboardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const anchored = position ?? clampKeyboardPosition(rect.left, rect.top, rect.width, rect.height);
    if (!position) setPosition(anchored);

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      offsetX: e.clientX - anchored.x,
      offsetY: e.clientY - anchored.y,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    const el = keyboardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setPosition(clampKeyboardPosition(
      e.clientX - dragRef.current.offsetX,
      e.clientY - dragRef.current.offsetY,
      rect.width,
      rect.height
    ));
  };

  const handleDragEnd = (e) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = { active: false, pointerId: null, offsetX: 0, offsetY: 0 };
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  useLayoutEffect(() => {
    const el = keyboardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (anchorRect) {
      setPosition(computeKeyboardPositionBelowAnchor(anchorRect, rect.width, rect.height));
    } else {
      setPosition(null);
    }
    setPositionReady(true);
  }, [anchorRect, layout]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const el = keyboardRef.current;
        if (!el) return prev;
        const rect = el.getBoundingClientRect();
        return clampKeyboardPosition(prev.x, prev.y, rect.width, rect.height);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleKey = (key) => {
    playSound('click');
    if (key === 'DONE') { onClose(); return; }
    if (key === 'NEXT') { onNext(); return; }
    if (key === 'BACKSPACE') { onChange(value.slice(0, -1)); return; }
    if (key === 'CLEAR') { onClear ? onClear() : onChange(''); return; }
    if (key === 'SPACE') { if (!maxLength || value.length < maxLength) onChange(value + ' '); return; }
    
    if (!maxLength || value.length < maxLength) {
      const newValue = value + key;
      onChange(newValue);
      
      // Auto-close numeric keyboard for phone numbers (10 digits)
      if (layout === 'numeric' && maxLength === 10 && newValue.length === 10) {
        setTimeout(onClose, 100);
      }
    }
  };

  return (
    <div
      ref={keyboardRef}
      className={`keyboard-overlay${position ? ' keyboard-overlay--placed' : ''}${positionReady ? '' : ' keyboard-overlay--pending'}`}
      style={position ? { left: position.x, top: position.y } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="keyboard-header">
        <div
          className="keyboard-drag-handle"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <span className="keyboard-drag-grip" aria-hidden="true">⋮⋮</span>
          <span className="keyboard-drag-label">
            {layout === 'numeric' ? 'NUMERIC PAD (DRAG TO MOVE)' : 'TOUCH KEYBOARD (DRAG TO MOVE)'}
          </span>
        </div>
        <button className="key key-special keyboard-hide-btn" onClick={onClose}>HIDE</button>
      </div>
      
      {layout === 'numeric' ? (
        <div className="numpad">
          {layouts.numeric.flat().map(key => (
            <button 
              key={key} 
              className={`key ${(key === 'DONE' || key === 'NEXT') ? 'key-wide key-special' : ''}`} 
              onClick={() => handleKey(key)} 
              style={{
                ...((key === 'DONE' || key === 'NEXT') ? { gridColumn: 'span 3' } : {}),
                ...((key === 'CLEAR' || key === 'BACKSPACE') ? { fontSize: '0.7rem' } : {})
              }}
            >
              {key}
            </button>
          ))}
        </div>
      ) : (
        layouts.default.map((row, i) => (
          <div key={i} className="keyboard-row">
            {row.map(key => (
              <button key={key} className={`key ${key.length > 1 ? 'key-wide key-special' : ''}`} onClick={() => handleKey(key)}>
                {key}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

// --- Shared Components ---

const CustomDropdown = ({ options, value, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
      <button 
        type="button"
        className="btn" 
        style={{ width: '100%', margin: 0, justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value || placeholder}</span>
        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          background: '#1a1a20', border: '1px solid var(--glass-border)', 
          borderRadius: '10px', zIndex: 5000, marginTop: '5px',
          maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
        }}>
          {safeOptions.map(opt => (
            <div 
              key={opt} 
              onClick={() => { onChange(opt); setIsOpen(false); playSound('click'); }}
              style={{ 
                padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', 
                cursor: 'pointer', background: value === opt ? 'rgba(204, 255, 0, 0.1)' : 'transparent' 
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CONTACT_SEARCH_MIN_LENGTH = 1;
const CONTACT_SEARCH_DEBOUNCE_MS = 200;

function useContactSearch({ minLength = CONTACT_SEARCH_MIN_LENGTH, debounceMs = CONTACT_SEARCH_DEBOUNCE_MS, limit = 30 } = {}) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeout = useRef(null);

  const handleSearch = useCallback((val) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const trimmed = String(val || '').trim();
    if (trimmed.length < minLength) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        setSearchResults(await api.searchContacts(trimmed, limit));
      } catch {
        setSearchResults([]);
      }
    }, debounceMs);
  }, [minLength, debounceMs, limit]);

  const clearSearch = useCallback(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearch('');
    setSearchResults([]);
  }, []);

  return { search, searchResults, handleSearch, clearSearch, setSearch, setSearchResults };
}

function formatContactSearchLine(contact) {
  const ref = api.contactReference(contact);
  const contactLine = contact.email || contact.phone || '—';
  return ref ? `${contactLine} · ${ref}` : contactLine;
}

const ContactSearchResults = ({ results, onSelect, hint = 'Matches from attendee list — tap to select' }) => {
  if (!results?.length) return null;
  return (
    <div className="contact-search-results">
      <p className="contact-search-results__hint">{hint}</p>
      {results.map((contact) => (
        <button
          type="button"
          key={contact.contact_id}
          className="contact-search-results__item"
          onClick={() => { playSound('click'); onSelect(contact); }}
        >
          <strong>{contact.name}</strong>
          <span>{formatContactSearchLine(contact)}</span>
        </button>
      ))}
    </div>
  );
};

const Notification = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3000);
        return () => clearTimeout(t);
    }, [onClose]);
    
    const styles = {
        success: { background: 'var(--neon-lime)', color: 'black' },
        error: { background: 'var(--cyber-pink)', color: 'white' },
        info: { background: 'var(--electric-violet)', color: 'white' }
    };
    return (
        <div style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '15px 30px', borderRadius: '12px', zIndex: 10000, fontWeight: 'bold',
            boxShadow: '0 5px 20px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '15px',
            ...styles[type]
        }}>
            <span>{message}</span>
            <button onClick={() => { playSound('click'); onClose(); }} style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
        </div>
    );
};

const StaffApprovalModal = ({ isOpen, onClose, onApprove, actionName, onFocusInput, setNotify, staffNames }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [pin, setPin] = useState('');
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await window.electronAPI.validateStaffPin(selectedStaff, pin);
    if (ok) { onApprove(selectedStaff); onClose(); setPin(''); setSelectedStaff(''); }
    else { playSound('error'); setNotify({ message: 'Invalid PIN', type: 'error' }); }
  };
  return (
    <div className="modal-overlay">
      <div className="card" style={{ width: '450px', textAlign: 'center' }}>
        <h3 className="neon-text-pink">Staff Approval</h3>
        <p style={{ margin: '15px 0' }}>Action: <strong>{actionName}</strong></p>
        <form onSubmit={handleSubmit}>
          <CustomDropdown 
            options={staffNames} 
            value={selectedStaff} 
            onChange={setSelectedStaff} 
            placeholder="Choose Staff..." 
          />
          <div className="input-group">            <input 
              type="password" 
              placeholder="PIN" 
              value={pin} 
              readOnly
              onClick={(e) => onFocusInput('numeric', pin, setPin, 4, null, e.currentTarget)}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px' }} 
              required 
            />
          </div>
          <button type="submit" className="btn btn-lime" style={{ width: '100%', margin: '10px 0' }} onClick={() => playSound('click')}>Approve</button>
          <button type="button" className="btn" onClick={() => { playSound('click'); onClose(); }} style={{ width: '100%', background: 'transparent' }}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

const usePopcornCooldown = (lastRedeemed) => {
  const [ready, setReady] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const update = () => {
      if (!lastRedeemed) {
        setReady(true);
        setTimeLeft(null);
        return;
      }
      const diff = POPCORN_COOLDOWN_MS - (Date.now() - new Date(lastRedeemed).getTime());
      if (diff <= 0) {
        setReady(true);
        setTimeLeft('0:00');
      } else {
        setReady(false);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [lastRedeemed]);

  return { ready, timeLeft };
};

const RefillCountdown = ({ lastRedeemed }) => {
  const { ready, timeLeft } = usePopcornCooldown(lastRedeemed);
  if (ready) return <p className="neon-text-lime" style={{ fontWeight: 'bold', margin: 0 }}>REFILL READY!</p>;
  return (
    <div>
      <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0 0 4px' }}>Next refill in</p>
      <p className="neon-text-pink" style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{timeLeft}</p>
    </div>
  );
};

const PopcornRefillPanel = ({ contact, staffName, onDistributed, setNotify, compact = false }) => {
  const [dose, setDose] = useState('low');
  const [loading, setLoading] = useState(false);
  const { ready, timeLeft } = usePopcornCooldown(contact?.vip_popcorn_last_redeemed_at);

  if (!contact?.is_vip) {
    return (
      <p style={{ margin: 0, opacity: 0.65, fontSize: compact ? '0.85rem' : '0.95rem' }}>
        Guest is not VIP — grant VIP status first to enable popcorn refills.
      </p>
    );
  }

  const handleDistribute = async () => {
    if (!ready || loading) return;
    setLoading(true);
    try {
      await api.redeemPopcorn(contact.contact_id, staffName, dose);
      playSound('vip');
      setNotify?.({
        message: `Popcorn (${dose} dose) marked for ${contact.name}`,
        type: 'success',
      });
      onDistributed?.(contact.contact_id);
    } catch (err) {
      playSound('error');
      setNotify?.({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: compact ? '14px' : '18px',
        borderRadius: '12px',
        border: ready ? '1px solid var(--neon-lime)' : '1px solid rgba(255, 0, 127, 0.35)',
        background: ready ? 'rgba(204, 255, 0, 0.06)' : 'rgba(255, 0, 127, 0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: '0.75rem', opacity: 0.55, textTransform: 'uppercase' }}>VIP Popcorn Refill</p>
          <p style={{ margin: 0, fontSize: compact ? '0.85rem' : '0.95rem', opacity: 0.75 }}>
            1 refill every 10 minutes · low or high dose
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {ready ? (
            <span style={{ color: 'var(--neon-lime)', fontWeight: 'bold', fontSize: compact ? '0.9rem' : '1rem' }}>Ready now</span>
          ) : (
            <>
              <p style={{ margin: '0 0 2px', fontSize: '0.75rem', opacity: 0.55 }}>Cooldown</p>
              <span className="neon-text-pink" style={{ fontWeight: 'bold', fontSize: compact ? '1.1rem' : '1.35rem' }}>{timeLeft}</span>
            </>
          )}
        </div>
      </div>

      {contact.vip_popcorn_last_redeemed_at && (
        <p style={{ margin: '0 0 14px', fontSize: '0.8rem', opacity: 0.60 }}>
          Last distributed: {api.formatCivilianTime(contact.vip_popcorn_last_redeemed_at)}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {['low', 'high'].map((option) => (
          <button
            key={option}
            type="button"
            className="btn"
            style={{
              flex: 1,
              margin: 0,
              padding: compact ? '8px 10px' : '10px 12px',
              fontSize: '0.85rem',
              background: dose === option ? 'rgba(204, 255, 0, 0.15)' : 'transparent',
              border: dose === option ? '1px solid var(--neon-lime)' : '1px solid var(--glass-border)',
              color: dose === option ? 'var(--neon-lime)' : 'rgba(255,255,255,0.75)',
            }}
            onClick={() => { playSound('click'); setDose(option); }}
          >
            {option === 'low' ? 'Low dose' : 'High dose'}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-lime"
        style={{ width: '100%', margin: 0, opacity: ready && !loading ? 1 : 0.45 }}
        disabled={!ready || loading}
        onClick={handleDistribute}
      >
        {loading ? 'Saving…' : ready ? 'Mark Popcorn Distributed' : `Wait ${timeLeft}`}
      </button>
    </div>
  );
};

const PopcornStatusChip = ({ isVip, lastRedeemed }) => {
  const { ready, timeLeft } = usePopcornCooldown(lastRedeemed);
  if (!isVip) return <span style={{ opacity: 0.25, fontSize: '0.8rem' }}>—</span>;
  if (ready) {
    return (
      <span style={{ color: 'var(--neon-lime)', fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
        Ready
      </span>
    );
  }
  return (
    <span className="neon-text-pink" style={{ fontSize: '0.75rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
      {timeLeft}
    </span>
  );
};

// --- Views ---

const Home = ({ onNavigate, currentContactId, currentContactName, setNotify }) => {
  const [totalEntries, setTotalEntries] = useState(0);
  const [hasRetreat, setHasRetreat] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTotal = async () => {
      const list = await api.getAllRecentContacts();
      const counts = await Promise.all(list.map(c => api.getEntryCount(c.contact_id)));
      setTotalEntries(counts.reduce((a, b) => a + b, 0));
      
      if (currentContactId) {
        const contact = await api.getContactById(currentContactId);
        const actions = await api.getCompletedActions(currentContactId);
        setHasRetreat(api.isColombiaRetreatInterested(contact) || actions.includes('Retreat Interest'));
      }
    };
    fetchTotal();
    const interval = setInterval(fetchTotal, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [currentContactId]);

  const handleQuickRetreat = async (e) => {
    e.stopPropagation();
    if (!currentContactId) return onNavigate('register');
    setLoading(true);
    try {
      await api.markColombiaRetreatInterest(currentContactId, 'home_one_tap', 'System');
      setHasRetreat(true);
      if (setNotify) setNotify({ message: 'Success! Colombia Interest Logged.', type: 'success' });
    } catch (err) {
      if (setNotify) setNotify({ message: 'Registration failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const go = (view) => {
    playSound('click');
    onNavigate(view);
  };

  return (
    <div className="view-container home-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', minHeight: '100%' }}>
      <header className="home-header">
        <AnimatedBrandTitle />
        <h2 className="neon-text-violet home-header__event home-header__event--pulse">Cannadelic Night Market</h2>
        <p className="home-header__url">gudessence.com</p>
      </header>

      <div className="home-greeting home-greeting--fade">
        {currentContactName ? (
          <div className="neon-text-lime home-greeting__welcome">Welcome, {currentContactName}!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <h2 className="neon-text-violet" style={{ fontSize: '1.5rem' }}>Hello There!</h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', maxWidth: '420px', lineHeight: 1.45 }}>
              Welcome to the Night Market. Start here to earn points &amp; entries.
            </p>
          </div>
        )}
      </div>

      <div className="home-menu">
        {/* 1. Check-in / profile (primary) */}
        {currentContactId ? (
          <HomeMenuCard
            variant="profile"
            iconSrc="/icons/profile-user.svg"
            title="View My Profile"
            subtitle="Manage your points & rewards"
            onClick={() => go('profile')}
            attentionIndex={0}
          />
        ) : (
          <HomeMenuCard
            variant="lime"
            iconSrc="/icons/checkin-popcorn.svg"
            iconRightSrc="/icons/checkin-popcorn.svg"
            title="CHECK-IN / REGISTER"
            subtitle="Get your pass for exclusive perks"
            badge="🍿 Free sample"
            textAlign="center"
            onClick={() => go('register')}
            attentionIndex={0}
          />
        )}

        {/* 2. Discover: event menu + rate flavor */}
        <HomeMenuRow>
          <HomeMenuCard
            variant="glass-pink"
            iconSrc="/icons/event-menu.svg"
            title="EVENT MENU"
            subtitle="Explore Popcorn & Merch"
            onClick={() => go('main-menu')}
            attentionIndex={1}
          />
          <HomeMenuCard
            variant="glass-violet"
            iconSrc="/icons/rate-flavor.svg"
            title="RATE FLAVOR"
            subtitle="Earn 50 Points on a review"
            onClick={() => go('vote')}
            attentionIndex={2}
          />
        </HomeMenuRow>

        {/* 3. Engage: giveaway + VIP Lounge */}
        <HomeMenuRow>
          <HomeMenuCard
            variant="violet"
            iconSrc="/icons/giveaway-hub.svg"
            title="GIVEAWAY HUB"
            subtitle="Earn Points → Unlock VIP"
            onClick={() => go('giveaway')}
            attentionIndex={4}
          />
          <HomeMenuCard
            variant="pink"
            iconSrc="/icons/vip-lounge.svg"
            title="VIP LOUNGE"
            subtitle="Register for VIP perks & rewards"
            onClick={() => go('vip')}
            attentionIndex={3}
          />
        </HomeMenuRow>

        {/* 4. Marketing: Colombia retreat */}
        <HomeRetreatCard onClick={() => go('colombia')} attentionIndex={5}>
          <span className="home-menu-card__title">RETREAT TO COLOMBIA 🇨🇴</span>
          <span className="home-menu-card__subtitle home-menu-card__subtitle--retreat">
            <span className="home-retreat-savings">Save $500!</span>
            <span className="home-retreat-tag">All-inclusive luxury wellness retreat</span>
          </span>
          {currentContactId && (
            <span className="home-retreat-extra">
              {hasRetreat ? (
                <span className="home-retreat-badge">✅ ON THE LIST</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-lime home-retreat-cta"
                  data-retreat-nested
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickRetreat(e);
                  }}
                  disabled={loading}
                >
                  {loading ? '...' : 'ONE-TAP SIGN UP'}
                </button>
              )}
            </span>
          )}
        </HomeRetreatCard>

        {/* 5. Utility: link ticket */}
        <HomeMenuCard
          variant="utility"
          iconSrc="/icons/link-ticket.svg"
          title="LINK PHYSICAL TICKET NUMBER"
          onClick={() => go('add-ticket')}
          textAlign="center"
          attentionIndex={6}
        />
      </div>

      <footer style={{ marginTop: '48px', paddingBottom: '20px', textAlign: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.1)' }} onClick={() => go('staff-login')}>Staff Portal</button>
      </footer>
    </div>
  );
};

const MenuRaffleBanner = ({ accent = 'var(--neon-lime)' }) => (
  <div className="menu-raffle-banner" style={{ '--banner-accent': accent }} role="note">
    <span className="menu-raffle-banner__icon" aria-hidden="true">🎟️</span>
    <span className="menu-raffle-banner__title">Every purchase includes 1 raffle entry</span>
  </div>
);

const MenuItemRaffleBadge = () => (
  <span className="menu-item-raffle-badge">+1 Raffle Entry</span>
);

const MainMenu = ({ onNavigate }) => (
  <div className="view-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%', padding: '60px 20px' }}>
    <h2 className="neon-text-violet" style={{ marginBottom: '24px', fontSize: '2.5rem' }}>Select Event Menu</h2>
    <MenuRaffleBanner accent="var(--neon-lime)" />
    
    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1100px', width: '100%' }}>
      <div
        className="card menu-picker-card menu-picker-card--lime"
        onClick={() => { playSound('click'); onNavigate('menu-infused'); }}
      >
        <div className="menu-picker-card__body">
          <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🍿</div>
          <h3 className="neon-text-lime" style={{ fontSize: '2.2rem', marginBottom: '15px' }}>Infused Popcorn</h3>
          <div style={{ height: '2px', width: '60px', background: 'var(--neon-lime)', marginBottom: '20px' }}></div>
          <p style={{ margin: '0 0 16px 0', opacity: 0.8, fontSize: '1.1rem', lineHeight: '1.5' }}>
            Explore our signature flavors, seasoning kits, and VIP experiences.
          </p>
          <span className="menu-raffle-inline">🎟️ +1 raffle entry per item</span>
        </div>
        <button type="button" className="btn btn-lime menu-picker-card__action">View Flavors</button>
      </div>

      <div
        className="card menu-picker-card menu-picker-card--violet"
        onClick={() => { playSound('click'); onNavigate('menu-products'); }}
      >
        <div className="menu-picker-card__body">
          <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🛍️</div>
          <h3 className="neon-text-violet" style={{ fontSize: '2.2rem', marginBottom: '15px' }}>Merchandise</h3>
          <div style={{ height: '2px', width: '60px', background: 'var(--electric-violet)', marginBottom: '20px' }}></div>
          <p style={{ margin: '0 0 16px 0', opacity: 0.8, fontSize: '1.1rem', lineHeight: '1.5' }}>
            Premium flower selections, signature apparel, and wellness products.
          </p>
          <span className="menu-raffle-inline">🎟️ +1 raffle entry per item</span>
        </div>
        <button type="button" className="btn btn-violet menu-picker-card__action">View Shop</button>
      </div>
    </div>

    <button className="btn" style={{ marginTop: '60px', marginBottom: '40px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => { playSound('click'); onNavigate('home'); }}>
      ← Back to Home
    </button>
  </div>
);

const InfusedMenu = ({ onBack }) => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollRef = useRef(null);

  const handleScroll = (e) => {
    if (e.target.scrollTop > 50) setShowScrollHint(false);
  };

  const categories = [
    {
      title: "Popcorn & Drinks",
      accent: "var(--neon-lime)",
      items: [
        { name: "1 Bag + 1 Water", price: "$5" },
        { name: "2 Bags + 1 Water", price: "$8" },
        { name: "1 Water", price: "$3.50" }
      ]
    },
    {
      title: "Seasoning Kits",
      accent: "var(--electric-violet)",
      items: [
        { name: "Sweet Kit: 3 Pack", price: "$25", pairing: "Pairs well with Kush" },
        { name: "Savory Kit: 3 Pack", price: "$25", pairing: "Try with Lemon Ginger Sugar" },
        { name: "Individual Seasoning", price: "$10" }
      ]
    },
    {
      title: "Premium Experiences",
      accent: "var(--cyber-pink)",
      items: [
        { name: "Popcorn Flight (4 Seasonings)", price: "$10", featured: true, pairing: "Top Seller! Customer Favorite" },
        { name: "Full VIP Experience", price: "$20", featured: true, pairing: "The Ultimate Kiosk Experience" }
      ]
    }
  ];

  const renderMenuItem = (item) => (
    <div className={`menu-item-row${item.featured ? ' menu-item-row--featured' : ''}`}>
      <div className="menu-item-row__main">
        <p className={`menu-item-row__name${item.featured ? ' menu-item-row__name--featured' : ''}`}>
          {item.name}
        </p>
        <MenuItemRaffleBadge />
      </div>
      <strong className={`menu-item-row__price${item.featured ? ' menu-item-row__price--featured' : ''}`}>
        {item.price}
      </strong>
      {item.pairing ? <div className="pairing-note" style={{ width: '100%' }}>{item.pairing}</div> : null}
    </div>
  );

  return (
    <div className="view-container" style={{ padding: '40px 20px', textAlign: 'center', overflowY: 'auto' }} onScroll={handleScroll} ref={scrollRef}>
      <h2 className="neon-text-lime" style={{ marginBottom: '10px', fontSize: '2.5rem' }}>Popcorn Infused Menu</h2>
      <MenuRaffleBanner accent="var(--neon-lime)" />
      <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '30px', color: 'var(--text-primary)', background: 'rgba(255, 0, 127, 0.1)', display: 'inline-block', padding: '5px 20px', borderRadius: '50px', border: '1px solid var(--cyber-pink)' }}>
        ⚠️ This menu includes Infused (Low/High Dose) and Non-Infused options.
      </p>
      
      {showScrollHint && (
        <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, animation: 'bounce 2s infinite', color: 'var(--neon-lime)', fontWeight: 'bold' }}>
          SCROLL FOR MORE ▽
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', 
        gap: '25px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {categories.map((cat, idx) => (
          <div key={idx} className="card" style={{ 
            padding: '25px', 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'rgba(20, 20, 24, 0.8)',
            border: `1px solid ${cat.accent}33`
          }}>
            <h3 style={{ 
              color: cat.accent, 
              borderBottom: `2px solid ${cat.accent}`, 
              paddingBottom: '10px', 
              marginBottom: '20px',
              fontSize: '1.4rem'
            }}>{cat.title}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cat.items.map((item) => (
                <div key={item.name}>{renderMenuItem(item)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={() => { playSound('click'); onBack(); }}>Back</button>
    </div>
  );
};

const ProductMenu = ({ onBack }) => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const handleScroll = (e) => {
    if (e.target.scrollTop > 50) setShowScrollHint(false);
  };

  const categories = [
    {
      title: "Flower Products",
      accent: "var(--neon-lime)",
      items: [
        { name: "OG", price: "$15", status: "LIMITED" }, 
        { name: "Kush", price: "$20", status: "STAFF PICK" },
        { name: "8th (Cereal Milk)", price: "$30", featured: true }
      ]
    },
    {
      title: "Edibles & Beverages",
      accent: "var(--cyber-pink)",
      items: [
        { name: "Wyld Gummies (2Pk)", price: "$5" }, { name: "Wyld Gummies (20pk)", price: "$35", status: "BEST VALUE" },
        { name: "Wyld Sparkling Water", price: "$5" }, { name: "Infused Coffee", price: "$28" },
        { name: "Juice Joint Infused Drinks", price: "$10" }, { name: "Mushroom Honey", price: "$20" },
        { name: "Mushroom Honey Drops", price: "$25" }
      ]
    },
    {
      title: "Wellness & Skincare",
      accent: "var(--electric-violet)",
      items: [
        { name: "CBD Facial Kit", price: "$72", status: "PREMIUM" }, { name: "CDB Lube", price: "$40" },
        { name: "Luminous Facial Serum", price: "$67" }, { name: "Bath Bombs", price: "$16" },
        { name: "Crystal Candle", price: "$17" }
      ]
    },
    {
      title: "Apparel & Accessories",
      accent: "var(--neon-lime)",
      items: [
        { name: "Tote Bag", price: "$26" }, { name: "T-Shirt", price: "$40" },
        { name: "Hoodie", price: "$60" }, { name: "Gud T-Shirt", price: "$40" },
        { name: "Sweatshirt", price: "$60" }, { name: "Beanie", price: "$37" },
        { name: "Logo Cap", price: "$40" }, { name: "Stressed Hat", price: "$40" }
      ]
    },
    {
      title: "Cannabis Accessories",
      accent: "var(--electric-violet)",
      items: [
        { name: "16g Barbari Flower", price: "$24" }, { name: "2 Barbari Prerolls", price: "$12" },
        { name: "Blazey Susan Stash Bag", price: "$70" }, { name: "Blazey Susan Fanny Pack", price: "$30" },
        { name: "Blazey Susan Rolling Tray", price: "$30" }, { name: "Blazey Susan Tea Wrap", price: "$2" },
        { name: "Blazey Susan Rose Wrap", price: "$2" }, { name: "Blazey Susan Cones", price: "$3" },
        { name: "Blazey Susan Grinder", price: "$35" }
      ]
    }
  ];

  const renderProductItem = (item) => (
    <div className={`menu-item-row${item.featured ? ' menu-item-row--featured' : ''}`}>
      <div className="menu-item-row__main">
        <p className={`menu-item-row__name${item.featured ? ' menu-item-row__name--featured' : ''}`}>
          {item.name}
          {item.status ? (
            <span className={`badge ${item.status === 'LIMITED' ? 'badge-scarcity' : 'badge-staff'}`}>{item.status}</span>
          ) : null}
          {item.featured ? (
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyber-pink)' }}>BEST SELLER</span>
          ) : null}
        </p>
        <MenuItemRaffleBadge />
      </div>
      <strong className={`menu-item-row__price${item.featured ? ' menu-item-row__price--featured' : ''}`}>
        {item.price}
      </strong>
    </div>
  );

  return (
    <div className="view-container" style={{ padding: '40px 20px', textAlign: 'center', overflowY: 'auto' }} onScroll={handleScroll}>
      <h2 className="neon-text-violet" style={{ marginBottom: '16px', fontSize: '2.5rem' }}>Products & Merchandise</h2>
      <MenuRaffleBanner accent="var(--electric-violet)" />
      
      {showScrollHint && (
        <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, animation: 'bounce 2s infinite', color: 'var(--electric-violet)', fontWeight: 'bold' }}>
          SCROLL FOR MORE ▽
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', 
        gap: '25px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {categories.map((cat, idx) => (
          <div key={idx} className="card" style={{ 
            padding: '25px', 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'rgba(20, 20, 24, 0.8)',
            border: `1px solid ${cat.accent}33`
          }}>
            <h3 style={{ 
              color: cat.accent, 
              borderBottom: `2px solid ${cat.accent}`, 
              paddingBottom: '10px', 
              marginBottom: '20px',
              fontSize: '1.4rem'
            }}>{cat.title}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cat.items.map((item) => (
                <div key={item.name}>{renderProductItem(item)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={() => { playSound('click'); onBack(); }}>Back</button>
    </div>
  );
};

function ResponsiveSignupQr({ value, minSize = 300, maxSize = 480 }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState(minSize);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setSize(Math.round(Math.min(maxSize, Math.max(minSize, width))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [minSize, maxSize]);

  return (
    <div ref={wrapRef} className="mobile-signup-qr-wrap mobile-signup-qr-wrap--hero">
      <QRCodeCanvas value={value} size={size} level="M" includeMargin />
    </div>
  );
}

const MobileSignupPanel = ({
  staffName = 'Staff',
  onApproved,
  onDeclined,
  onError,
  showQr = true,
  showPending = true,
  showStaffTools = true,
  largeQr = false,
  title = 'Skip the Line',
  stream = 'booth',
}) => {
  const [signupUrl, setSignupUrl] = useState('');
  const [staffUrl, setStaffUrl] = useState('');
  const [signupStatus, setSignupStatus] = useState(null);
  const [pendingSignups, setPendingSignups] = useState([]);
  const [confirmStep, setConfirmStep] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [showStaffQr, setShowStaffQr] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const signupUrlFn = stream === 'colombia_retreat' ? api.getColombiaRetreatSignupUrl : api.getMobileSignupUrl;
      const pendingStream = stream === 'colombia_retreat' ? 'colombia_retreat' : 'booth';
      const [url, status, list, staff] = await Promise.all([
        signupUrlFn(),
        api.getMobileSignupStatus(),
        showPending ? api.getPendingMobileSignups(pendingStream) : Promise.resolve([]),
        showStaffTools
          ? (stream === 'colombia_retreat'
            ? api.getMobileSignupStatus().then((s) => s?.publicColombiaStaffUrl || null)
            : api.getCloudStaffUrl())
          : Promise.resolve(null),
      ]);
      setSignupUrl(url || '');
      setStaffUrl(staff || '');
      setSignupStatus(status);
      setPendingSignups(list);
    } catch (err) {
      console.error('Mobile signup panel refresh failed:', err);
    }
  }, [stream, showPending, showStaffTools]);

  useEffect(() => {
    refresh();
    const unsubscribe = api.onMobileSignupUpdate?.(() => refresh());
    const interval = setInterval(refresh, 2000);
    return () => {
      clearInterval(interval);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!confirmStep) return;
    if (!pendingSignups.some((s) => s.contact_id === confirmStep.contactId)) {
      setConfirmStep(null);
      setConfirmingId(null);
    }
  }, [pendingSignups, confirmStep]);

  useEffect(() => {
    if (!signupStatus) return;
    if (signupStatus.mode === 'cloud' && !signupStatus.connected) {
      console.warn('Cloud relay offline:', signupStatus.lastError || 'check internet and signup-sync.json');
    } else if (signupStatus.mode === 'disabled') {
      console.warn('Mobile QR signup not configured — see signup-sync.json');
    }
    if (showQr && !signupUrl && signupStatus.lastError) {
      console.warn('Guest signup QR unavailable:', signupStatus.lastError);
    }
  }, [signupStatus, signupUrl, showQr]);

  const removePendingCard = (contactId) => {
    setPendingSignups((prev) => prev.filter((s) => s.contact_id !== contactId));
    setConfirmStep((prev) => (prev?.contactId === contactId ? null : prev));
  };

  const handleApprove = async (signup) => {
    setConfirmingId(signup.contact_id);
    setConfirmStep(null);
    try {
      await api.confirmMobileSignup(signup.contact_id, staffName);
      playSound('confirm');
      removePendingCard(signup.contact_id);
      await refresh();
      onApproved?.(signup);
    } catch (err) {
      playSound('error');
      onError?.(err.message || 'Could not approve signup');
      await refresh();
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDecline = async (signup) => {
    setConfirmingId(signup.contact_id);
    setConfirmStep(null);
    try {
      await api.denyMobileSignup(signup.contact_id, staffName);
      playSound('confirm');
      removePendingCard(signup.contact_id);
      await refresh();
      onDeclined?.(signup);
    } catch (err) {
      playSound('error');
      onError?.(err.message || 'Could not decline signup');
      await refresh();
    } finally {
      setConfirmingId(null);
    }
  };

  const relayIcon = signupStatus?.mode === 'cloud'
    ? (signupStatus.connected ? '🟢' : '🔴')
    : null;

  return (
    <div className="card" style={{ margin: 0, textAlign: 'center' }}>
      <h3 className="neon-text-violet" style={{ marginBottom: '8px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {title}
        {relayIcon && (
          <span
            title={signupStatus.connected ? 'Cloud relay online' : 'Cloud relay offline'}
            style={{ fontSize: '0.85rem', lineHeight: 1 }}
            aria-label={signupStatus.connected ? 'Cloud relay online' : 'Cloud relay offline'}
          >
            {relayIcon}
          </span>
        )}
      </h3>

      {showStaffTools && staffUrl && (
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className="btn btn-violet"
            style={{ minWidth: 'auto', padding: '8px 16px', margin: 0, fontSize: '0.85rem' }}
            onClick={() => { playSound('click'); setShowStaffQr((v) => !v); }}
          >
            {showStaffQr ? 'Hide Staff QR' : 'Staff Monitor'}
          </button>
          {showStaffQr && (
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '16px',
              display: 'inline-block',
              marginTop: '12px',
              boxShadow: '0 0 30px rgba(204,255,0,0.25)',
            }}>
              <QRCodeCanvas value={staffUrl} size={180} level="M" includeMargin />
            </div>
          )}
        </div>
      )}

      {showQr && signupUrl && (
        largeQr ? (
          <>
            <ResponsiveSignupQr value={signupUrl} />
            <p className="mobile-signup-qr-caption">
              Scan with your phone camera to sign up from the line
            </p>
          </>
        ) : (
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '16px',
            display: 'inline-block',
            marginBottom: '12px',
            boxShadow: '0 0 30px rgba(204,255,0,0.25)',
          }}>
            <QRCodeCanvas value={signupUrl} size={180} level="M" includeMargin />
            {stream === 'colombia_retreat' ? (
              <p style={{ color: '#111', fontSize: '0.75rem', margin: '10px 0 0', maxWidth: '180px' }}>
                Scan to join the Colombia retreat waitlist from your phone
              </p>
            ) : null}
          </div>
        )
      )}

      {showPending ? (
      <div style={{ textAlign: 'left', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 className="neon-text-lime" style={{ margin: 0, fontSize: '0.95rem' }}>Pending Phone Signups</h4>
          <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{pendingSignups.length} waiting</span>
        </div>

        {pendingSignups.length === 0 ? (
          <p style={{ opacity: 0.5, fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
            No pending signups. Display the QR near the line.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {pendingSignups.map((signup) => (
              <div
                key={signup.contact_id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(204,255,0,0.25)',
                  background: 'rgba(204,255,0,0.04)',
                }}
              >
                {confirmStep?.contactId === signup.contact_id ? (
                  <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', border: `1px solid ${confirmStep.action === 'decline' ? 'rgba(255,80,80,0.45)' : 'rgba(255,0,127,0.35)'}`, background: confirmStep.action === 'decline' ? 'rgba(255,80,80,0.1)' : 'rgba(255,0,127,0.08)' }}>
                    <p style={{ fontSize: '0.8rem', margin: '0 0 10px', lineHeight: 1.45 }}>
                      <strong>Are you sure?</strong>{' '}
                      {confirmStep.action === 'decline'
                        ? <>Decline <strong>{signup.name}</strong>{signup.guest_reference ? <> ({signup.guest_reference})</> : null} and mark as declined in attendee list.</>
                        : <>Verify <strong>{signup.name}</strong>{signup.guest_reference ? <> ({signup.guest_reference})</> : null} matches the guest in front of you.</>}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          minWidth: 'auto',
                          padding: '8px 14px',
                          margin: 0,
                          fontSize: '0.8rem',
                          flex: 1,
                          background: confirmStep.action === 'decline' ? '#ff6b6b' : undefined,
                          border: confirmStep.action === 'decline' ? 'none' : undefined,
                          color: confirmStep.action === 'decline' ? '#fff' : undefined,
                        }}
                        disabled={confirmingId === signup.contact_id}
                        onClick={() => (confirmStep.action === 'decline' ? handleDecline(signup) : handleApprove(signup))}
                      >
                        {confirmingId === signup.contact_id ? '...' : confirmStep.action === 'decline' ? 'Yes, decline' : 'Yes, approve'}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ minWidth: 'auto', padding: '8px 14px', margin: 0, fontSize: '0.8rem', flex: 1 }}
                        onClick={() => { playSound('click'); setConfirmStep(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {(signup.guest_reference || signup.display_id) && (
                        <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--cyber-lime)', fontSize: '0.8rem', marginBottom: '4px' }}>
                          {signup.guest_reference || signup.display_id}
                        </div>
                      )}
                      <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{signup.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
                        {signup.email && <div>✉ {signup.email}</div>}
                        {signup.phone && <div>☎ {signup.phone}</div>}
                        <div style={{ marginTop: '4px', color: 'var(--cyber-pink)' }}>
                          Status: PENDING · {signup.is_new ? 'New guest' : 'Returning'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-lime"
                        style={{ minWidth: 'auto', padding: '8px 14px', margin: 0, fontSize: '0.8rem' }}
                        onClick={() => { playSound('click'); setConfirmStep({ contactId: signup.contact_id, action: 'approve' }); }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ minWidth: 'auto', padding: '8px 14px', margin: 0, fontSize: '0.8rem', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.45)', color: '#ff8a8a' }}
                        onClick={() => { playSound('click'); setConfirmStep({ contactId: signup.contact_id, action: 'decline' }); }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
                {confirmStep?.contactId !== signup.contact_id && (
                  <p style={{ fontSize: '0.65rem', opacity: 0.45, margin: '8px 0 0' }}>
                    Verify name, email, and phone match the guest before approving or declining.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      ) : null}
    </div>
  );
};

const CheckIn = ({ onBack, onSuccess, onFocusInput, vipRegistration = false }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [ticketNumbers, setTicketNumbers] = useState(['']);
  const [error, setError] = useState('');
  
  const handleAddTicket = () => {
    playSound('click');
    setTicketNumbers([...ticketNumbers, '']);
  };

  const updateTicket = (index, val) => {
    const next = [...ticketNumbers];
    next[index] = val;
    setTicketNumbers(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic Validation
    if (!formData.firstName.trim()) return setError('First Name is required');
    
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) return setError('Invalid Email Address');
    }
    
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) return setError('Phone number must be at least 10 digits');
    }

    if (!formData.email && !formData.phone) {
      return setError('Please provide either Email or Phone');
    }

    try {
      const result = vipRegistration
        ? await api.checkInOrRegisterVip({ ...formData, ticketNumbers: ticketNumbers.filter(t => t.trim().length === 6) })
        : await api.checkInOrRegister({ ...formData, ticketNumbers: ticketNumbers.filter(t => t.trim().length === 6) });
      playSound(vipRegistration ? 'vip' : 'confirm');
      onSuccess(result.contactId, result.isNew, result.contact?.name || formData.firstName, result);
    } catch (err) { 
      playSound('error'); 
      setError(err.message || 'Error'); 
    }
  };

  return (
    <div className="view-container" style={{ padding: '40px 30px', overflowY: 'auto' }}>
      <button className="btn" onClick={() => { playSound('click'); onBack(); }} style={{ background: 'transparent' }}>← Back</button>
      <h2 className="neon-text-lime" style={{ marginBottom: '30px', textAlign: 'center' }}>
        {vipRegistration ? 'VIP Registration' : 'Check-In / Register'}
      </h2>
      {vipRegistration && (
        <p style={{ textAlign: 'center', opacity: 0.75, margin: '-16px 0 24px', fontSize: '0.95rem' }}>
          Completing signup automatically grants VIP status, booth visit points, and +2 raffle entries.
        </p>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
        gap: '28px',
        maxWidth: '1200px',
        margin: '0 auto',
        alignItems: 'start',
      }}>
        <form onSubmit={handleSubmit} className="card" style={{ margin: 0 }}>
          <p style={{ marginBottom: '20px', opacity: 0.7, textAlign: 'center' }}>Enter your info at the kiosk. If you've been here before, we'll find you!</p>
          {error && <p style={{ color: 'var(--cyber-pink)', marginBottom: '20px', textAlign: 'center' }}>{error}</p>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label className="input-label">First Name</label>
              <input 
                type="text" 
                value={formData.firstName} 
                readOnly 
                placeholder="Required"
                onClick={(e) => onFocusInput('default', formData.firstName, (v) => setFormData(prev => ({...prev, firstName: v})), null, () => document.getElementById('last-name-input').click(), e.currentTarget)} 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Last Name</label>
              <input 
                id="last-name-input"
                type="text" 
                value={formData.lastName} 
                readOnly 
                placeholder="Optional"
                onClick={(e) => onFocusInput('default', formData.lastName, (v) => setFormData(prev => ({...prev, lastName: v})), null, () => document.getElementById('email-input').click(), e.currentTarget)} 
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              id="email-input"
              type="email" 
              value={formData.email} 
              readOnly 
              placeholder="Required" 
              onClick={(e) => onFocusInput('default', formData.email, (v) => setFormData(prev => ({...prev, email: v})), null, () => document.getElementById('phone-input').click(), e.currentTarget)} 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input 
              id="phone-input"
              type="tel" 
              value={formData.phone} 
              readOnly 
              placeholder="Required" 
              onClick={(e) => onFocusInput('numeric', formData.phone, (v) => setFormData(prev => ({...prev, phone: v})), 10, () => document.getElementById('ticket-0').click(), e.currentTarget)} 
            />
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
            <label className="input-label" style={{ color: 'var(--neon-lime)' }}>Physical Ticket Numbers (6 Digits)</label>
            {ticketNumbers.map((num, i) => (
              <div key={i} className="input-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  id={`ticket-${i}`}
                  type="text" 
                  value={num} 
                  readOnly 
                  placeholder={`Ticket #${i+1}`} 
                  style={{ letterSpacing: '3px', fontWeight: 'bold' }}
                  onClick={(e) => onFocusInput('numeric', num, (v) => updateTicket(i, v), 6, null, e.currentTarget)} 
                />
                {ticketNumbers.length > 1 && (
                  <button type="button" className="btn" style={{ minWidth: '50px', padding: '10px', margin: 0, background: 'rgba(255,0,0,0.2)', border: '1px solid red' }} onClick={() => setTicketNumbers(ticketNumbers.filter((_, idx) => idx !== i))}>✕</button>
                )}
              </div>
            ))}
            {ticketNumbers.length < 10 && (
              <button type="button" className="btn" style={{ width: '100%', margin: '10px 0', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--neon-lime)', fontSize: '0.9rem' }} onClick={handleAddTicket}>+ Add Another Ticket</button>
            )}
          </div>

          <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '20px', textAlign: 'center' }}>Provide Email or Phone to check existing accounts.</p>
          <div style={{ marginTop: '30px', textAlign: 'center' }}><button type="submit" className="btn btn-lime" onClick={() => playSound('click')}>Proceed</button></div>
        </form>

        <MobileSignupPanel
          staffName="Kiosk"
          largeQr
          showPending={false}
          showStaffTools={false}
          onApproved={(signup) => onSuccess(signup.contact_id, signup.is_new, signup.name)}
          onError={(msg) => setError(msg)}
        />
      </div>
    </div>
  );
};

const ThankYou = ({ name, isNew, onContinue }) => {
  useEffect(() => {
    const timer = setTimeout(onContinue, 5000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <div className="view-container" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h1 className="neon-text-lime" style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>SUCCESS!</h1>
      <h2 className="neon-text-violet" style={{ fontSize: '2rem', marginBottom: '2rem' }}>Welcome {isNew ? '' : 'Back'}, {name}!</h2>
      
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', border: '2px solid var(--neon-lime)' }}>
        <h3 className="neon-text-pink" style={{ marginBottom: '15px' }}>LIMITED TIME OFFER</h3>
        <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '25px' }}>
          Grab our **VIP Popcorn Flight** now for just **$10**! Includes 4 signature seasonings and a raffle entry.
        </p>
        <button className="btn btn-lime" style={{ width: '100%', margin: '0' }} onClick={onContinue}>See Menu</button>
      </div>
      
      <p style={{ marginTop: '30px', opacity: 0.5 }}>Redirecting in a few seconds...</p>
    </div>
  );
};

const Profile = ({ contactId, onNavigate }) => {
  const [contact, setContact] = useState(null);
  const [entries, setEntries] = useState(0);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Effect to navigate away if contactId becomes null
  useEffect(() => {
    if (!contactId) {
      onNavigate('home');
    }
  }, [contactId, onNavigate]);

  const load = async () => {
    const c = await api.ensureContactReference(contactId) || await api.getContactById(contactId);
    setContact(c);
    setEntries(await api.getEntryCount(contactId));
    setActions(await api.getCompletedActions(contactId));
  };

  useEffect(() => {
    if (contactId) load();
  }, [contactId]);

  const handleQuickAction = async (actionName) => {
    setLoading(true);
    try {
      await api.verifyAndAwardAction(contactId, actionName, 'System');
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!contact) return <div className="view-container">Loading...</div>;
  
  const hasRetreat = api.isColombiaRetreatInterested(contact) || actions.includes('Retreat Interest');

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 className="neon-text-lime" style={{ fontSize: '2.5rem' }}>{contact.name}</h2>
            <p style={{ opacity: 0.7 }}>
              Reference: <GuestReferenceDisplay contact={contact} monospace />
            </p>
            {api.isPrehistoricGuestReference(contact) && api.legacyGuestReference(contact) ? (
              <p style={{ opacity: 0.5, fontSize: '0.8rem', marginTop: '-8px' }}>
                Prehistoric ID preserved: {api.legacyGuestReference(contact)}
              </p>
            ) : null}
          
          <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
              <div className="card" style={{ flex: 1, background: 'rgba(139, 0, 255, 0.05)', border: '1px solid var(--electric-violet)' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Total Points</div>
                <div className="neon-text-violet" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{contact.total_points}</div>
              </div>
              <div className="card" style={{ flex: 1, background: 'rgba(204, 255, 0, 0.05)', border: '1px solid var(--neon-lime)' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Raffle Entries</div>
                <div className="neon-text-lime" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{entries}</div>
              </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          {/* Quick Actions Card */}
          <div className="card" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="neon-text-pink" style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Quick Sign-Ups</h3>
            
            {!hasRetreat ? (
              <button 
                className="btn btn-lime" 
                style={{ width: '100%', margin: '0 0 10px 0', height: '70px', fontSize: '1rem' }} 
                onClick={async () => {
                  setLoading(true);
                  try {
                    await api.markColombiaRetreatInterest(contactId, 'profile_waitlist', 'System');
                    await load();
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Processing...' : '🇨🇴 Join Retreat Waitlist'}
              </button>
            ) : (
              <div style={{ padding: '15px', background: 'rgba(204, 255, 0, 0.1)', borderRadius: '10px', color: 'var(--neon-lime)', textAlign: 'center', marginBottom: '10px', border: '1px solid var(--neon-lime)' }}>
                ✅ Colombia Retreat Interest Logged
              </div>
            )}
            
            <p style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>
              One-tap signup for exclusive event opportunities.
            </p>
          </div>

          {/* Activities Completed */}
          <div className="card" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: 'var(--neon-lime)', marginBottom: '15px', fontSize: '1.2rem' }}>History</h3>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {actions.map((a, i) => (
                    <li key={i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a}</span>
                      <span style={{ color: 'var(--neon-lime)' }}>✅</span>
                    </li>
                  ))}
                </ul>
              </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn btn-violet" style={{ flex: 1 }} onClick={() => { playSound('click'); onNavigate('giveaway'); }}>Earn More Entries</button>
          <button className="btn" style={{ flex: 1, background: 'transparent' }} onClick={() => { playSound('click'); onNavigate('home'); }}>Back to Home</button>
        </div>
      </div>
    </div>
  );
};

const GiveawayPackage = () => (
  <div className="card" style={{ 
    marginBottom: '40px', 
    padding: '40px',
    textAlign: 'center', 
    border: '2px solid var(--electric-violet)', 
    background: 'linear-gradient(180deg, rgba(139, 0, 255, 0.1) 0%, rgba(0, 0, 0, 0.6) 100%)',
    boxShadow: '0 0 40px rgba(139, 0, 255, 0.2)'
  }}>
    <div style={{ marginBottom: '30px' }}>
      <span className="badge badge-scarcity" style={{ fontSize: '1rem', padding: '5px 20px', borderRadius: '50px', marginBottom: '15px', display: 'inline-block' }}>
        GRAND PRIZE PACKAGE
      </span>
      <h2 className="neon-text-lime" style={{ fontSize: '2.5rem', margin: '10px 0' }}>The Wellness Stoner Bundle</h2>
      <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Valued at over $500+ in premium gear and experiences</p>
    </div>

    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '15px',
      textAlign: 'left'
    }}>
      {GIVEAWAY_PACKAGE.map((item, i) => (
        <div key={i} style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          padding: '15px 20px', 
          borderRadius: '12px', 
          border: '1px solid rgba(139, 0, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{ color: 'var(--neon-lime)', fontSize: '1.2rem' }}>★</div>
          <div style={{ fontSize: '1rem', fontWeight: '500', color: 'white' }}>{item}</div>
        </div>
      ))}
    </div>
    
    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="neon-text-pink" style={{ fontWeight: 'bold', letterSpacing: '2px', margin: 0 }}>GRAND PRIZE RAFFLE — ENTRIES FROM TASKS ABOVE</p>
    </div>
  </div>
);

const GuestAccountGateModal = ({
  isOpen,
  actionName,
  search,
  searchResults,
  onSearch,
  onSelectContact,
  onRegister,
  onFocusInput,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 11000 }}>
      <div className="card" style={{ width: '480px', maxWidth: '92vw', textAlign: 'left' }}>
        <h3 className="neon-text-lime" style={{ margin: '0 0 8px' }}>Link guest for points</h3>
        <p style={{ margin: '0 0 6px', opacity: 0.85 }}>
          Staff verification for: <strong>{actionName}</strong>
        </p>
        <p style={{ margin: '0 0 20px', opacity: 0.65, fontSize: '0.9rem', lineHeight: 1.5 }}>
          Search an existing guest or register a new one — then staff approves the task.
        </p>
        <div className="input-group">
          <input
            type="text"
            placeholder="Name, email, phone, or guest ID…"
            value={search}
            readOnly
            onClick={(e) => onFocusInput('default', search, onSearch, null, null, e.currentTarget)}
          />
        </div>
        {searchResults.length > 0 && (
          <ContactSearchResults
            results={searchResults}
            onSelect={(c) => onSelectContact(c.contact_id)}
            hint="Tap a guest from attendee records"
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button type="button" className="btn btn-violet" onClick={onRegister} style={{ width: '100%', margin: 0 }}>
            New guest? Register & continue
          </button>
          <button type="button" className="btn" onClick={onClose} style={{ width: '100%', margin: 0, background: 'transparent' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const VipExperienceSection = ({ perks = VIP_EXPERIENCE_PERKS, accent = 'var(--neon-lime)' }) => (
  <div
    className="card"
    style={{
      marginBottom: '28px',
      padding: '28px 24px',
      border: '1px solid rgba(255, 165, 0, 0.4)',
      background: 'linear-gradient(160deg, rgba(255,165,0,0.07) 0%, rgba(0,0,0,0.45) 100%)',
      textAlign: 'center',
    }}
  >
    <div style={{ marginBottom: '20px' }}>
      <span
        style={{
          display: 'inline-block',
          padding: '4px 18px',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: '800',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: 'rgba(255,165,0,0.15)',
          border: '1px solid rgba(255,165,0,0.45)',
          color: 'rgba(255,165,0,0.95)',
          marginBottom: '12px',
        }}
      >
        👑 VIP Experience
      </span>
      <h2
        style={{
          margin: 0,
          fontSize: '1.6rem',
          fontWeight: '900',
          color: accent,
          letterSpacing: '0.03em',
        }}
      >
        Your VIP Perks&nbsp;
        <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.7 }}>$20 or {VIP_POINTS_THRESHOLD} pts</span>
      </h2>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        textAlign: 'left',
      }}
    >
      {perks.map((perk) => (
        <div
          key={perk.label}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '0.88rem',
            lineHeight: 1.4,
          }}
        >
          {perk.badge && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                fontSize: '0.6rem',
                fontWeight: '800',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: '999px',
                background: 'rgba(255,165,0,0.2)',
                border: '1px solid rgba(255,165,0,0.5)',
                color: 'rgba(255,165,0,0.95)',
              }}
            >
              {perk.badge}
            </span>
          )}
          <span style={{ fontSize: '1.1rem', flexShrink: 0, opacity: 0.85 }}>★</span>
          <span style={{ textAlign: perk.center ? 'center' : 'left' }}>{perk.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const VipPerksCard = () => (
  <div className="vip-perks-strip">
    <div className="vip-perks-strip__header">
      <span className="vip-perks-strip__badge">👑 VIP · {VIP_POINTS_THRESHOLD} pts</span>
      <span className="vip-perks-strip__note">Unlock rewards below</span>
    </div>
    <div className="vip-perks-strip__grid">
      {VIP_EXPERIENCE_PERKS.map((perk) => (
        <span key={perk.label} className="vip-perks-strip__perk">{perk.label}</span>
      ))}
    </div>
  </div>
);

/** Staff Portal — mirrors Giveaway Hub rewards for on-floor reference */
const StaffGiveawayHubReference = () => (
  <div
    className="card"
    style={{
      marginTop: '24px',
      padding: '22px 24px',
      border: '1px solid rgba(139, 0, 255, 0.35)',
      background: 'linear-gradient(180deg, rgba(139, 0, 255, 0.08) 0%, rgba(0, 0, 0, 0.35) 100%)',
    }}
  >
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
      <h3 className="neon-text-violet" style={{ margin: 0, fontSize: '1.15rem' }}>Giveaway Hub — Staff Reference</h3>
      <span style={{ fontSize: '0.72rem', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Guest-facing · do not edit on show PC</span>
    </div>
    <p style={{ margin: '0 0 18px', fontSize: '0.88rem', opacity: 0.72, lineHeight: 1.55 }}>
      Same rewards and point values guests see on <strong>Giveaway Hub</strong>. Verify earn-point tasks only after the guest completes the action and their account is linked (email, phone, or guest ID).
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
      <div>
        <h4 className="neon-text-pink" style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>👑 VIP perks ({VIP_POINTS_THRESHOLD} pts or $20 upgrade)</h4>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', lineHeight: 1.55, opacity: 0.9 }}>
          {VIP_EXPERIENCE_PERKS.map((perk) => (
            <li key={perk.label} style={{ marginBottom: '6px' }}>{perk.label}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="neon-text-lime" style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Earn points → VIP (Giveaway Hub tasks)</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.6, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
              <th style={{ padding: '6px 8px 6px 0' }}>Task</th>
              <th style={{ padding: '6px 8px' }}>Pts</th>
              <th style={{ padding: '6px 0 6px 8px' }}>Entry</th>
            </tr>
          </thead>
          <tbody>
            {EARN_POINTS_TASKS.map((task) => (
              <tr key={task.actionName} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '8px 8px 8px 0' }}>{task.title}</td>
                <td style={{ padding: '8px', color: 'var(--electric-violet)', fontWeight: 'bold' }}>+{task.points}</td>
                <td style={{ padding: '8px 0 8px 8px', opacity: 0.85 }}>{task.raffleEntry ? '+1' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', opacity: 0.55 }}>
          Staff-verify: Google, YouTube, IG Story · Self-serve: Flavor Vote · Auto: Booth check-in
        </p>
      </div>

      <div>
        <h4 className="neon-text-lime" style={{ margin: '0 0 10px', fontSize: '0.95rem' }}>Grand prize raffle bundle</h4>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', lineHeight: 1.55, opacity: 0.9 }}>
          {GIVEAWAY_PACKAGE.map((item) => (
            <li key={item} style={{ marginBottom: '6px' }}>{item}</li>
          ))}
        </ul>
      </div>
    </div>

    <div
      style={{
        marginTop: '18px',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(204, 255, 0, 0.25)',
        background: 'rgba(204, 255, 0, 0.05)',
        fontSize: '0.82rem',
        lineHeight: 1.55,
      }}
    >
      <strong style={{ color: 'var(--neon-lime)', display: 'block', marginBottom: '6px' }}>Staff rules</strong>
      <ul style={{ margin: 0, paddingLeft: '18px', opacity: 0.88 }}>
        <li><strong>VIP Lounge → Register VIP:</strong> auto VIP + booth visit (+10 pts) + 2 raffle entries.</li>
        <li><strong>Attendee Management → 👑+:</strong> manual VIP grant (+2 entries) or remove VIP.</li>
        <li><strong>500 pts:</strong> guest redeems VIP Upgrade via 🎁 Redeem (deducts 500 pts).</li>
        <li><strong>Popcorn refill:</strong> VIP only — 10 min cooldown between refills.</li>
        <li><strong>1g flower:</strong> VIP claim once per guest — staff PIN on VIP Lounge.</li>
      </ul>
    </div>
  </div>
);

const AccountLookupCard = ({
  search,
  searchResults,
  onSearch,
  onSelectContact,
  onRegister,
  onFocusInput,
  onNavigateHome,
  title = 'Find Your Account',
  description = 'Enter email, phone, guest ID (e.g. CND-00007), or name to link this activity to your account.',
  registerLabel = 'New Registration',
  showBackHome = true,
}) => (
  <div className="card" style={{ marginBottom: '32px', border: '1px solid var(--neon-lime)', background: 'rgba(204, 255, 0, 0.04)' }}>
    <h3 className="neon-text-lime" style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>{title}</h3>
    <p style={{ margin: '0 0 20px', opacity: 0.75, fontSize: '0.9rem', lineHeight: 1.5 }}>
      {description}
    </p>
    <div className="input-group">
      <input
        type="text"
        placeholder="Email, phone, or guest ID…"
        value={search}
        readOnly
        onClick={(e) => onFocusInput('default', search, onSearch, null, null, e.currentTarget)}
      />
    </div>
    {searchResults.length > 0 && (
      <ContactSearchResults
        results={searchResults}
        onSelect={(c) => onSelectContact(c.contact_id)}
      />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <button type="button" className="btn btn-violet" onClick={onRegister} style={{ width: '100%', margin: 0 }}>{registerLabel}</button>
      {showBackHome ? (
        <button type="button" className="btn" onClick={onNavigateHome} style={{ width: '100%', margin: 0, background: 'transparent' }}>Back to Home</button>
      ) : null}
    </div>
  </div>
);

const PointsProgressBar = ({ points }) => {
  const pct = Math.min(100, Math.round((points / VIP_POINTS_THRESHOLD) * 100));
  const vipReady = points >= VIP_POINTS_THRESHOLD;
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px', opacity: 0.85 }}>
        <span>{points} pts</span>
        <span style={{ color: vipReady ? 'var(--neon-lime)' : 'inherit' }}>
          {vipReady ? '👑 VIP unlock ready — see staff' : `${VIP_POINTS_THRESHOLD - points} pts to VIP`}
        </span>
      </div>
      <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: vipReady ? 'var(--neon-lime)' : 'var(--electric-violet)', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

const EarnPointsTaskCard = ({ task, isDone, onVerify, onNavigateTask, activeContact }) => {
  const handleAction = () => {
    playSound('click');
    if (task.verifyType === 'staff') onVerify(task.actionName);
    else if (task.verifyType === 'navigate') onNavigateTask(task.navigateTo);
  };

  const isBoothTask = task.actionName === 'Booth Visit';
  const needsAccount = isBoothTask && !activeContact;

  return (
    <div
      className="card"
      style={{
        border: isDone ? '2px solid var(--neon-lime)' : '1px solid var(--glass-border)',
        opacity: isDone ? 0.72 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '20px',
        background: isDone ? 'rgba(204,255,0,0.04)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.3 }}>{task.title}</h3>
        {isDone && <span style={{ color: 'var(--neon-lime)', fontWeight: 'bold', fontSize: '0.85rem' }}>✓ Done</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '999px', background: 'rgba(139,0,255,0.2)', color: 'var(--electric-violet)', fontWeight: 'bold' }}>
          +{task.points} pts
        </span>
        {task.raffleEntry && (
          <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '999px', background: 'rgba(204,255,0,0.12)', color: 'var(--neon-lime)', fontWeight: 'bold' }}>
            +1 raffle entry
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, lineHeight: 1.45 }}>
        {task.verifyType === 'staff' && 'Complete the task on your phone → search or register guest → staff verifies'}
        {task.verifyType === 'navigate' && 'Self-serve on this kiosk'}
        {task.verifyType === 'auto' && 'Awarded when you check in / register'}
      </p>
      {task.qrUrl && !isDone && (
        <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'center' }}>
          <QRCodeCanvas value={task.qrUrl} size={96} />
          <p style={{ color: '#111', fontSize: '0.65rem', fontWeight: 'bold', margin: '8px 0 0', textTransform: 'uppercase' }}>{task.qrCaption}</p>
        </div>
      )}
      {isDone ? (
        <p className="neon-text-lime" style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'center' }}>Points tracked</p>
      ) : needsAccount ? (
        <button
          type="button"
          className="btn btn-violet"
          style={{ width: '100%', margin: 0 }}
          onClick={() => { playSound('click'); onNavigateTask('register'); }}
        >
          Sign Up
        </button>
      ) : task.verifyType === 'auto' ? (
        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.55, textAlign: 'center' }}>{task.verifyLabel}</p>
      ) : (
        <button type="button" className="btn btn-lime" style={{ width: '100%', margin: 0 }} onClick={handleAction}>
          {task.verifyLabel}
        </button>
      )}
    </div>
  );
};

const EarnPointsSection = ({ completedActions, onVerify, onNavigate, activeContact }) => (
  <div style={{ marginBottom: '40px' }}>
    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
      <span className="badge badge-scarcity" style={{ fontSize: '0.85rem', padding: '4px 16px', borderRadius: '50px', marginBottom: '10px', display: 'inline-block' }}>
        EARN POINTS → VIP
      </span>
      <h2 className="neon-text-lime" style={{ fontSize: '1.75rem', margin: '8px 0 6px' }}>Complete Tasks</h2>
      <p style={{ opacity: 0.65, fontSize: '0.95rem', margin: 0 }}>
        Each verified task adds points · {VIP_POINTS_THRESHOLD} pts unlocks VIP
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
      {EARN_POINTS_TASKS.map((task) => (
        <EarnPointsTaskCard
          key={task.actionName}
          task={task}
          isDone={completedActions.includes(task.actionName)}
          onVerify={onVerify}
          onNavigateTask={onNavigate}
          activeContact={activeContact}
        />
      ))}
    </div>
  </div>
);

const GiveawayEntry = ({ contactId, onNavigate, onSuccess, setNotify, onFocusInput, staffNames }) => {
  const { search, searchResults, handleSearch, clearSearch } = useContactSearch();
  const [activeContact, setActiveContact] = useState(null);
  const [entries, setEntries] = useState(0);
  const [completedActions, setCompletedActions] = useState([]);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [accountGateOpen, setAccountGateOpen] = useState(false);
  const [pendingVerifyAction, setPendingVerifyAction] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadStatus = async (id) => {
    const c = await api.getContactById(id);
    if (!c) return;
    setActiveContact(c);
    setEntries(await api.getEntryCount(id));
    setCompletedActions(await api.getCompletedActions(id));
    onSuccess(id);
    playSound('confirm');
  };

  useEffect(() => { if (contactId) loadStatus(contactId); }, [contactId]);

  const handleApproveAction = async (staffName) => {
    try {
      await api.verifyAndAwardAction(activeContact.contact_id, approvalTarget, staffName);
      playSound('points');
      setNotify({ message: `${approvalTarget} Verified!`, type: 'success' });
      loadStatus(activeContact.contact_id);
      setApprovalTarget(null);
    } catch (err) { setNotify({ message: err.message, type: 'error' }); }
  };

  const openStaffApprovalAfterLink = (actionName) => {
    setApprovalTarget(actionName);
    setPendingVerifyAction(null);
    setAccountGateOpen(false);
    clearSearch();
  };

  const handleGateSelectContact = async (id) => {
    playSound('click');
    await loadStatus(id);
    if (pendingVerifyAction) openStaffApprovalAfterLink(pendingVerifyAction);
  };

  const handleVerifyTask = (actionName) => {
    if (activeContact) {
      setApprovalTarget(actionName);
    } else {
      setPendingVerifyAction(actionName);
      setAccountGateOpen(true);
    }
  };

  const handleNavigateTask = (view) => {
    onNavigate(view);
  };

  const handleCloseAccountGate = () => {
    playSound('click');
    setAccountGateOpen(false);
    setPendingVerifyAction(null);
    clearSearch();
  };

  const handleRegisterFromGate = () => {
    playSound('click');
    setAccountGateOpen(false);
    setIsRegistering(true);
  };

  const handleRegisterSuccess = async (id) => {
    setIsRegistering(false);
    await loadStatus(id);
    if (pendingVerifyAction) openStaffApprovalAfterLink(pendingVerifyAction);
  };

  if (isRegistering) {
    return (
      <CheckIn
        onBack={() => { setIsRegistering(false); if (pendingVerifyAction) setAccountGateOpen(true); }}
        onSuccess={handleRegisterSuccess}
        onFocusInput={onFocusInput}
      />
    );
  }

  const completedActionsSafe = activeContact ? completedActions : [];

  return (
    <div className="view-container" style={{ padding: '40px 24px', overflowY: 'auto' }}>
      <StaffApprovalModal
        isOpen={!!approvalTarget}
        actionName={approvalTarget}
        onClose={() => setApprovalTarget(null)}
        onApprove={handleApproveAction}
        onFocusInput={onFocusInput}
        setNotify={setNotify}
        staffNames={staffNames}
      />
      <GuestAccountGateModal
        isOpen={accountGateOpen}
        actionName={pendingVerifyAction}
        search={search}
        searchResults={searchResults}
        onSearch={handleSearch}
        onSelectContact={handleGateSelectContact}
        onRegister={handleRegisterFromGate}
        onFocusInput={onFocusInput}
        onClose={handleCloseAccountGate}
      />

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 className="neon-text-violet" style={{ textAlign: 'center', marginBottom: '8px', fontSize: '2rem' }}>Raffle Hub</h2>
        <p style={{ textAlign: 'center', opacity: 0.65, marginBottom: '28px' }}>
          Earn points, stack raffle entries, unlock VIP at {VIP_POINTS_THRESHOLD} pts
        </p>

        {activeContact && (
          <div className="card" style={{ marginBottom: '28px', padding: '20px 24px', border: '1px solid var(--electric-violet)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.55, textTransform: 'uppercase' }}>Tracking account</p>
                <h2 className="neon-text-lime" style={{ margin: '4px 0 0', fontSize: '1.5rem' }}>{activeContact.name}</h2>
                {api.contactReference(activeContact) && (
                  <p style={{ margin: '4px 0 0', opacity: 0.6, fontSize: '0.85rem' }}>ID: {api.contactReference(activeContact)}</p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="neon-text-violet" style={{ fontSize: '1.75rem', fontWeight: 'bold', lineHeight: 1 }}>{entries}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>raffle entries</div>
              </div>
            </div>
            <PointsProgressBar points={activeContact.total_points || 0} />
            {!contactId && (
              <button
                type="button"
                className="btn"
                onClick={() => { playSound('click'); setActiveContact(null); setCompletedActions([]); }}
                style={{ minWidth: 'auto', marginTop: '4px' }}
              >
                Switch account
              </button>
            )}
          </div>
        )}

        <VipExperienceSection />

        <EarnPointsSection
          completedActions={completedActionsSafe}
          onVerify={handleVerifyTask}
          onNavigate={handleNavigateTask}
          activeContact={activeContact}
        />

        <GiveawayPackage />

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button type="button" className="btn btn-lime" onClick={() => { playSound('click'); onNavigate('home'); }}>Done</button>
        </div>
      </div>
    </div>
  );
};

const VipLounge = ({ onNavigate, onSuccess, setNotify, onFocusInput, staffNames }) => {
  const { search, searchResults, handleSearch, clearSearch } = useContactSearch();
  const [status, setStatus] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const loadStatus = async (id) => {
    const contact = await api.getContactById(id);
    if (!contact) return;
    setStatus({
      contactId: contact.contact_id,
      name: contact.name,
      isVip: !!contact.is_vip,
      points: contact.total_points || 0,
      lastRedeemed: contact.vip_popcorn_last_redeemed_at,
      flowerClaimed: !!contact.flower_claimed,
    });
    onSuccess(id);
    playSound('confirm');
  };

  const handleRedeemPopcorn = async () => {
    try { await api.redeemPopcorn(status.contactId); playSound('vip'); setNotify({ message: 'Approved!', type: 'success' }); loadStatus(status.contactId); } 
    catch (err) { setNotify({ message: err.message, type: 'error' }); }
  };

  const handleClaimFlower = async (staffName) => {
    try { await api.claimFlower(status.contactId, staffName); playSound('confirm'); setNotify({ message: 'Claimed!', type: 'success' }); loadStatus(status.contactId); setApprovalTarget(null); } 
    catch (err) { setNotify({ message: err.message, type: 'error' }); }
  }

  const handleVipUpgrade = async (staffName) => {
    try { await api.grantVipStatus(status.contactId, staffName); playSound('confirm'); setNotify({ message: 'VIP Status Granted!', type: 'success' }); loadStatus(status.contactId); setApprovalTarget(null); } 
    catch (err) { setNotify({ message: err.message, type: 'error' }); }
  }

  if (isRegistering) {
    return (
      <CheckIn
        vipRegistration
        onBack={() => setIsRegistering(false)}
        onSuccess={(id, _isNew, _name, result) => {
          setIsRegistering(false);
          loadStatus(id);
          setNotify({
            message: result?.vipGranted
              ? 'VIP registered — status active, booth points applied, +2 raffle entries'
              : 'Welcome back — VIP status confirmed',
            type: 'success',
          });
        }}
        onFocusInput={onFocusInput}
      />
    );
  }

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <StaffApprovalModal isOpen={!!approvalTarget} actionName={approvalTarget} onClose={() => setApprovalTarget(null)} onApprove={approvalTarget === 'VIP UPGRADE' ? handleVipUpgrade : handleClaimFlower} onFocusInput={onFocusInput} setNotify={setNotify} staffNames={staffNames} />
      <h2 className="neon-text-pink" style={{ textAlign: 'center', marginBottom: '40px' }}>VIP Lounge</h2>
      {!status ? (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card">
                <p style={{ marginBottom: '25px', opacity: 0.8 }}>Search account to access VIP perks.</p>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={search} 
                    readOnly
                    onClick={(e) => onFocusInput('default', search, handleSearch, null, null, e.currentTarget)}
                  />
                </div>
                <ContactSearchResults
                  results={searchResults}
                  onSelect={(c) => { loadStatus(c.contact_id); clearSearch(); }}
                />
                <button className="btn btn-violet" onClick={() => { playSound('click'); setIsRegistering(true); }} style={{ width: '100%', marginTop: '20px' }}>Register VIP</button>
            </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="neon-text-lime">Member: {status.name}</h2>
          <p style={{ opacity: 0.65, fontSize: '0.9rem', margin: '8px 0 0' }}>{status.points} pts · 👑 VIP</p>
          {status.isVip ? (
            <div style={{ marginTop: '30px' }}>
                <p className="neon-text-pink" style={{ fontWeight: 'bold' }}>VIP ACTIVE</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                    <div className="card"><h4>Popcorn</h4><button className="btn btn-lime" style={{ width: '100%' }} onClick={() => { playSound('click'); handleRedeemPopcorn(); }}>Refill</button><RefillCountdown lastRedeemed={status.lastRedeemed} /></div>
                    <div className="card"><h4>Flower</h4>{status.flowerClaimed ? <p>Claimed</p> : <button className="btn btn-violet" style={{ width: '100%' }} onClick={() => { playSound('click'); setApprovalTarget('Claim Flower'); }}>Claim 1g</button>}</div>
                </div>
            </div>
          ) : (
            <div style={{ marginTop: '30px' }}>
              <div className="card" style={{ background: 'rgba(255, 0, 127, 0.1)', border: '1px solid var(--cyber-pink)', marginBottom: '20px', padding: '20px' }}>
                <h3 className="neon-text-pink" style={{ fontSize: '1.8rem', margin: '0 0 10px 0' }}>UPGRADE TO VIP: $20</h3>
                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>VIP Experience includes:</p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '1rem', lineHeight: '1.6', textAlign: 'left' }}>
                  {VIP_EXPERIENCE_PERKS.map((perk) => (
                    <li key={perk} style={{ marginBottom: '6px' }}>★ {perk}</li>
                  ))}
                </ul>
              </div>
              <button className="btn btn-lime" onClick={() => { playSound('click'); setApprovalTarget('VIP UPGRADE'); }}>Grant VIP Status</button>
            </div>
          )}
          <button className="btn" onClick={() => { playSound('click'); setStatus(null); clearSearch(); }} style={{ background: 'transparent', marginTop: '30px' }}>Exit</button>
        </div>
      )}
    </div>
  );
};

const StaffLogin = ({ onBack, onLoginSuccess, onFocusInput, setNotify, staffNames }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [pin, setPin] = useState('');
  const handleLogin = async (e) => {
    e.preventDefault();
    const ok = await window.electronAPI.validateStaffPin(selectedStaff, pin);
    if (ok) { playSound('confirm'); onLoginSuccess(selectedStaff); }
    else { playSound('error'); setNotify({ message: 'Invalid PIN', type: 'error' }); }
  };
  return (
    <div className="view-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="card" style={{ width: '400px' }}>
        <h3 className="neon-text-pink">Staff Portal</h3>
        <form onSubmit={handleLogin}>
          <CustomDropdown 
            options={staffNames} 
            value={selectedStaff} 
            onChange={setSelectedStaff} 
            placeholder="Choose Name..." 
          />
          <div className="input-group">            <input 
              type="password" 
              placeholder="PIN" 
              value={pin} 
              readOnly
              onClick={(e) => onFocusInput('numeric', pin, setPin, 4, null, e.currentTarget)}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px' }} 
            />
          </div>
          <button type="submit" className="btn btn-violet" style={{ width: '100%' }} onClick={() => playSound('click')}>Login</button>
          <button type="button" className="btn" onClick={() => { playSound('click'); onBack(); }} style={{ width: '100%', background: 'transparent' }}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

const StaffQrApprovals = ({ onBack, staffName, setNotify }) => (
  <div className="view-container" style={{ padding: '40px 30px', overflowY: 'auto' }}>
    <button className="btn" onClick={() => { playSound('click'); onBack(); }} style={{ background: 'transparent' }}>← Back to Dashboard</button>
    <h2 className="neon-text-lime" style={{ textAlign: 'center', margin: '20px 0 24px' }}>QR Signup Approvals</h2>
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <MobileSignupPanel
        staffName={staffName}
        showQr={false}
        title="Pending Phone Signups"
        onApproved={() => setNotify({ message: 'Approved. Guest saved to kiosk database.', type: 'success' })}
        onDeclined={() => setNotify({ message: 'Signup marked as declined. Still visible in Attendee Management.', type: 'success' })}
        onError={(msg) => setNotify({ message: msg, type: 'error' })}
      />
    </div>
  </div>
);

const StaffVipManager = ({ onBack, setNotify, onFocusInput, staffName }) => {
  const { search, searchResults, handleSearch, clearSearch } = useContactSearch();
  const [selectedContact, setSelectedContact] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dose, setDose] = useState('low');
  const [loading, setLoading] = useState(false);
  const { ready: popcornReady, timeLeft: popcornTimeLeft } = usePopcornCooldown(
    selectedContact?.vip_popcorn_last_redeemed_at
  );

  const reloadContact = async () => {
    if (!selectedContact) return;
    const updated = await api.getContactById(selectedContact.contact_id);
    if (updated) setSelectedContact(updated);
    setRefreshKey((k) => k + 1);
  };

  const handleDistributePopcorn = async () => {
    if (!popcornReady || loading) return;
    setLoading(true);
    try {
      await api.redeemPopcorn(selectedContact.contact_id, staffName, dose);
      playSound('vip');
      setNotify({ message: `Popcorn (${dose} dose) distributed to ${selectedContact.name}`, type: 'success' });
      await reloadContact();
    } catch (err) {
      playSound('error');
      setNotify({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-container" style={{ padding: '40px 24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <button className="btn" onClick={onBack} style={{ background: 'transparent', marginBottom: '24px' }}>← Back</button>
        <h2 className="neon-text-pink" style={{ textAlign: 'center', marginBottom: '28px' }}>👑 VIP Manager</h2>

        {!selectedContact ? (
          <div className="card">
            <p style={{ marginBottom: '20px', opacity: 0.75, textAlign: 'center' }}>
              Search a VIP to manage popcorn refills
            </p>
            <div className="input-group">
              <input
                type="text"
                placeholder="Name, email, phone, or guest ID…"
                value={search}
                readOnly
                onClick={(e) => onFocusInput('default', search, handleSearch, null, null, e.currentTarget)}
              />
            </div>
            <ContactSearchResults
              results={searchResults}
              onSelect={(c) => { setSelectedContact(c); clearSearch(); }}
              hint="Tap a guest to manage"
            />
          </div>
        ) : (
          <div key={refreshKey} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '4px' }}>VIP Member</p>
            <h3 className="neon-text-lime" style={{ margin: '0 0 4px', fontSize: '1.5rem' }}>{selectedContact.name}</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '20px' }}>
              ID: {api.contactReference(selectedContact) || selectedContact.contact_id}
            </p>

            {selectedContact.is_vip ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="card" style={{ padding: '18px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>🍿 Popcorn Refill</h4>
                    {popcornReady ? (
                      <p className="neon-text-lime" style={{ fontWeight: 'bold', margin: '0 0 10px' }}>READY</p>
                    ) : (
                      <p className="neon-text-pink" style={{ fontWeight: 'bold', margin: '0 0 10px' }}>Next in {popcornTimeLeft}</p>
                    )}
                    <select
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                      style={{
                        width: '100%', marginBottom: '10px', padding: '8px',
                        borderRadius: '8px', border: '1px solid rgba(204,255,0,0.35)',
                        background: 'rgba(204,255,0,0.06)', color: '#fff', fontSize: '0.85rem',
                      }}
                    >
                      <option value="low">Low dose</option>
                      <option value="high">High dose</option>
                    </select>
                    <button
                      className="btn btn-lime"
                      style={{ width: '100%' }}
                      disabled={!popcornReady || loading}
                      onClick={handleDistributePopcorn}
                    >
                      {loading ? 'Distributing…' : popcornReady ? 'Distribute' : `Wait ${popcornTimeLeft}`}
                    </button>
                  </div>
                  <div className="card" style={{ padding: '18px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>🌸 Flower Claim</h4>
                    {selectedContact.flower_claimed ? (
                      <p style={{ opacity: 0.55, margin: 0 }}>Claimed</p>
                    ) : (
                      <button
                        className="btn btn-violet"
                        style={{ width: '100%' }}
                        onClick={async () => {
                          try {
                            await api.claimFlower(selectedContact.contact_id, staffName);
                            playSound('confirm');
                            setNotify({ message: 'Flower claim approved', type: 'success' });
                            await reloadContact();
                          } catch (err) {
                            setNotify({ message: err.message, type: 'error' });
                          }
                        }}
                      >
                        Approve 1g
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', fontSize: '0.8rem', opacity: 0.6 }}>
                  VIP since {selectedContact.vip_granted_at ? new Date(selectedContact.vip_granted_at).toLocaleDateString() : 'Unknown'} · {selectedContact.total_points || 0} pts
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', background: 'rgba(255,80,80,0.08)', borderRadius: '10px', border: '1px solid rgba(255,80,80,0.3)' }}>
                <p style={{ opacity: 0.7, margin: 0 }}>Not a VIP member</p>
              </div>
            )}

            <button
              className="btn"
              onClick={() => { playSound('click'); setSelectedContact(null); clearSearch(); }}
              style={{ width: '100%', marginTop: '20px', background: 'transparent' }}
            >
              Search another guest
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StaffDashboard = ({ onLogout, staffName, setNotify, onFocusInput, onNavigate, staffNames = [] }) => {
  const [contacts, setContacts] = useState([]);
  const [raffleModal, setRaffleModal] = useState(null);
  const [showWipe, setShowWipe] = useState(false);
  const [wipeStep, setWipeStep] = useState('confirm');
  const [wipePin, setWipePin] = useState('');
  const [isDevMode, setIsDevMode] = useState(false);
  
  // New States
  const [stats, setStats] = useState({ totalUsers: 0, totalVips: 0, totalEntries: 0 });
  const [logs, setLogs] = useState([]);
  const [lastBackup, setLastBackup] = useState(null);
  const [nextBackup, setNextBackup] = useState(null);
  const [backupSize, setBackupSize] = useState('0 KB');
  const [countdown, setCountdown] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const searchSuggestTimeout = useRef(null);
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [activeFilter, setViewFilter] = useState('all'); // all, new, vip, engaged, voted
  
  // Support Ticket States
  const [supportModal, setSupportModal] = useState(null); // { id, name }
  const [redemptionModal, setRedemptionModal] = useState(null); // { id, name, currentPoints, isVip }
  const [ticketViewModal, setTicketViewModal] = useState(null); // { name, tickets }
  const [attendeeDetailModal, setAttendeeDetailModal] = useState(null);
  const [popcornModal, setPopcornModal] = useState(null);
  const [vipToggleTarget, setVipToggleTarget] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Ticketing');
  const [allTickets, setAllTickets] = useState([]);
  const [showTickets, setShowTickets] = useState(false);
  const [pendingQrCount, setPendingQrCount] = useState(0);

  useEffect(() => {
    api.isDevMode().then(setIsDevMode).catch(() => setIsDevMode(false));
  }, []);

  useEffect(() => {
    if (searchSuggestTimeout.current) clearTimeout(searchSuggestTimeout.current);
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSearchSuggestions([]);
      return undefined;
    }
    searchSuggestTimeout.current = setTimeout(async () => {
      try {
        setSearchSuggestions(await api.searchContacts(trimmed, 8));
      } catch {
        setSearchSuggestions([]);
      }
    }, CONTACT_SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchSuggestTimeout.current) clearTimeout(searchSuggestTimeout.current);
    };
  }, [searchTerm]);

  const applySearchSuggestion = (contact) => {
    playSound('click');
    const ref = api.contactReference(contact);
    setSearchTerm(ref || contact.name || contact.email || contact.phone || '');
    setSearchSuggestions([]);
  };

  const openDevClearModal = () => {
    playSound('error');
    setWipeStep('confirm');
    setWipePin('');
    setShowWipe(true);
  };

  const closeDevClearModal = () => {
    playSound('click');
    setShowWipe(false);
    setWipeStep('confirm');
    setWipePin('');
  };

  const loadData = async () => {
    // Stats
    const s = await api.getTotalStats();
    setStats(s);

    // Backup
    setLastBackup(await api.getLastBackupTime());
    setNextBackup(await api.getNextBackupTime());
    setBackupSize(await api.getBackupSize());

    // Logs
    const l = await api.getStaffLogs(15);
    setLogs(l);

    // Tickets
    const t = await api.getSupportTickets();
    setAllTickets(t);

    // Table Data
    let list = [];
    if (searchTerm.trim()) {
      list = await api.searchContacts(searchTerm);
    } else {
      list = await api.getAllRecentContacts(50);
    }

    await Promise.all((list || []).map(async (c) => {
      if (!api.contactReference(c)) {
        const updated = await api.ensureContactReference(c.contact_id);
        if (updated) Object.assign(c, updated);
      }
    }));
    
    const withCounts = await Promise.all((list || []).map(async c => {
      const actions = await api.getCompletedActions(c.contact_id);
      return { 
        ...c, 
        entries: await api.getEntryCount(c.contact_id),
        voted: await api.getVote(c.contact_id),
        colombia: api.isColombiaRetreatInterested(c) || actions.includes('Retreat Interest'),
        colombiaSource: c.colombia_retreat_source || null,
        actionCount: actions.length
      };
    }));

    // Apply Filters
    let filtered = withCounts;
    if (activeFilter === 'new') {
      filtered = withCounts.filter(c => c.total_points <= 10 && c.actionCount <= 1 && !c.is_vip);
    } else if (activeFilter === 'vip') {
      filtered = withCounts.filter(c => c.is_vip);
    } else if (activeFilter === 'engaged') {
      filtered = withCounts.filter(c => c.actionCount > 1 || c.total_points > 10);
    } else if (activeFilter === 'voted') {
      filtered = withCounts.filter(c => c.voted);
    } else if (activeFilter === 'declined') {
      filtered = withCounts.filter(c => api.isContactDeclined(c));
    } else if (activeFilter === 'not-declined') {
      filtered = withCounts.filter(c => !api.isContactDeclined(c));
    } else if (activeFilter === 'colombia') {
      filtered = withCounts.filter(c => c.colombia);
    }

    setContacts(filtered);
    
    // --- Data Health Check ---
    let issues = 0;
    for (const c of withCounts) {
      const physicalCount = c.physical_tickets?.length || 0;
      // VIPs should have at least 2 entries.
      // Every physical ticket should have at least one corresponding entry record.
      if (c.is_vip && c.entries < 2) issues++;
      if (c.entries < physicalCount) issues++;
    }
    setHealthStatus(issues > 0 ? `⚠️ ${issues} inconsistencies` : '✅ Data Healthy');

    try {
      const pending = await api.getAllPendingMobileSignups();
      setPendingQrCount(pending.length);
    } catch {
      setPendingQrCount(0);
    }
  };

  useEffect(() => { loadData(); }, [searchTerm, activeFilter]);

  useEffect(() => {
    const unsub = api.onMobileSignupUpdate?.(() => loadData());
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [searchTerm, activeFilter]);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!nextBackup) return;
      const remaining = nextBackup - Date.now();
      if (remaining <= 0) {
        setNextBackup(await api.getNextBackupTime());
        setLastBackup(await api.getLastBackupTime());
        loadData();
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [nextBackup]);

  const fixDataContradictions = async () => {
    setNotify({ message: 'Analyzing data...', type: 'success' });
    let fixed = 0;
    for (const c of contacts) {
      const physicalCount = c.physical_tickets?.length || 0;
      
      // Fix VIP bonus missing
      if (c.is_vip && c.entries < 2) {
        const needed = 2 - c.entries;
        await api.addRaffleEntries(c.contact_id, needed, 'VIP Bonus (Auto-Fix)');
        fixed++;
      }
      
      // Fix missing entries for physical tickets
      if (c.entries < physicalCount) {
        const needed = physicalCount - c.entries;
        await api.addRaffleEntries(c.contact_id, needed, 'Physical Ticket Sync (Auto-Fix)');
        fixed++;
      }
    }
    
    if (fixed === 0) {
      setNotify({ message: 'No inconsistencies found. Data is healthy!', type: 'success' });
    } else {
      setNotify({ message: `Success! Repaired ${fixed} records.`, type: 'success' });
    }
    loadData();
  };

  const handleRaffleAdjust = async (count) => {
    if (count > 0) await api.addRaffleEntries(raffleModal.id, count, 'Staff Adjustment', staffName);
    else for(let i=0; i<Math.abs(count); i++) await api.removeRaffleEntry(raffleModal.id, staffName);
    setNotify({ message: 'Raffle Adjusted', type: 'success' });
    setRaffleModal(null);
    loadData();
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject || !ticketMessage) return setNotify({ message: 'Subject and Message required', type: 'error' });
    await api.createSupportTicket(supportModal.id, {
      subject: ticketSubject,
      message: ticketMessage,
      category: ticketCategory,
      staffName
    });
    setNotify({ message: 'Support Ticket Created', type: 'success' });
    setSupportModal(null);
    setTicketSubject('');
    setTicketMessage('');
    loadData();
  };

  const handleResolveTicket = async (tid) => {
    await api.updateTicketStatus(tid, 'Resolved', staffName);
    setNotify({ message: 'Ticket Resolved', type: 'success' });
    loadData();
  };

  const refreshPopcornContact = async (contactId) => {
    const full = await api.getContactById(contactId);
    if (!full) return;
    setPopcornModal((prev) => (prev?.contact_id === contactId ? { ...prev, ...full } : prev));
    setAttendeeDetailModal((prev) => (prev?.contact_id === contactId ? { ...prev, ...full } : prev));
    await loadData();
  };

  const handleVipToggleApprove = async (approvingStaffName) => {
    if (!vipToggleTarget) return;
    const c = vipToggleTarget;
    try {
      await api.toggleVipWithLog(c.contact_id, c.is_vip, approvingStaffName || staffName);
      playSound(c.is_vip ? 'click' : 'vip');
      setNotify({
        message: c.is_vip ? `${c.name} — VIP removed` : `${c.name} — VIP granted (+2 raffle entries)`,
        type: 'success',
      });
      setVipToggleTarget(null);
      await loadData();
      if (attendeeDetailModal?.contact_id === c.contact_id) {
        const updated = await api.getContactById(c.contact_id);
        setAttendeeDetailModal({
          ...attendeeDetailModal,
          ...updated,
          entries: await api.getEntryCount(c.contact_id),
        });
      }
    } catch (err) {
      setNotify({ message: err.message, type: 'error' });
    }
  };

  const handleRedeem = async (item, cost) => {
    try {
      if (item === 'VIP Upgrade') {
        if (redemptionModal.isVip) throw new Error('Already VIP!');
        await api.redeemPoints(redemptionModal.id, cost, item, staffName);
        await api.grantVipStatus(redemptionModal.id, staffName);
      } else {
        await api.redeemPoints(redemptionModal.id, cost, item, staffName);
      }
      setNotify({ message: `${item} Redeemed!`, type: 'success' });
      setRedemptionModal(null);
      loadData();
    } catch (err) {
      setNotify({ message: err.message, type: 'error' });
    }
  };

  const handleClearDevTestData = async () => {
    if (wipePin.length < 4) {
      setNotify({ message: 'Enter your 4-digit staff PIN', type: 'error' });
      return;
    }
    try {
      await api.clearDevTestData(staffName, wipePin);
      playSound('confirm');
      setNotify({ message: 'Dev test data cleared', type: 'success' });
      closeDevClearModal();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      playSound('error');
      setNotify({ message: err.message || 'Could not clear test data', type: 'error' });
    }
  };

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="neon-text-pink">Staff Dashboard</h2>
          <p>Staff Member: <strong>{staffName}</strong></p>
          <button
            className="btn btn-lime"
            style={{ marginTop: '12px', minWidth: 'auto' }}
            onClick={() => { playSound('click'); onNavigate('staff-qr-queue'); }}
          >
            📱 QR Approvals{pendingQrCount > 0 ? ` (${pendingQrCount})` : ''}
          </button>
          <button
            className="btn btn-violet"
            style={{ marginTop: '8px', minWidth: 'auto' }}
            onClick={() => { playSound('click'); onNavigate('staff-vip-manager'); }}
          >
            👑 Manage VIP
          </button>
        </div>
        <div className="card" style={{ padding: '15px 25px', border: '1px solid var(--neon-lime)', background: 'rgba(204,255,0,0.05)', display: 'flex', gap: '30px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '5px' }}>Last Backup</div>
            <div style={{ fontSize: '1.1rem', color: 'var(--neon-lime)', fontWeight: 'bold' }}>{api.formatCivilianTime(lastBackup)}</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '30px' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '5px' }}>Next Backup</div>
            <div style={{ fontSize: '1.1rem', color: 'var(--cyber-pink)', fontWeight: 'bold' }}>{countdown || '--:--'}</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '30px' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '5px' }}>Data Weight</div>
            <div style={{ fontSize: '1.1rem', color: 'white', fontWeight: 'bold' }}>{backupSize}</div>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '30px', cursor: 'pointer' }} onClick={fixDataContradictions}>
            <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '5px' }}>Data Integrity</div>
            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{healthStatus}</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginTop: '30px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Total Attendees</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--cyber-pink)' }}>{stats.totalVips}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>VIP Members</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--neon-lime)' }}>{stats.totalEntries}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Total Tickets/Entries</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--electric-violet)' }}>
            {stats.totalUsers > 0 ? (stats.totalEntries / stats.totalUsers).toFixed(1) : 0}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Avg. Entries/User</div>
        </div>
      </div>

      <StaffGiveawayHubReference />

      <div style={{ marginTop: '24px', maxWidth: '900px' }}>
        <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '12px' }}>
          Quick view. Use <strong>📱 QR Approvals</strong> above for full screen approve workflow.
        </p>
        <MobileSignupPanel
          staffName={staffName}
          showQr={false}
          title="Pending QR Signups (preview)"
          onApproved={() => { setNotify({ message: 'Signup approved and saved.', type: 'success' }); loadData(); }}
          onDeclined={() => { setNotify({ message: 'Signup marked as declined. Still visible in Attendee Management.', type: 'success' }); loadData(); }}
          onError={(msg) => setNotify({ message: msg, type: 'error' })}
        />
      </div>

      {attendeeDetailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '460px', maxWidth: '92vw' }}>
            <h3 className="neon-text-lime" style={{ marginBottom: '4px' }}>{attendeeDetailModal.name}</h3>
            <p style={{ opacity: 0.6, fontSize: '0.85rem', margin: '0 0 16px' }}>
              <GuestReferenceDisplay contact={attendeeDetailModal} />
            </p>
            {api.isPrehistoricGuestReference(attendeeDetailModal) && api.legacyGuestReference(attendeeDetailModal) ? (
              <p style={{ opacity: 0.45, fontSize: '0.75rem', margin: '-8px 0 16px' }}>
                Prehistoric ID: {api.legacyGuestReference(attendeeDetailModal)}
              </p>
            ) : null}
            <div style={{ display: 'grid', gap: '12px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <div><span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Email</span>{attendeeDetailModal.email || '—'}</div>
              <div><span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Phone</span>{attendeeDetailModal.phone || '—'}</div>
              <div>
                <span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>VIP Status</span>
                {attendeeDetailModal.is_vip ? '👑 VIP Active' : 'Standard'}
              </div>
              {(attendeeDetailModal.physical_tickets?.length > 0) && (
                <div>
                  <span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Physical Tickets (6-digit)</span>
                  {attendeeDetailModal.physical_tickets.join(', ')}
                </div>
              )}
              <div>
                <span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Colombia Retreat</span>
                {api.isColombiaRetreatInterested(attendeeDetailModal) ? (
                  <>
                    <ColombiaRetreatBadge contact={attendeeDetailModal} />
                    <span style={{ marginLeft: '8px', opacity: 0.75 }}>
                      {api.colombiaRetreatSourceLabel(attendeeDetailModal.colombia_retreat_source)}
                    </span>
                  </>
                ) : '—'}
              </div>
              <div>
                <span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>QR Signup Status</span>
                {api.isContactDeclined(attendeeDetailModal) ? 'Declined' : attendeeDetailModal.mobile_signup_confirmed || attendeeDetailModal.signup_status === 'approved' ? 'Approved' : attendeeDetailModal.mobile_signup_pending ? 'Pending' : '—'}
              </div>
              {attendeeDetailModal.mobile_signup_at && (
                <div><span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Signed Up</span>{api.formatCivilianTime(attendeeDetailModal.mobile_signup_at)}</div>
              )}
              {attendeeDetailModal.mobile_signup_confirmed_at && (
                <div><span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Approved</span>{api.formatCivilianTime(attendeeDetailModal.mobile_signup_confirmed_at)}{attendeeDetailModal.mobile_signup_confirmed_by_staff ? ` by ${attendeeDetailModal.mobile_signup_confirmed_by_staff}` : ''}</div>
              )}
              {attendeeDetailModal.mobile_signup_denied_at && (
                <div><span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Declined</span>{api.formatCivilianTime(attendeeDetailModal.mobile_signup_denied_at)}{attendeeDetailModal.mobile_signup_denied_by_staff ? ` by ${attendeeDetailModal.mobile_signup_denied_by_staff}` : ''}</div>
              )}
              <div><span style={{ opacity: 0.55, display: 'block', fontSize: '0.75rem' }}>Points / Raffle Entries</span>{attendeeDetailModal.total_points} pts · {attendeeDetailModal.entries ?? 0} entries</div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <PopcornRefillPanel
                contact={attendeeDetailModal}
                staffName={staffName}
                setNotify={setNotify}
                onDistributed={refreshPopcornContact}
              />
            </div>
            <button
              className="btn"
              style={{
                width: '100%',
                marginTop: '16px',
                background: attendeeDetailModal.is_vip ? 'rgba(255,80,80,0.15)' : 'rgba(204,255,0,0.12)',
                border: attendeeDetailModal.is_vip ? '1px solid rgba(255,80,80,0.45)' : '1px solid var(--neon-lime)',
                color: attendeeDetailModal.is_vip ? '#ff8a8a' : 'var(--neon-lime)',
              }}
              onClick={() => { playSound('click'); setVipToggleTarget(attendeeDetailModal); }}
            >
              {attendeeDetailModal.is_vip ? 'Remove VIP Status' : 'Make VIP (+2 raffle entries)'}
            </button>
            <button className="btn btn-lime" style={{ width: '100%', marginTop: '10px' }} onClick={() => { playSound('click'); setAttendeeDetailModal(null); }}>Close</button>
          </div>
        </div>
      )}

      {popcornModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4100 }}>
          <div className="card" style={{ width: '480px', maxWidth: '92vw' }}>
            <h3 className="neon-text-lime" style={{ margin: '0 0 4px' }}>Popcorn Manager</h3>
            <p style={{ margin: '0 0 16px', opacity: 0.65, fontSize: '0.9rem' }}>
              {popcornModal.name}
              {api.contactReference(popcornModal) ? ` · ${api.contactReference(popcornModal)}` : ''}
            </p>
            <PopcornRefillPanel
              contact={popcornModal}
              staffName={staffName}
              setNotify={setNotify}
              onDistributed={refreshPopcornContact}
            />
            <button
              type="button"
              className="btn"
              style={{ width: '100%', marginTop: '14px', background: 'transparent' }}
              onClick={() => { playSound('click'); setPopcornModal(null); }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <StaffApprovalModal
        isOpen={!!vipToggleTarget}
        actionName={vipToggleTarget?.is_vip ? 'Remove VIP Status' : 'Grant VIP Status'}
        onClose={() => setVipToggleTarget(null)}
        onApprove={handleVipToggleApprove}
        onFocusInput={onFocusInput}
        setNotify={setNotify}
        staffNames={staffNames}
      />

      {raffleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '400px' }}><h3>Adjust Raffle: {raffleModal.name}</h3>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}><button className="btn btn-lime" style={{ flex: 1 }} onClick={() => { playSound('points'); handleRaffleAdjust(1); }}>+1</button><button className="btn btn-violet" style={{ flex: 1 }} onClick={() => { playSound('points'); handleRaffleAdjust(-1); }}>-1</button></div>
            <button className="btn" onClick={() => { playSound('click'); setRaffleModal(null); }} style={{ width: '100%', marginTop: '20px' }}>Close</button>
          </div>
        </div>
      )}

      {supportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '500px' }}>
            <h3 className="neon-text-lime">New Support Ticket</h3>
            <p>Attendee: <strong>{supportModal.name}</strong></p>
            
            <div className="input-group">
              <label className="input-label">Category</label>
              <CustomDropdown 
                options={["Ticketing", "Sales", "Data Entry", "Other"]} 
                value={ticketCategory} 
                onChange={setTicketCategory} 
              />
            </div>

            <div className="input-group">
              <label className="input-label">Subject</label>
              <input 
                type="text" 
                placeholder="Brief summary..." 
                value={ticketSubject} 
                onChange={(e) => setTicketSubject(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Message / Details</label>
              <textarea 
                placeholder="Detailed complaint or issue..." 
                value={ticketMessage} 
                onChange={(e) => setTicketMessage(e.target.value)}
                style={{ width: '100%', height: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '10px', borderRadius: '8px', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-lime" style={{ flex: 1 }} onClick={handleCreateTicket}>Create Ticket</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setSupportModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {redemptionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '500px' }}>
            <h3 className="neon-text-lime">Redeem Points</h3>
            <p>Attendee: <strong>{redemptionModal.name}</strong></p>
            <p>Balance: <strong style={{ color: 'var(--neon-lime)' }}>{redemptionModal.currentPoints} pts</strong></p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
              <button 
                className="btn btn-lime" 
                style={{ width: '100%', margin: 0, opacity: redemptionModal.isVip ? 0.5 : 1 }} 
                onClick={() => handleRedeem('VIP Upgrade', 500)}
                disabled={redemptionModal.currentPoints < 500 || redemptionModal.isVip}
              >
                VIP Upgrade (500 pts)
              </button>
              <button 
                className="btn btn-violet" 
                style={{ width: '100%', margin: 0 }} 
                onClick={() => handleRedeem('Influencer Pack', 500)}
                disabled={redemptionModal.currentPoints < 500}
              >
                Influencer Pack (500 pts)
              </button>
              <button 
                className="btn" 
                style={{ width: '100%', margin: 0, border: '1px solid var(--cyber-pink)', color: 'var(--cyber-pink)' }} 
                onClick={() => handleRedeem('30% Off Booth Items', 500)}
                disabled={redemptionModal.currentPoints < 500}
              >
                30% Off Everything (500 pts)
              </button>
            </div>

            <button className="btn" style={{ width: '100%', marginTop: '30px' }} onClick={() => setRedemptionModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {ticketViewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="card" style={{ width: '400px', textAlign: 'center' }}>
            <h3 className="neon-text-lime" style={{ marginBottom: '20px' }}>Physical Tickets: {ticketViewModal.name}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '30px', maxHeight: '400px', overflowY: 'auto', padding: '10px' }}>
              {ticketViewModal.tickets.map(t => (
                <div key={t} style={{ background: 'var(--neon-lime)', color: 'black', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  #{t}
                </div>
              ))}
              {ticketViewModal.tickets.length === 0 && <p style={{ opacity: 0.5 }}>No physical tickets linked.</p>}
            </div>
            <button className="btn" style={{ width: '100%' }} onClick={() => setTicketViewModal(null)}>Close</button>
          </div>
        </div>
      )}

      {showTickets && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4500 }}>
          <div className="card" style={{ width: '900px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="neon-text-violet">Active Support Tickets</h2>
              <button className="btn" onClick={() => setShowTickets(false)}>✕ Close</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', opacity: 0.6 }}>
                  <th>Time</th><th>Category</th><th>Subject</th><th>Staff</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allTickets.map(t => (
                  <tr key={t.ticket_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '15px 0', fontSize: '0.8rem' }}>{api.formatCivilianTime(t.timestamp)}</td>
                    <td><span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{t.category}</span></td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{t.subject}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{t.message}</div>
                    </td>
                    <td>{t.created_by_staff}</td>
                    <td><span style={{ color: t.status === 'Open' ? 'var(--neon-lime)' : 'gray' }}>{t.status}</span></td>
                    <td>
                      {t.status === 'Open' && (
                        <button className="btn" style={{ padding: '5px 10px', fontSize: '0.7rem' }} onClick={() => handleResolveTicket(t.ticket_id)}>Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
                {allTickets.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>No support tickets found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showWipe && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(120, 0, 0, 0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, padding: '24px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', textAlign: 'center', border: '2px solid #ef4444', background: 'rgba(20, 0, 0, 0.95)' }}>
            <h2 style={{ color: '#ff6b6b', marginBottom: '8px' }}>⚠️ Clear Dev Test Data?</h2>
            {wipeStep === 'confirm' ? (
              <>
                <p style={{ opacity: 0.85, lineHeight: 1.55, margin: '0 0 20px' }}>
                  This removes all test contacts, votes, signups, and staff logs created during <strong>npm run dev</strong>.
                  It does not run on production show PCs.
                </p>
                <p style={{ color: '#ffb347', fontSize: '0.9rem', marginBottom: '24px' }}>Are you sure you want to continue?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ width: '100%', margin: 0, background: '#dc2626', color: '#fff', border: '2px solid #ef4444', fontWeight: 'bold' }}
                    onClick={() => { playSound('click'); setWipeStep('pin'); }}
                  >
                    Yes, continue
                  </button>
                  <button type="button" className="btn" style={{ width: '100%', margin: 0, background: 'transparent' }} onClick={closeDevClearModal}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ opacity: 0.8, margin: '0 0 16px' }}>Enter your staff PIN to confirm.</p>
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Staff PIN"
                    value={wipePin}
                    readOnly
                    onClick={(e) => onFocusInput('numeric', wipePin, setWipePin, 4, null, e.currentTarget)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ width: '100%', margin: 0, background: '#dc2626', color: '#fff', border: '2px solid #ef4444', fontWeight: 'bold' }}
                    onClick={() => { playSound('error'); handleClearDevTestData(); }}
                  >
                    Clear test data
                  </button>
                  <button type="button" className="btn" style={{ width: '100%', margin: 0, background: 'transparent' }} onClick={() => { playSound('click'); setWipeStep('confirm'); setWipePin(''); }}>
                    Back
                  </button>
                  <button type="button" className="btn" style={{ width: '100%', margin: 0, background: 'transparent', opacity: 0.7 }} onClick={closeDevClearModal}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Attendee Management</h3>
            <button className="btn" style={{ padding: '5px 15px', fontSize: '0.8rem', background: 'rgba(139, 0, 255, 0.1)', border: '1px solid var(--electric-violet)' }} onClick={() => setShowTickets(true)}>
              🎫 View Tickets ({allTickets.filter(t => t.status === 'Open').length} Open)
            </button>
          </div>
          <div style={{ position: 'relative', width: '360px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search name, email, phone, or reference (e.g. CND-00007)..."
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 20px', borderRadius: '10px', color: 'white', width: '100%' }}
              value={searchTerm}
              readOnly
              onClick={(e) => onFocusInput('default', searchTerm, setSearchTerm, null, null, e.currentTarget)}
            />
            {searchSuggestions.length > 0 && (
              <div className="contact-search-results contact-search-results--dropdown">
                <ContactSearchResults
                  results={searchSuggestions}
                  onSelect={applySearchSuggestion}
                  hint="Attendee matches — tap to filter"
                />
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
          {[
            { id: 'all', label: 'All Attendees' },
            { id: 'not-declined', label: 'Not Declined' },
            { id: 'declined', label: 'Declined QR' },
            { id: 'new', label: 'New/Inactive' },
            { id: 'vip', label: 'VIP Members' },
            { id: 'engaged', label: 'Engaged (Active)' },
            { id: 'voted', label: 'Voted on Flavors' },
            { id: 'colombia', label: 'Colombia Retreat 🇨🇴' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setViewFilter(tab.id)}
              style={{
                padding: '8px 20px',
                borderRadius: '50px',
                border: activeFilter === tab.id ? '1px solid var(--neon-lime)' : '1px solid var(--glass-border)',
                background: activeFilter === tab.id ? 'rgba(204, 255, 0, 0.1)' : 'transparent',
                color: activeFilter === tab.id ? 'var(--neon-lime)' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                fontWeight: activeFilter === tab.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', opacity: 0.7, fontSize: '0.9rem' }}>
              <th>Reference</th><th>Status</th><th>Name</th><th>Points</th><th>Total Tickets</th><th>VIP</th><th>🍿</th><th>🌸</th><th>🗳️</th><th>🇨🇴</th><th>Action</th>
            </tr>
          </thead>
          <tbody>{contacts.map(c => {
            const declined = api.isContactDeclined(c);
            return (
            <tr key={c.contact_id} style={{ borderBottom: '1px solid var(--glass-border)', opacity: declined ? 0.5 : 1, background: declined ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <td
                style={{
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(204,255,0,0.35)',
                }}
                title="View contact details"
                onClick={async () => {
                  playSound('click');
                  const full = await api.ensureContactReference(c.contact_id);
                  setAttendeeDetailModal(full || c);
                }}
              >
                <GuestReferenceDisplay contact={c} declined={declined} />
              </td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                {declined ? (
                  <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 'bold', background: 'rgba(255,80,80,0.15)', color: '#ff6b6b' }}>DECLINED</span>
                ) : c.mobile_signup_confirmed || c.signup_status === 'approved' ? (
                  <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 'bold', background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>APPROVED</span>
                ) : c.mobile_signup_pending ? (
                  <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 'bold', background: 'rgba(255,0,127,0.12)', color: '#ff007f' }}>PENDING</span>
                ) : (
                  <span style={{ opacity: 0.35, fontSize: '0.75rem' }}>—</span>
                )}
                {c.colombia ? <ColombiaRetreatBadge contact={c} compact /> : null}
                </div>
              </td>
              <td
                style={{ color: declined ? 'rgba(255,255,255,0.55)' : 'inherit', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.25)' }}
                title="View contact details"
                onClick={async () => {
                  playSound('click');
                  const full = await api.ensureContactReference(c.contact_id);
                  setAttendeeDetailModal(full || c);
                }}
              >
                {c.name}
              </td><td>{c.total_points}</td>
              <td 
                style={{ cursor: c.physical_tickets?.length > 0 ? 'pointer' : 'default' }} 
                onClick={() => { if (c.physical_tickets?.length > 0) { playSound('click'); setTicketViewModal({ name: c.name, tickets: c.physical_tickets }); } }}
              >
                <span style={{ fontWeight: 'bold', color: 'var(--neon-lime)' }}>{c.entries}</span>
                {c.physical_tickets?.length > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '5px' }}>({c.physical_tickets.length} Physical 🔍)</span>}
              </td>
              <td><span className="icon-btn" title={c.is_vip ? 'VIP active' : 'Not VIP'}>{c.is_vip ? '👑' : ''}</span></td>
              <td
                style={{ cursor: c.is_vip ? 'pointer' : 'default' }}
                title={c.is_vip ? 'Open popcorn manager' : 'Not VIP'}
                onClick={() => {
                  if (!c.is_vip) return;
                  playSound('click');
                  setPopcornModal(c);
                }}
              >
                <PopcornStatusChip isVip={c.is_vip} lastRedeemed={c.vip_popcorn_last_redeemed_at} />
              </td>
              <td><span className="icon-btn" onClick={() => c.flower_claimed && setNotify({ message: '1g Flower Perk Claimed', type: 'success' })}>{c.flower_claimed ? '🌸' : ''}</span></td>
              <td><span className="icon-btn" onClick={() => c.voted && setNotify({ message: 'User has Voted on Seasonings', type: 'success' })}>{c.voted ? '🗳️' : ''}</span></td>
              <td><span className="icon-btn" title={c.colombia ? api.colombiaRetreatSourceLabel(c.colombiaSource) : ''} onClick={() => c.colombia && setNotify({ message: `Colombia Retreat — ${api.colombiaRetreatSourceLabel(c.colombiaSource)}`, type: 'success' })}>{c.colombia ? '🔥' : ''}</span></td>
              <td style={{ display: 'flex', gap: '5px', padding: '10px' }}>
                <button className="btn" style={{ minWidth: 'auto', padding: '5px 10px' }} title={c.is_vip ? 'Remove VIP' : 'Make VIP'} onClick={() => { playSound('click'); setVipToggleTarget(c); }}>{c.is_vip ? '👑' : '👑+'}</button>
                <button
                  className="btn"
                  style={{ minWidth: 'auto', padding: '5px 10px', opacity: c.is_vip ? 1 : 0.4 }}
                  title={c.is_vip ? 'Popcorn manager' : 'VIP required for popcorn'}
                  onClick={() => { playSound('click'); setPopcornModal(c); }}
                >
                  🍿
                </button>
                <button className="btn" style={{ minWidth: 'auto', padding: '5px 10px' }} onClick={() => { playSound('click'); setRaffleModal({ id: c.contact_id, name: c.name }); }}>🎟️ Adjust</button>
                <button className="btn" style={{ minWidth: 'auto', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--neon-lime)' }} onClick={() => setRedemptionModal({ id: c.contact_id, name: c.name, currentPoints: c.total_points, isVip: c.is_vip })}>🎁 Redeem</button>
                <button className="btn" style={{ minWidth: 'auto', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid gray' }} onClick={() => setSupportModal({ id: c.contact_id, name: c.name })}>💬 Support</button>
              </td>
            </tr>
          );})}</tbody>
          </table>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="card" style={{ marginTop: '30px', background: 'rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginBottom: '20px' }}>Recent Staff Activity</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', opacity: 0.6 }}>
                <th>Time</th><th>Staff</th><th>Action</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px 0', color: 'var(--cyber-pink)' }}>{api.formatCivilianTime(log.timestamp)}</td>
                  <td><strong>{log.staff_name}</strong></td>
                  <td><span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>{log.type}</span></td>
                  <td style={{ opacity: 0.8 }}>
                    {log.contact_name ? <span>{log.contact_name}{log.guest_reference ? ` (${log.guest_reference})` : ''}</span> : null}
                    {log.count ? `${log.count} entries` : ''}
                    {log.item ? log.item : ''}
                    {log.points_deducted ? `${log.points_deducted} pts` : ''}
                    {!log.contact_name && !log.count && !log.item && !log.points_deducted ? '—' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <button
          type="button"
          className="btn btn-violet"
          style={{ minWidth: '220px', margin: 0 }}
          onClick={() => { playSound('click'); onLogout(); }}
        >
          Return to Home
        </button>

        {isDevMode ? (
          <div style={{
            width: '100%',
            maxWidth: '520px',
            paddingTop: '28px',
            borderTop: '1px solid rgba(255, 80, 80, 0.25)',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.78rem', opacity: 0.55, margin: '0 0 16px', lineHeight: 1.5 }}>
              Development only — clears local test data from npm run dev (contacts, votes, QR signups)
            </p>
            <button
              type="button"
              className="btn"
              style={{
                minWidth: '280px',
                margin: 0,
                background: '#b91c1c',
                color: '#fff',
                border: '2px solid #ef4444',
                fontWeight: 'bold',
                boxShadow: '0 0 24px rgba(220, 38, 38, 0.35)',
              }}
              onClick={openDevClearModal}
            >
              Clear Dev Test Data
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FLAVORS = [
  "Lemon Lavender Sugar", "Lemon Ginger Sugar", "Cane Sugar", "Smoke Salt", "Sriracha Salt", "Pink Himalayan Salt"
];

const AddTicket = ({ onBack, setNotify, onFocusInput, currentContactId }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ticketNumber, setTicketNumber] = useState('');
  const searchTimeout = useRef(null);

  useEffect(() => {
    if (currentContactId && !selectedAccount) {
      api.getContactById(currentContactId).then(setSelectedAccount);
    }
  }, [currentContactId, selectedAccount]);

  const handleSearch = useCallback(async (val) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length >= 1) {
      searchTimeout.current = setTimeout(async () => {
        setSearchResults(await api.searchContacts(val));
      }, 300);
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedAccount) return setNotify({ message: 'Select account first', type: 'error' });
    if (ticketNumber.length !== 6) return setNotify({ message: '6 digits required', type: 'error' });

    try {
      await api.addTicketToContact(selectedAccount.contact_id, ticketNumber);
      playSound('confirm');
      setNotify({ message: `Ticket #${ticketNumber} added!`, type: 'success' });
      setTicketNumber('');
      onBack();
    } catch (err) {
      playSound('error');
      setNotify({ message: err.message, type: 'error' });
    }
  };

  return (
    <div className="view-container" style={{ padding: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 className="neon-text-lime" style={{ marginBottom: '30px' }}>Add Raffle Ticket</h2>
      
      {!selectedAccount ? (
        <div className="card" style={{ width: '100%', maxWidth: '600px' }}>
          <p style={{ marginBottom: '20px', textAlign: 'center' }}>Search your account to add a ticket:</p>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Name, Email, or Phone..." 
              value={search} 
              readOnly
                    onClick={(e) => onFocusInput('default', search, handleSearch, null, null, e.currentTarget)}
            />
          </div>
          <ContactSearchResults
            results={searchResults}
            onSelect={(c) => setSelectedAccount(c)}
          />
        </div>
      ) : (
        <div className="card" style={{ width: '100%', maxWidth: '600px', textAlign: 'center' }}>
          <p style={{ marginBottom: '10px' }}>Adding ticket for:</p>
          <h3 className="neon-text-violet" style={{ marginBottom: '30px' }}>{selectedAccount.name}</h3>
          
          <div className="input-group">
            <label className="input-label">Enter 6-Digit Ticket Number</label>
            <input 
              type="text" 
              placeholder="XXXXXX" 
              value={ticketNumber} 
              readOnly
              style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '8px', fontWeight: 'bold' }}
              onClick={(e) => onFocusInput('numeric', ticketNumber, setTicketNumber, 6, handleSubmit, e.currentTarget)}
            />
          </div>

          <button className="btn btn-lime" style={{ width: '100%', marginTop: '20px' }} onClick={handleSubmit}>Submit Ticket</button>
          <button className="btn" style={{ width: '100%', background: 'transparent' }} onClick={() => setSelectedAccount(null)}>Switch Account</button>
        </div>
      )}

      <button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={() => { playSound('click'); onBack(); }}>Cancel</button>
    </div>
  );
};

const VipEnticementModal = ({ isOpen, onClose, onNavigate }) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 30000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 12000 }}>
      <div className="card" style={{ 
        maxWidth: '600px', 
        width: '90%', 
        textAlign: 'center', 
        position: 'relative',
        border: '3px solid var(--cyber-pink)',
        boxShadow: '0 0 50px rgba(255, 0, 127, 0.4)',
        padding: '50px 40px'
      }}>
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', top: '20px', right: '20px', 
            background: 'transparent', border: 'none', color: 'white', 
            fontSize: '2rem', cursor: 'pointer', opacity: 0.5 
          }}
        >✕</button>
        
        <h2 className="neon-text-pink" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>VIP UPGRADE AVAILABLE</h2>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '30px', borderRadius: '15px', marginBottom: '30px' }}>
          <h3 style={{ color: 'var(--neon-lime)', fontSize: '1.8rem', marginBottom: '15px' }}>Only $20</h3>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.2rem', lineHeight: '2', textAlign: 'left', display: 'inline-block' }}>
            <li>✨ <strong>1g Premium Flower</strong> Claim</li>
            <li>🍿 <strong>Unlimited</strong> Popcorn Refills</li>
            <li>🎟️ <strong>2 Bonus</strong> Raffle Entries</li>
            <li>👑 Exclusive VIP Status</li>
          </ul>
        </div>
        
        <button className="btn btn-lime" style={{ width: '100%', height: '70px', fontSize: '1.4rem' }} onClick={() => { playSound('click'); onNavigate('vip'); onClose(); }}>
          GET VIP STATUS NOW
        </button>
        <p style={{ marginTop: '20px', opacity: 0.5, fontSize: '0.8rem' }}>Closing automatically in 30s...</p>
      </div>
    </div>
  );
};

const ColombiaRetreat = ({ onBack, onNavigate, currentContactId, setNotify }) => {
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  useEffect(() => {
    if (!currentContactId) return;
    api.getContactById(currentContactId).then((contact) => {
      if (contact && api.isColombiaRetreatInterested(contact)) setSignedUp(true);
    });
  }, [currentContactId]);

  const amenities = [
    { icon: '🌿', text: 'Cannabis Farm Tour' },
    { icon: '🚤', text: 'Private Boat Tour' },
    { icon: '💃', text: 'Culture & Night Out Tour' },
    { icon: '🎢', text: 'Ziplining Adventure' },
    { icon: '🐎', text: 'Horseback Riding' },
    { icon: '🚜', text: 'ATV Jungle Trek' },
    { icon: '🍳', text: 'Daily Chef Breakfast' },
    { icon: '🍽️', text: 'Private Chef Dinner' },
    { icon: '🧘', text: 'Morning Yoga' },
    { icon: '🏨', text: 'Luxury Accommodations' },
    { icon: '🎁', text: 'GŪD Welcome Bag' }
  ];

  const handleSignUp = async () => {
    if (!currentContactId) {
      setNotify({ message: 'Please Check-In First!', type: 'error' });
      onNavigate('register');
      return;
    }
    setLoading(true);
    try {
      await api.markColombiaRetreatInterest(currentContactId, 'kiosk_early_bird', 'System');
      setNotify({ message: 'Early Bird Spot Reserved!', type: 'success' });
      setSignedUp(true);
    } catch (err) {
      setNotify({ message: 'Registration failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-container" style={{ padding: '40px 20px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header Hero */}
        <div
          className="card colombia-retreat-hero"
          style={{ '--colombia-hero-url': `url("${COLOMBIA_RETREAT_HERO_IMAGE}")`, marginBottom: '30px' }}
        >
          <h1 className="neon-text-lime" style={{ fontSize: '3.5rem', marginBottom: '10px' }}>RETREAT TO COLOMBIA</h1>
          <h2 style={{ letterSpacing: '4px', opacity: 0.9 }}>THE ULTIMATE GŪD EXPERIENCE</h2>
        </div>

        {/* Pricing Flash */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <p style={{ opacity: 0.5, textDecoration: 'line-through' }}>Regular Price: $2,000</p>
            <h3 className="neon-text-pink" style={{ fontSize: '2.2rem' }}>CANNADELIC ONLY: $1,500</h3>
            <p className="neon-text-lime" style={{ fontWeight: 'bold', fontSize: '0.9rem', marginTop: '5px' }}>SAVE $500 BY JOINING THE WAITLIST TODAY</p>
          </div>
        </div>

        {/* Amenities Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '40px' }}>
          {amenities.map((item, i) => (
            <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(20, 20, 24, 0.8)' }}>
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <span style={{ fontWeight: '500' }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Action Card */}
        <div className="card" style={{ textAlign: 'center', border: '2px solid var(--electric-violet)', background: 'rgba(139, 0, 255, 0.05)' }}>
          <h3 className="neon-text-violet" style={{ fontSize: '1.8rem', marginBottom: '15px' }}>JOIN THE ADVENTURE</h3>
          <p style={{ marginBottom: '30px', opacity: 0.8, maxWidth: '600px', margin: '0 auto 30px auto' }}>
            Secure your early bird discount. Reserve your spot on our upcoming luxury retreat to Colombia. No payment required today, just your interest!
          </p>
          
          {signedUp ? (
            <div className="card" style={{ background: 'var(--neon-lime)', color: 'black', fontWeight: 'bold', fontSize: '1.2rem' }}>
              ✅ YOU'RE ON THE LIST! WE'LL REACH OUT SOON.
            </div>
          ) : (
            <button 
              className="btn btn-lime" 
              style={{ width: '100%', maxWidth: '500px', height: '80px', fontSize: '1.5rem' }}
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? 'RESERVING...' : 'SECURE EARLY BIRD PRICE'}
            </button>
          )}
        </div>

        <div className="card" style={{ marginTop: '30px', border: '1px solid var(--neon-lime)', background: 'rgba(204,255,0,0.04)' }}>
          <MobileSignupPanel
            stream="colombia_retreat"
            title="Phone Sign-Up — Colombia Retreat"
            showQr
            showPending={false}
            staffName="Colombia Page"
            onApproved={() => setNotify({ message: 'Colombia retreat signup approved.', type: 'success' })}
            onDeclined={() => setNotify({ message: 'Signup declined.', type: 'success' })}
            onError={(msg) => setNotify({ message: msg, type: 'error' })}
          />
        </div>

        <center><button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={onBack}>Back to Home</button></center>
      </div>
    </div>
  );
};

const FlavorVote = ({ contactId, onBack, setNotify, onFocusInput, onSuccess }) => {
  const { search, searchResults, handleSearch, clearSearch } = useContactSearch();
  const [step, setStep] = useState('pick');
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [priorVote, setPriorVote] = useState(null);
  const [sessionContact, setSessionContact] = useState(null);

  useEffect(() => {
    if (!contactId) {
      setSessionContact(null);
      return;
    }
    Promise.all([api.getContactById(contactId), api.getVote(contactId)]).then(([contact, vote]) => {
      setSessionContact(contact || null);
      if (vote) {
        setPriorVote(vote.seasoning_name);
        setStep('done');
      }
    });
  }, [contactId]);

  const allocateVote = async (id) => {
    if (!selectedFlavor || loading) return;
    setLoading(true);
    try {
      const existing = await api.getVote(id);
      if (existing) {
        playSound('error');
        setNotify({
          message: `This guest already voted for ${existing.seasoning_name}. One vote per person.`,
          type: 'error',
        });
        return;
      }
      await api.castVote(id, selectedFlavor);
      onSuccess?.(id);
      playSound('points');
      setNotify({ message: `Voted for ${selectedFlavor}! +50 Points`, type: 'success' });
      setStep('done');
      setTimeout(onBack, 2500);
    } catch (err) {
      playSound('error');
      setNotify({ message: err.message || 'Could not save vote', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePickFlavor = (flavor) => {
    playSound('click');
    setSelectedFlavor(flavor);
    setStep('identify');
  };

  const handleSelectContact = (id) => {
    clearSearch();
    allocateVote(id);
  };

  if (isRegistering) {
    return (
      <CheckIn
        onBack={() => setIsRegistering(false)}
        onSuccess={(id) => {
          setIsRegistering(false);
          allocateVote(id);
        }}
        onFocusInput={onFocusInput}
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="view-container" style={{ padding: '50px', textAlign: 'center', overflowY: 'auto' }}>
        <div className="card" style={{ maxWidth: '520px', margin: '0 auto', border: '2px solid var(--neon-lime)' }}>
          <h2 className="neon-text-lime" style={{ marginBottom: '12px' }}>Vote Recorded</h2>
          <p style={{ opacity: 0.85, lineHeight: 1.6 }}>
            {priorVote
              ? <>You already rated <strong>{priorVote}</strong>. One vote per guest.</>
              : <>Thanks! Your flavor vote is saved.</>}
          </p>
          <button className="btn btn-lime" style={{ width: '100%', marginTop: '24px' }} onClick={() => { playSound('click'); onBack(); }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (step === 'identify') {
    return (
      <div className="view-container" style={{ padding: '40px 24px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: '24px', textAlign: 'center', border: '1px solid var(--electric-violet)', background: 'rgba(139, 0, 255, 0.08)' }}>
            <p style={{ margin: 0, opacity: 0.65, fontSize: '0.85rem' }}>Your flavor pick</p>
            <h2 className="neon-text-lime" style={{ margin: '8px 0 0', fontSize: '1.4rem' }}>{selectedFlavor}</h2>
            <button
              type="button"
              className="btn"
              style={{ marginTop: '16px', background: 'transparent', fontSize: '0.85rem', padding: '6px 14px' }}
              onClick={() => { playSound('click'); setStep('pick'); }}
            >
              Change flavor
            </button>
          </div>

          <AccountLookupCard
            search={search}
            searchResults={searchResults}
            onSearch={handleSearch}
            onSelectContact={handleSelectContact}
            onRegister={() => { playSound('click'); setIsRegistering(true); }}
            onFocusInput={onFocusInput}
            onNavigateHome={() => { playSound('click'); onBack(); }}
            title="Link your vote"
            description="Search by name, email, phone, or reference (e.g. CND-00007), then tap your account to save your vote and earn 50 points."
            registerLabel="New here? Register & vote"
            showBackHome={false}
          />

          {sessionContact && (
            <div className="card" style={{ marginBottom: '24px', textAlign: 'center', border: '1px solid var(--neon-lime)' }}>
              <p style={{ margin: '0 0 12px', opacity: 0.75 }}>Already checked in on this kiosk?</p>
              <button
                type="button"
                className="btn btn-lime"
                style={{ width: '100%', margin: 0 }}
                disabled={loading}
                onClick={() => allocateVote(sessionContact.contact_id)}
              >
                {loading ? 'Saving…' : `Save vote as ${sessionContact.name}`}
              </button>
            </div>
          )}

          <button className="btn" style={{ width: '100%', background: 'transparent' }} onClick={() => { playSound('click'); onBack(); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container" style={{ padding: '50px', textAlign: 'center', overflowY: 'auto' }}>
      <h2 className="neon-text-lime" style={{ marginBottom: '10px' }}>Rate Your Favorite Flavor</h2>
      <p style={{ opacity: 0.7, marginBottom: '40px' }}>Tap a seasoning — then link your account to earn 50 points (one vote per guest).</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {FLAVORS.map((flavor) => (
          <button
            key={flavor}
            type="button"
            className="card btn"
            style={{
              padding: '40px 20px',
              fontSize: '1.3rem',
              textTransform: 'uppercase',
              borderColor: selectedFlavor === flavor ? 'var(--neon-lime)' : 'var(--glass-border)',
              margin: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto',
            }}
            onClick={() => handlePickFlavor(flavor)}
            disabled={loading}
          >
            {flavor}
          </button>
        ))}
      </div>
      <button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={() => { playSound('click'); onBack(); }}>Back</button>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState('home');
  const [kioskId, setKioskId] = useState('');
  const [staffNames, setStaffNames] = useState([]);
  const [activeStaff, setActiveStaff] = useState(null);
  const [currentContactId, setCurrentContactId] = useState(null);
  const [currentContactName, setCurrentContactName] = useState(null);
  const [currentContactFirstName, setCurrentContactFirstName] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [notify, setNotify] = useState(null);
  const [logoutCountdown, setLogoutCountdown] = useState(null);
  const [keyboard, setKeyboard] = useState({ isOpen: false, type: 'default', value: '', callback: null, nextCallback: null, maxLength: null, anchorRect: null });
  
  const idleTimer = useRef(null);
  const countdownInterval = useRef(null);

  useEffect(() => {
    if (!currentContactId || activeStaff || showVipModal) return;

    const randomCheck = setInterval(async () => {
      // 10% chance to show every 45 seconds if the user is a non-VIP and we are on home or menu views
      if (Math.random() < 0.10 && (view === 'home' || view.includes('menu'))) {
        try {
          const contact = await api.getContactById(currentContactId);
          if (contact && !contact.is_vip) {
            setShowVipModal(true);
          }
        } catch (err) {
          console.error('Failed to fetch contact for VIP check:', err);
        }
      }
    }, 45000);

    return () => clearInterval(randomCheck);
  }, [currentContactId, activeStaff, showVipModal, view]);

  useEffect(() => {
    window.electronAPI?.getStaffNames?.()
      .then((names) => setStaffNames(Array.isArray(names) ? names : []))
      .catch(() => setStaffNames([]));
  }, []);

  useEffect(() => {
    const fetchKioskId = async () => {
      try {
        const id = await api.getKioskId();
        setKioskId(id);
        
        // Load session after Kiosk ID is known
        const suffix = id.replace(/\s+/g, '_');
        setCurrentContactId(localStorage.getItem(`currentContactId_${suffix}`));
        setCurrentContactName(localStorage.getItem(`currentContactName_${suffix}`));
        setCurrentContactFirstName(localStorage.getItem(`currentContactFirstName_${suffix}`));
      } catch (err) {
        console.error('Failed to fetch Kiosk ID:', err);
      }
    };
    fetchKioskId();
  }, []);

  // Sync session to localStorage
  useEffect(() => {
    if (!kioskId) return;
    const suffix = kioskId.replace(/\s+/g, '_');
    
    if (currentContactId) {
      localStorage.setItem(`currentContactId_${suffix}`, currentContactId);
      localStorage.setItem(`currentContactName_${suffix}`, currentContactName);
      localStorage.setItem(`currentContactFirstName_${suffix}`, currentContactFirstName || '');
    } else {
      localStorage.removeItem(`currentContactId_${suffix}`);
      localStorage.removeItem(`currentContactName_${suffix}`);
      localStorage.removeItem(`currentContactFirstName_${suffix}`);
    }
  }, [currentContactId, currentContactName, currentContactFirstName, kioskId]);

  const logout = useCallback(() => {
    setView('home'); 
    setCurrentContactId(null);
    setCurrentContactName(null);
    setCurrentContactFirstName(null);
    setIsNewUser(false);
    setLogoutCountdown(null);
    setKeyboard({ ...keyboard, isOpen: false });
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, [keyboard]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    setLogoutCountdown(null);

    if ((view !== 'home' || currentContactId) && !activeStaff) { 
      idleTimer.current = setTimeout(() => { 
        let secondsLeft = 5;
        setLogoutCountdown(secondsLeft);
        countdownInterval.current = setInterval(() => {
          secondsLeft -= 1;
          if (secondsLeft <= 0) {
            clearInterval(countdownInterval.current);
            logout();
          } else {
            setLogoutCountdown(secondsLeft);
          }
        }, 1000);
      }, 55000);
    }
  }, [view, activeStaff, currentContactId, logout]);

  useEffect(() => {
    const reset = () => resetIdleTimer();
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    resetIdleTimer();
    return () => {
        events.forEach(e => window.removeEventListener(e, reset));
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [resetIdleTimer]);

  const handleCheckInSuccess = (id, isNew, name) => {
    setCurrentContactId(id);
    setCurrentContactName(name);
    const firstName = name.split(' ')[0];
    setCurrentContactFirstName(firstName);
    setIsNewUser(isNew);
    navigate('thank-you');

    // Trigger VIP modal immediately after first registration (with slight delay)
    if (isNew) {
      setTimeout(() => setShowVipModal(true), 3000);
    }
  };

  const navigate = (newView) => { 
    setView(newView); 
    resetIdleTimer(); 
  };

  const openKeyboard = (type, value, callback, maxLength = null, nextCallback = null, anchorEl = null) => {
    const anchorRect = anchorEl?.getBoundingClientRect?.() ?? null;
    setKeyboard({ isOpen: true, type, value, callback, maxLength, nextCallback, anchorRect });
  };

  const handleToggleFullscreen = async () => {
    try {
      await api.toggleKiosk();
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  return (
    <ErrorBoundary>
      <div className={`app-container ${keyboard.isOpen ? 'keyboard-open' : ''}`} onClick={() => keyboard.isOpen && setKeyboard({...keyboard, isOpen: false})}>
        {notify && <Notification message={notify.message} type={notify.type} onClose={() => setNotify(null)} />}
        
        {logoutCountdown !== null && (
          <div className="countdown-overlay">
            <h2 className="neon-text-pink" style={{ fontSize: '3rem' }}>STILL THERE?</h2>
            <p style={{ fontSize: '1.5rem', margin: '20px 0' }}>Signing out in {logoutCountdown} seconds...</p>
            <button className="btn btn-lime" onClick={resetIdleTimer}>I'M HERE</button>
          </div>
        )}

        <VipEnticementModal 
          isOpen={showVipModal} 
          onClose={() => setShowVipModal(false)} 
          onNavigate={navigate} 
        />

        {view === 'home' && <Home onNavigate={navigate} currentContactId={currentContactId} currentContactName={currentContactName} setNotify={setNotify} />}
        
        {/* Kiosk ID Label - Subtle indicator for staff */}
        <div style={{ position: 'fixed', top: '10px', right: '10px', fontSize: '0.8rem', opacity: 0.4, color: 'var(--neon-lime)', zIndex: 5, pointerEvents: 'none', fontWeight: 'bold' }}>
          {kioskId}
        </div>

        {view === 'main-menu' && <MainMenu onNavigate={navigate} />}
        {view === 'menu-infused' && <InfusedMenu onBack={() => navigate('main-menu')} />}
        {view === 'menu-products' && <ProductMenu onBack={() => navigate('main-menu')} />}
        {view === 'add-ticket' && <AddTicket onBack={() => navigate('home')} setNotify={setNotify} onFocusInput={openKeyboard} currentContactId={currentContactId} />}
        {view === 'colombia' && <ColombiaRetreat onBack={() => navigate('home')} onNavigate={navigate} currentContactId={currentContactId} setNotify={setNotify} />}
        {view === 'vote' && (
          <FlavorVote
            contactId={currentContactId}
            onBack={() => navigate('home')}
            setNotify={setNotify}
            onFocusInput={openKeyboard}
            onSuccess={setCurrentContactId}
          />
        )}
        {view === 'register' && <CheckIn onBack={() => navigate('home')} onSuccess={handleCheckInSuccess} onFocusInput={openKeyboard} />}
        {view === 'thank-you' && <ThankYou name={currentContactFirstName || currentContactName} isNew={isNewUser} onContinue={() => navigate('main-menu')} />}
        {view === 'profile' && <Profile contactId={currentContactId} onNavigate={navigate} />}
        {view === 'giveaway' && <GiveawayEntry contactId={currentContactId} onNavigate={navigate} onSuccess={setCurrentContactId} setNotify={setNotify} onFocusInput={openKeyboard} staffNames={staffNames} />}
        {view === 'vip' && <VipLounge onNavigate={navigate} onSuccess={setCurrentContactId} setNotify={setNotify} onFocusInput={openKeyboard} staffNames={staffNames} />}
        {view === 'staff-login' && <StaffLogin onBack={() => navigate('home')} onLoginSuccess={(name) => { setActiveStaff(name); navigate('staff-dashboard'); }} onFocusInput={openKeyboard} setNotify={setNotify} staffNames={staffNames} />}
        {view === 'staff-dashboard' && (
          <StaffDashboard
            onLogout={() => { setActiveStaff(null); navigate('home'); }}
            staffName={activeStaff}
            setNotify={setNotify}
            onFocusInput={openKeyboard}
            onNavigate={navigate}
            staffNames={staffNames}
          />
        )}
        {view === 'staff-vip-manager' && activeStaff && <StaffVipManager onBack={() => navigate('staff-dashboard')} staffName={activeStaff} setNotify={setNotify} onFocusInput={openKeyboard} />}
        {view === 'staff-qr-queue' && activeStaff && <StaffQrApprovals onBack={() => navigate('staff-dashboard')} staffName={activeStaff} setNotify={setNotify} />}
        
        {view !== 'home' && view !== 'thank-you' && (
          <div style={{ position: 'fixed', bottom: '20px', left: '20px' }}>
            <button className="btn" style={{ minWidth: 'auto' }} onClick={() => { playSound('click'); navigate('home'); }}>🏠</button>
          </div>
        )}
        
        {currentContactId && (
          <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
            <button className="btn btn-violet" style={{ minWidth: 'auto', padding: '10px 20px' }} onClick={() => { playSound('click'); logout(); }}>Sign Out</button>
          </div>
        )}

        {/* --- Global Utility: Fullscreen Toggle (Bottom Right) --- */}
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
          <button 
            onClick={(e) => { e.stopPropagation(); handleToggleFullscreen(); }}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'rgba(255,255,255,0.3)',
              borderRadius: '5px',
              padding: '5px 10px',
              fontSize: '0.6rem',
              cursor: 'pointer'
            }}
          >
            ⛶
          </button>
        </div>

        {keyboard.isOpen && (
          <VirtualKeyboard 
            layout={keyboard.type} 
            value={keyboard.value} 
            maxLength={keyboard.maxLength}
            anchorRect={keyboard.anchorRect}
            onNext={keyboard.nextCallback}
            onChange={(v) => {
              setKeyboard({ ...keyboard, value: v });
              if (keyboard.callback) keyboard.callback(v);
            }} 
            onClose={() => setKeyboard({ ...keyboard, isOpen: false })} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);