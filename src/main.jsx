import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import api from './api';
import playSound from './sound';
import { QRCodeCanvas } from 'qrcode.react';

// --- Giveaway Configuration ---
const GIVEAWAY_PACKAGE = [
  "Sauna Blanket",
  "SmokenYoga Class (April 10th or April 24th)",
  "Free Greenroom Event Class (+1 for a friend)",
  "Exclusive Discounts",
  "Merch + Swag (Stickers etc.)",
  "Signature Seasoning Kit",
  "Wellness Stoner Basket (Bluetooth speaker, snacks, yoga mat, candles, etc.)"
];

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

// --- Staff Configuration ---
const STAFF_LIST = [
  { name: 'Amina', pin: '1001' }, { name: 'Jas', pin: '1002' }, { name: 'Ed', pin: '1003' }, { name: 'Jalen', pin: '1004' }, { name: 'Brandon', pin: '1005' }, { name: 'Stella', pin: '1006' }, { name: 'Amanda', pin: '1007' }
];

// --- Keyboard Components ---

const VirtualKeyboard = ({ value, onChange, onClear, onClose, onNext, layout = 'default', maxLength }) => {
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
    <div className="keyboard-overlay" onClick={(e) => e.stopPropagation()}>
      <div style={{ marginBottom: '15px', width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--neon-lime)', fontWeight: 'bold', fontSize: '1rem' }}>
          {layout === 'numeric' ? 'NUMERIC PAD' : 'TOUCH KEYBOARD'}
        </div>
        <button className="key key-special" style={{ minWidth: '80px', height: '35px', fontSize: '0.8rem' }} onClick={onClose}>HIDE</button>
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

const StaffApprovalModal = ({ isOpen, onClose, onApprove, actionName, onFocusInput, setNotify }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [pin, setPin] = useState('');
  if (!isOpen) return null;
  const handleSubmit = (e) => {
    e.preventDefault();
    const staff = STAFF_LIST.find(s => s.name === selectedStaff);
    if (staff && pin === staff.pin) { onApprove(staff.name); onClose(); setPin(''); setSelectedStaff(''); } 
    else { playSound('error'); setNotify({ message: 'Invalid PIN', type: 'error' }); }
  };
  return (
    <div className="modal-overlay">
      <div className="card" style={{ width: '450px', textAlign: 'center' }}>
        <h3 className="neon-text-pink">Staff Approval</h3>
        <p style={{ margin: '15px 0' }}>Action: <strong>{actionName}</strong></p>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <select className="btn" style={{ width: '100%', background: 'var(--glass-bg)', color: 'white' }} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} required>
              <option value="">Choose Staff...</option>
              {STAFF_LIST.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="PIN" 
              value={pin} 
              readOnly
              onClick={() => onFocusInput('numeric', pin, setPin, 4)}
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

const RefillCountdown = ({ lastRedeemed }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    useEffect(() => {
        const update = () => {
            if (!lastRedeemed) return;
            const diff = 600000 - (new Date() - new Date(lastRedeemed));
            if (diff <= 0) { setTimeLeft(0); }
            else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        };
        update();
        const i = setInterval(update, 1000);
        return () => clearInterval(i);
    }, [lastRedeemed]);
    if (timeLeft === 0) return <p className="neon-text-lime" style={{ fontWeight: 'bold' }}>REFILL READY!</p>;
    if (!timeLeft) return null;
    return (
        <div>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Next Refill In:</p>
            <p className="neon-text-pink" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{timeLeft}</p>
        </div>
    );
}

// --- Views ---

const Home = ({ onNavigate, currentContactId, currentContactName }) => {
  const [totalEntries, setTotalEntries] = useState(0);

  useEffect(() => {
    const fetchTotal = async () => {
      const list = await api.getAllRecentContacts();
      const counts = await Promise.all(list.map(c => api.getEntryCount(c.contact_id)));
      setTotalEntries(counts.reduce((a, b) => a + b, 0));
    };
    fetchTotal();
    const interval = setInterval(fetchTotal, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="view-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', minHeight: '100%' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="neon-text-lime" style={{ fontSize: '4rem', marginBottom: '0.5rem', fontWeight: '900', letterSpacing: '2px' }}>GŪDESSENCE</h1>
        <h2 className="neon-text-violet" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Cannadelic Night Market</h2>
      </header>
      
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        {currentContactName ? (
          <div className="neon-text-lime" style={{ fontSize: '1.5rem', background: 'rgba(204, 255, 0, 0.1)', padding: '10px 30px', borderRadius: '50px', border: '1px solid var(--neon-lime)' }}>
            Welcome, {currentContactName}!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <h2 className="neon-text-violet" style={{ fontSize: '1.5rem' }}>Hello There!</h2>
            <p className="neon-text-lime" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              Welcome! Please check in or register to start earning points and entries.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '850px', padding: '0 20px', flex: 1 }}>
        
        {/* 1. PRIMARY ACTION: IDENTITY/REGISTRATION (Highest Importance) */}
        <div style={{ width: '100%' }}>
          {currentContactId ? (
            <button className="btn btn-violet" style={{ width: '100%', height: '100px', margin: 0, background: 'rgba(204, 255, 0, 0.1)', border: '3px solid var(--neon-lime)' }} onClick={() => { playSound('click'); onNavigate('profile'); }}>
              <div style={{ textAlign: 'center' }}>
                <div className="neon-text-lime" style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>View My Profile</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'none', color: 'white' }}>Manage your points & rewards</div>
              </div>
            </button>
          ) : (
            <button className="btn btn-lime" style={{ width: '100%', height: '100px', margin: 0, boxShadow: '0 0 40px rgba(204, 255, 0, 0.4)', background: 'var(--neon-lime)', color: 'black' }} onClick={() => { playSound('click'); onNavigate('register'); }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>CHECK-IN / REGISTER</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'none' }}>Start here to earn entries & exclusive perks</div>
              </div>
            </button>
          )}
        </div>

        {/* 2. HIGH CONVERSION: COLOMBIA RETREAT (Marketing Priority) */}
        <div style={{ width: '100%' }}>
          <button className="btn" style={{ 
            width: '100%', 
            height: '110px', 
            margin: 0, 
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)',
            border: 'none',
            color: 'black'
          }} onClick={() => { playSound('click'); onNavigate('colombia'); }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>🇨🇴 RETREAT TO COLOMBIA 🇨🇴</div>
              <div style={{ fontSize: '1rem', fontWeight: 'bold', textTransform: 'none' }}>Early Bird: Save $500! (Luxury All-Inclusive)</div>
            </div>
          </button>
        </div>

        {/* 3. EXCLUSIVITY & ENGAGEMENT GRID (Secondary Importance) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* VIP LOUNGE - High Contrast Pink */}
          <button className="btn" style={{ height: '120px', margin: 0, background: 'var(--cyber-pink)', border: 'none', color: 'white', boxShadow: '0 0 20px rgba(255, 0, 127, 0.3)' }} onClick={() => { playSound('click'); onNavigate('vip'); }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>VIP LOUNGE</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, textTransform: 'none', marginTop: '5px' }}>Exclusive Perks & Refills</div>
            </div>
          </button>

          {/* GIVEAWAY - Brand Violet */}
          <button className="btn btn-violet" style={{ height: '120px', margin: 0, background: 'var(--electric-violet)', color: 'white', border: 'none' }} onClick={() => { playSound('click'); onNavigate('giveaway'); }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>GIVEAWAY HUB</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9, textTransform: 'none', marginTop: '5px' }}>Win the Wellness Bundle</div>
            </div>
          </button>
        </div>

        {/* 4. INFO & SECONDARY GRID (Discovery) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* EVENT MENU - Dark Glass */}
          <button className="btn" style={{ height: '100px', margin: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => { playSound('click'); onNavigate('main-menu'); }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>EVENT MENU</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'none' }}>Popcorn & Merch</div>
            </div>
          </button>

          {/* RATE FLAVOR - Dark Glass */}
          <button className="btn" style={{ height: '100px', margin: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => { playSound('click'); onNavigate('vote'); }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem' }}>RATE FLAVOR</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'none' }}>Earn 50 Points</div>
            </div>
          </button>
        </div>

        {/* 5. UTILITY: ADD TICKET (Subtle) */}
        <div style={{ width: '100%' }}>
          <button className="btn" style={{ width: '100%', height: '70px', margin: 0, background: 'transparent', border: '1px dashed rgba(255,255,255,0.3)', opacity: 0.7 }} onClick={() => { playSound('click'); onNavigate('add-ticket'); }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem' }}>Link Physical Ticket Number</div>
            </div>
          </button>
        </div>
      </div>
      
      <footer style={{ marginTop: '60px', paddingBottom: '20px', textAlign: 'center' }}>
        <button style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.1)' }} onClick={() => { playSound('click'); onNavigate('staff-login'); }}>Staff Portal</button>
      </footer>
    </div>
  );
};

const MainMenu = ({ onNavigate }) => (
  <div className="view-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%', padding: '60px 20px' }}>
    <h2 className="neon-text-violet" style={{ marginBottom: '50px', fontSize: '2.5rem' }}>Select Event Menu</h2>
    
    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1100px', width: '100%' }}>
      {/* --- Infused Popcorn Card --- */}
      <div 
        className="card" 
        style={{ 
          flex: 1,
          minWidth: '350px',
          maxWidth: '480px',
          height: '400px',
          textAlign: 'center', 
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          border: '2px solid var(--neon-lime)',
          background: 'linear-gradient(145deg, rgba(204, 255, 0, 0.05), rgba(0, 0, 0, 0.4))',
          boxShadow: '0 0 30px rgba(204, 255, 0, 0.15)',
          transition: 'transform 0.3s ease'
        }} 
        onClick={() => { playSound('click'); onNavigate('menu-infused'); }}
      >
        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🍿</div>
        <h3 className="neon-text-lime" style={{ fontSize: '2.2rem', marginBottom: '15px' }}>Infused Popcorn</h3>
        <div style={{ height: '2px', width: '60px', background: 'var(--neon-lime)', marginBottom: '20px' }}></div>
        <p style={{ margin: '0 0 30px 0', opacity: 0.8, fontSize: '1.1rem', lineHeight: '1.5' }}>
          Explore our signature flavors, seasoning kits, and VIP experiences.
        </p>
        <button className="btn btn-lime" style={{ width: '100%', margin: 0 }}>View Flavors</button>
      </div>

      {/* --- Products & Merchandise Card --- */}
      <div 
        className="card" 
        style={{ 
          flex: 1,
          minWidth: '350px',
          maxWidth: '480px',
          height: '400px',
          textAlign: 'center', 
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          border: '2px solid var(--electric-violet)',
          background: 'linear-gradient(145deg, rgba(139, 0, 255, 0.05), rgba(0, 0, 0, 0.4))',
          boxShadow: '0 0 30px rgba(139, 0, 255, 0.15)',
          transition: 'transform 0.3s ease'
        }} 
        onClick={() => { playSound('click'); onNavigate('menu-products'); }}
      >
        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🛍️</div>
        <h3 className="neon-text-violet" style={{ fontSize: '2.2rem', marginBottom: '15px' }}>Merchandise</h3>
        <div style={{ height: '2px', width: '60px', background: 'var(--electric-violet)', marginBottom: '20px' }}></div>
        <p style={{ margin: '0 0 30px 0', opacity: 0.8, fontSize: '1.1rem', lineHeight: '1.5' }}>
          Premium flower selections, signature apparel, and wellness products.
        </p>
        <button className="btn btn-violet" style={{ width: '100%', margin: 0 }}>View Shop</button>
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
        { name: "1 Bag + 1 Water + Raffle Ticket", price: "$5" },
        { name: "2 Bags + 1 Water + Raffle Ticket", price: "$8" },
        { name: "1 Water + Raffle Ticket", price: "$3.50" }
      ]
    },
    {
      title: "Seasoning Kits",
      accent: "var(--electric-violet)",
      items: [
        { name: "Sweet Kit: 4 Pack + Raffle Ticket", price: "$25", pairing: "Pairs well with Kush" },
        { name: "Savory Kit: 4 Pack + Raffle Ticket", price: "$25", pairing: "Try with Lemon Ginger Sugar" },
        { name: "Individual Seasoning + Raffle Ticket", price: "$8 or 2 for $10" }
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

  return (
    <div className="view-container" style={{ padding: '40px 20px', textAlign: 'center', overflowY: 'auto' }} onScroll={handleScroll} ref={scrollRef}>
      <h2 className="neon-text-lime" style={{ marginBottom: '10px', fontSize: '2.5rem' }}>Popcorn Infused Menu</h2>
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
              {cat.items.map((item, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  padding: '8px 15px',
                  borderRadius: '10px',
                  background: item.featured ? 'rgba(255, 0, 127, 0.1)' : 'transparent',
                  border: item.featured ? '1px solid var(--cyber-pink)' : '1px solid transparent',
                  transform: item.featured ? 'scale(1.02)' : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: item.featured ? 'bold' : 'normal' }}>
                        {item.name}
                      </p>
                    </div>
                    <strong style={{ 
                      color: item.featured ? 'var(--cyber-pink)' : 'var(--text-primary)', 
                      fontSize: '1.2rem',
                      textShadow: item.featured ? '0 0 10px var(--cyber-pink)' : 'none'
                    }}>{item.price}</strong>
                  </div>
                  {item.pairing && <div className="pairing-note">{item.pairing}</div>}
                </div>
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
        { name: "Facial Serum", price: "$40" }, { name: "Bath Bombs", price: "$17" },
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

  return (
    <div className="view-container" style={{ padding: '40px 20px', textAlign: 'center', overflowY: 'auto' }} onScroll={handleScroll}>
      <h2 className="neon-text-violet" style={{ marginBottom: '30px', fontSize: '2.5rem' }}>Products & Merchandise</h2>
      
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
              {cat.items.map((item, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 15px',
                  borderRadius: '10px',
                  background: item.featured ? 'rgba(255, 0, 127, 0.1)' : 'transparent',
                  border: item.featured ? '1px solid var(--cyber-pink)' : '1px solid transparent',
                  transform: item.featured ? 'scale(1.02)' : 'none'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: item.featured ? 'bold' : 'normal' }}>
                      {item.name}
                      {item.status && <span className={`badge ${item.status === 'LIMITED' ? 'badge-scarcity' : 'badge-staff'}`}>{item.status}</span>}
                      {item.featured && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--cyber-pink)' }}>BEST SELLER</span>}
                    </p>
                  </div>
                  <strong style={{ 
                    color: item.featured ? 'var(--cyber-pink)' : 'var(--text-primary)', 
                    fontSize: '1.2rem',
                    textShadow: item.featured ? '0 0 10px var(--cyber-pink)' : 'none'
                  }}>{item.price}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={() => { playSound('click'); onBack(); }}>Back</button>
    </div>
  );
};

const CheckIn = ({ onBack, onSuccess, onFocusInput }) => {
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
      const result = await api.checkInOrRegister({ ...formData, ticketNumbers: ticketNumbers.filter(t => t.trim().length === 6) });
      playSound('confirm');
      onSuccess(result.contactId, result.isNew, result.contact.name);
    } catch (err) { 
      playSound('error'); 
      setError(err.message || 'Error'); 
    }
  };

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <button className="btn" onClick={() => { playSound('click'); onBack(); }} style={{ background: 'transparent' }}>← Back</button>
      <h2 className="neon-text-lime" style={{ marginBottom: '40px', textAlign: 'center' }}>Check-In / Register</h2>
      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ marginBottom: '20px', opacity: 0.7, textAlign: 'center' }}>Enter your info. If you've been here before, we'll find you!</p>
        {error && <p style={{ color: 'var(--cyber-pink)', marginBottom: '20px', textAlign: 'center' }}>{error}</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="input-group">
            <label className="input-label">First Name</label>
            <input 
              type="text" 
              value={formData.firstName} 
              readOnly 
              placeholder="Required"
              onClick={() => onFocusInput('default', formData.firstName, (v) => setFormData(prev => ({...prev, firstName: v})), null, () => document.getElementById('last-name-input').click())} 
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
              onClick={() => onFocusInput('default', formData.lastName, (v) => setFormData(prev => ({...prev, lastName: v})), null, () => document.getElementById('email-input').click())} 
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
            onClick={() => onFocusInput('default', formData.email, (v) => setFormData(prev => ({...prev, email: v})), null, () => document.getElementById('phone-input').click())} 
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
            onClick={() => onFocusInput('numeric', formData.phone, (v) => setFormData(prev => ({...prev, phone: v})), 10, () => document.getElementById('ticket-0').click())} 
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
                onClick={() => onFocusInput('numeric', num, (v) => updateTicket(i, v), 6, i < 9 ? () => {
                  if (i === ticketNumbers.length - 1) handleAddTicket();
                  setTimeout(() => document.getElementById(`ticket-${i+1}`).click(), 100);
                } : null)} 
              />
              {ticketNumbers.length > 1 && (
                <button type="button" className="btn" style={{ minWidth: '50px', padding: '10px', margin: 0, background: 'rgba(255,0,0,0.2)', border: '1px solid red' }} onClick={() => setTicketNumbers(ticketNumbers.filter((_, idx) => idx !== i))}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn" style={{ width: '100%', margin: '10px 0', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--neon-lime)', fontSize: '0.9rem' }} onClick={handleAddTicket}>+ Add Another Ticket</button>
        </div>

        <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '20px', textAlign: 'center' }}>Provide Email or Phone to check existing accounts.</p>
        <div style={{ marginTop: '30px', textAlign: 'center' }}><button type="submit" className="btn btn-lime" onClick={() => playSound('click')}>Proceed</button></div>
      </form>
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

  // Effect to navigate away if contactId becomes null
  useEffect(() => {
    if (!contactId) {
      onNavigate('home');
    }
  }, [contactId, onNavigate]);

  useEffect(() => {
    const load = async () => {
      const c = await api.getContactById(contactId);
      setContact(c);
      setEntries(await api.getEntryCount(contactId));
      setActions(await api.getCompletedActions(contactId));
    };
    if (contactId) load();
  }, [contactId]);
  if (!contact) return <div className="view-container">Loading...</div>;
  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="neon-text-lime">{contact.name}</h2>
        <div style={{ display: 'flex', gap: '20px', margin: '30px 0' }}>
            <div className="card" style={{ flex: 1 }}>Points: <span className="neon-text-violet">{contact.total_points}</span></div>
            <div className="card" style={{ flex: 1 }}>Entries: <span className="neon-text-lime">{entries}</span></div>
        </div>
        <div className="card" style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}>
            <h4 style={{ color: 'var(--neon-lime)' }}>Activities Done:</h4>
            <ul>{actions.map((a, i) => <li key={i}>{a} ✅</li>)}</ul>
        </div>
        <button className="btn btn-violet" onClick={() => { playSound('click'); onNavigate('giveaway'); }}>Raffle Tasks</button>
        <button className="btn btn-lime" onClick={() => { playSound('click'); onNavigate('home'); }}>Close</button>
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
      <p className="neon-text-pink" style={{ fontWeight: 'bold', letterSpacing: '2px' }}>SCROLL DOWN TO ENTER & TRACK ENTRIES</p>
    </div>
  </div>
);

const GiveawayEntry = ({ contactId, onNavigate, onSuccess, setNotify, onFocusInput }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [entries, setEntries] = useState(0);
  const [completedActions, setCompletedActions] = useState([]);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const searchTimeout = useRef(null);

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

  const handleSearch = useCallback(async (val) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (val.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        setSearchResults(await api.searchContacts(val));
      }, 300); // 300ms Debounce
    } else {
      setSearchResults([]);
    }
  }, []);

  const handleApproveAction = async (staffName) => {
    try {
      await api.verifyAndAwardAction(activeContact.contact_id, approvalTarget, staffName);
      playSound('points');
      setNotify({ message: `${approvalTarget} Verified!`, type: 'success' });
      loadStatus(activeContact.contact_id);
      setApprovalTarget(null);
    } catch (err) { setNotify({ message: err.message, type: 'error' }); }
  };

  if (isRegistering) return <CheckIn onBack={() => setIsRegistering(false)} onSuccess={(id) => { setIsRegistering(false); loadStatus(id); }} onFocusInput={onFocusInput} />;

  if (!activeContact) {
    return (
      <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
        <h2 className="neon-text-violet" style={{ textAlign: 'center', marginBottom: '30px' }}>Raffle Hub</h2>
        
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <GiveawayPackage />
          
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <p style={{ marginBottom: '25px', opacity: 0.8, textAlign: 'center' }}>Search account to check giveaway status.</p>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Search..." 
                value={search} 
                readOnly
                onClick={() => onFocusInput('default', search, handleSearch)}
                autoFocus 
              />
            </div>
            {searchResults.map(c => (
              <div key={c.contact_id} onClick={() => { playSound('click'); loadStatus(c.contact_id); setSearch(''); setSearchResults([]); }} style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                <strong>{c.name}</strong> ({c.email})
              </div>
            ))}
            <button className="btn btn-violet" onClick={() => { playSound('click'); setIsRegistering(true); }} style={{ width: '100%', marginTop: '20px' }}>New Registration</button>
            <button className="btn" onClick={() => { playSound('click'); onNavigate('home'); }} style={{ width: '100%', background: 'transparent' }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <StaffApprovalModal isOpen={!!approvalTarget} actionName={approvalTarget} onClose={() => setApprovalTarget(null)} onApprove={handleApproveAction} onFocusInput={onFocusInput} setNotify={setNotify} />
      
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h2 className="neon-text-violet">{activeContact.name}: {entries} Entries</h2>
          {!contactId && (
            <button className="btn" onClick={() => { playSound('click'); setActiveContact(null); }} style={{ minWidth: 'auto' }}>Switch Account</button>
          )}
        </div>

        <GiveawayPackage />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {['Google Review', 'Apple Maps Review', 'Social Media Story Post'].map(task => {
              const isDone = completedActions.includes(task);
              return (
                  <div key={task} className="card" style={{ 
                    border: isDone ? '2px solid var(--neon-lime)' : '1px solid var(--glass-border)', 
                    opacity: isDone ? 0.6 : 1,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '250px'
                  }}>
                      <h3 style={{ marginBottom: '15px' }}>{task} {isDone && '✅'}</h3>
                      
                      {task === 'Google Review' && !isDone && (
                        <div style={{ marginBottom: '20px', background: 'white', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <QRCodeCanvas value="https://search.google.com/local/writereview?placeid=ChIJRYOSq0vzwogRnYP5n_UBNkQ" size={100} />
                          <p style={{ color: 'black', fontSize: '0.6rem', marginTop: '5px', fontWeight: 'bold', margin: '5px 0 0 0' }}>SCAN TO REVIEW</p>
                        </div>
                      )}

                      {isDone ? (
                        <p className="neon-text-lime" style={{ fontWeight: 'bold' }}>Task Completed</p>
                      ) : (
                        <button className="btn btn-lime" style={{ width: '100%', margin: 0 }} onClick={() => { playSound('click'); setApprovalTarget(task); }}>Verify with Staff</button>
                      )}
                  </div>
              )
          })}
        </div>
        <center style={{ marginTop: '50px' }}><button className="btn btn-lime" onClick={() => { playSound('click'); onNavigate('home'); }}>Done</button></center>
      </div>
    </div>
  );
};

const VipLounge = ({ onNavigate, onSuccess, setNotify, onFocusInput }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [status, setStatus] = useState(null);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const searchTimeout = useRef(null);

  const loadStatus = async (id) => {
    const contact = await api.getContactById(id);
    if (!contact) return;
    setStatus({ contactId: contact.contact_id, name: contact.name, isVip: !!contact.is_vip, lastRedeemed: contact.vip_popcorn_last_redeemed_at, flowerClaimed: !!contact.flower_claimed });
    onSuccess(id);
    playSound('confirm');
  };

  const handleSearch = useCallback(async (val) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        setSearchResults(await api.searchContacts(val));
      }, 300);
    } else {
      setSearchResults([]);
    }
  }, []);

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

  if (isRegistering) return <CheckIn onBack={() => setIsRegistering(false)} onSuccess={(id) => { setIsRegistering(false); loadStatus(id); }} onFocusInput={onFocusInput} />;

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <StaffApprovalModal isOpen={!!approvalTarget} actionName={approvalTarget} onClose={() => setApprovalTarget(null)} onApprove={approvalTarget === 'VIP UPGRADE' ? handleVipUpgrade : handleClaimFlower} onFocusInput={onFocusInput} setNotify={setNotify} />
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
                    onClick={() => onFocusInput('default', search, handleSearch)}
                  />
                </div>
                {searchResults.map(c => (
                    <div key={c.contact_id} onClick={() => { playSound('click'); loadStatus(c.contact_id); setSearch(''); setSearchResults([]); }} style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                        <strong>{c.name}</strong> ({c.email})
                    </div>
                ))}
                <button className="btn btn-violet" onClick={() => { playSound('click'); setIsRegistering(true); }} style={{ width: '100%', marginTop: '20px' }}>Register VIP</button>
            </div>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="neon-text-lime">Member: {status.name}</h2>
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
                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>INCLUDES:</p>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: '1.1rem', lineHeight: '1.6' }}>
                  <li>✨ 1g Flower Claim</li>
                  <li>🍿 Unlimited Popcorn Refills</li>
                  <li>🎟️ 2 Bonus Raffle Entries</li>
                </ul>
              </div>
              <button className="btn btn-lime" onClick={() => { playSound('click'); setApprovalTarget('VIP UPGRADE'); }}>Grant VIP Status</button>
            </div>
          )}
          <button className="btn" onClick={() => { playSound('click'); setStatus(null); setSearch(''); }} style={{ background: 'transparent', marginTop: '30px' }}>Exit</button>
        </div>
      )}
    </div>
  );
};

const StaffLogin = ({ onBack, onLoginSuccess, onFocusInput, setNotify }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [pin, setPin] = useState('');
  const handleLogin = (e) => {
    e.preventDefault();
    const staff = STAFF_LIST.find(s => s.name === selectedStaff);
    if (staff && pin === staff.pin) { playSound('confirm'); onLoginSuccess(staff.name); }
    else { playSound('error'); setNotify({ message: 'Invalid PIN', type: 'error' }); }
  };
  return (
    <div className="view-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="card" style={{ width: '400px' }}>
        <h3 className="neon-text-pink">Staff Portal</h3>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <select className="btn" style={{ width: '100%', background: 'var(--glass-bg)', color: 'white' }} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} required>
              <option value="">Choose Name...</option>
              {STAFF_LIST.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="PIN" 
              value={pin} 
              readOnly
              onClick={() => onFocusInput('numeric', pin, setPin, 4)}
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

const StaffDashboard = ({ onLogout, staffName, setNotify, onFocusInput }) => {
  const [contacts, setContacts] = useState([]);
  const [raffleModal, setRaffleModal] = useState(null);
  const [showWipe, setShowWipe] = useState(false);
  const [wipePin1, setWipePin1] = useState('');
  const [wipePin2, setWipePin2] = useState('');
  
  // New States
  const [stats, setStats] = useState({ totalUsers: 0, totalVips: 0, totalEntries: 0 });
  const [logs, setLogs] = useState([]);
  const [lastBackup, setLastBackup] = useState(null);
  const [nextBackup, setNextBackup] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [healthStatus, setHealthStatus] = useState('Checking...');
  
  // Support Ticket States
  const [supportModal, setSupportModal] = useState(null); // { id, name }
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('Ticketing');
  const [allTickets, setAllTickets] = useState([]);
  const [showTickets, setShowTickets] = useState(false);

  const loadData = async () => {
    // Stats
    const s = await api.getTotalStats();
    setStats(s);

    // Backup
    setLastBackup(await api.getLastBackupTime());
    setNextBackup(await api.getNextBackupTime());

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
    
    const withCounts = await Promise.all((list || []).map(async c => {
      const actions = await api.getCompletedActions(c.contact_id);
      return { 
        ...c, 
        entries: await api.getEntryCount(c.contact_id),
        voted: await api.getVote(c.contact_id),
        colombia: actions.includes('Retreat Interest')
      };
    }));
    setContacts(withCounts);
    
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
  };

  useEffect(() => { loadData(); }, [searchTerm]);

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
    setNotify({ message: 'Fixing inconsistencies...', type: 'success' });
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
    setNotify({ message: `Fixed ${fixed} records`, type: 'success' });
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

  const handleWipe = async () => {
    const staff = STAFF_LIST.find(s => s.name === staffName);
    if (wipePin1 === staff.pin && wipePin2 === staff.pin) { await api.wipeAllData(); setNotify({ message: 'DATA WIPED', type: 'error' }); setTimeout(() => window.location.reload(), 1000); } 
    else { setNotify({ message: 'PIN mismatch', type: 'error' }); }
  };

  return (
    <div className="view-container" style={{ padding: '50px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="neon-text-pink">Staff Dashboard</h2>
          <p>Staff Member: <strong>{staffName}</strong></p>
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
              <select 
                value={ticketCategory} 
                onChange={(e) => setTicketCategory(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '10px', borderRadius: '8px' }}
              >
                <option value="Ticketing">Ticketing / Raffle</option>
                <option value="Sales">Sales / Merch</option>
                <option value="Data Entry">Data Entry Error</option>
                <option value="Other">Other / App Function</option>
              </select>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000 }}>
          <div className="card" style={{ width: '500px', textAlign: 'center' }}><h2>⚠️ WIPE DATA ⚠️</h2><p>Delete all event data?</p>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="PIN" 
                value={wipePin1} 
                readOnly 
                onClick={() => onFocusInput('numeric', wipePin1, setWipePin1, 4)}
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Confirm PIN" 
                value={wipePin2} 
                readOnly 
                onClick={() => onFocusInput('numeric', wipePin2, setWipePin2, 4)}
              />
            </div>
            <button className="btn" style={{ background: 'white', color: 'red' }} onClick={() => { playSound('error'); handleWipe(); }}>ERASE ALL</button>
            <button className="btn" onClick={() => { playSound('click'); setShowWipe(false); }} style={{ background: 'transparent', color: 'white' }}>Cancel</button>
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
          <input 
            type="text" 
            placeholder="Search attendees..." 
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '10px 20px', borderRadius: '10px', color: 'white', width: '300px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)', opacity: 0.7, fontSize: '0.9rem' }}>
              <th>Name</th><th>Points</th><th>Total Tickets</th><th>VIP</th><th>🌸</th><th>🗳️</th><th>🇨🇴</th><th>Action</th>
            </tr>
          </thead>
          <tbody>{contacts.map(c => (
            <tr key={c.contact_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td>{c.name}</td><td>{c.total_points}</td>
              <td>
                <span style={{ fontWeight: 'bold', color: 'var(--neon-lime)' }}>{c.entries}</span>
                {c.physical_tickets?.length > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '5px' }}>({c.physical_tickets.length} Physical)</span>}
              </td>
              <td>{c.is_vip ? '✅' : ''}</td>
              <td>{c.flower_claimed ? '🌸' : ''}</td>
              <td>{c.voted ? '🗳️' : ''}</td>
              <td>{c.colombia ? '🔥' : ''}</td>
              <td style={{ display: 'flex', gap: '5px' }}>
                <button className="btn" style={{ minWidth: 'auto', padding: '5px 10px' }} onClick={() => { playSound('click'); setRaffleModal({ id: c.contact_id, name: c.name }); }}>🎟️ Adjust</button>
                <button className="btn" style={{ minWidth: 'auto', padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid gray' }} onClick={() => setSupportModal({ id: c.contact_id, name: c.name })}>💬 Support</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
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
                    {log.count ? `${log.count} entries` : ''}
                    {log.item ? log.item : ''}
                    {log.points_deducted ? `${log.points_deducted} pts` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}><button className="btn btn-violet" onClick={() => { playSound('error'); setShowWipe(true); }}>Wipe Data</button><button className="btn" onClick={() => { playSound('click'); onLogout(); }}>Logout</button></div>
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
    if (val.length > 2) {
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
              onClick={() => onFocusInput('default', search, handleSearch)}
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {searchResults.map(c => (
              <div key={c.contact_id} onClick={() => { playSound('click'); setSelectedAccount(c); }} style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                <strong>{c.name}</strong> ({c.email || c.phone})
              </div>
            ))}
          </div>
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
              onClick={() => onFocusInput('numeric', ticketNumber, setTicketNumber, 6, handleSubmit)}
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
      await api.verifyAndAwardAction(currentContactId, 'Retreat Interest', 'System');
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
        <div className="card" style={{ 
          background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("https://images.unsplash.com/photo-1518182170546-07661fd94144?auto=format&fit=crop&w=1000&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          textAlign: 'center',
          padding: '60px 20px',
          border: '2px solid var(--neon-lime)',
          marginBottom: '30px'
        }}>
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
            Secure your early bird discount. Reserve your spot on our upcoming luxury retreat to Colombia. No payment required today—just your interest!
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

        <center><button className="btn" style={{ marginTop: '40px', background: 'transparent' }} onClick={onBack}>Back to Home</button></center>
      </div>
    </div>
  );
};

const FlavorVote = ({ contactId, onBack, setNotify }) => {
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkVote = async () => {
      if (contactId) {
        const existing = await api.getVote(contactId);
        if (existing) {
          setVoted(true);
          setNotify({ message: `You've already voted for ${existing.seasoning_name}!`, type: 'info' });
          setTimeout(onBack, 3000);
        }
      }
    };
    checkVote();
  }, [contactId, onBack, setNotify]);

  const handleVote = async (flavor) => {
    if (!contactId) {
      setNotify({ message: 'Please Check-In First!', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.castVote(contactId, flavor);
      playSound('points');
      setNotify({ message: `Voted for ${flavor}! +50 Points`, type: 'success' });
      setVoted(true);
      setTimeout(onBack, 2000);
    } catch (err) {
      playSound('error');
      setNotify({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-container" style={{ padding: '50px', textAlign: 'center', overflowY: 'auto' }}>
      <h2 className="neon-text-lime" style={{ marginBottom: '10px' }}>Rate Your Favorite Flavor</h2>
      <p style={{ opacity: 0.7, marginBottom: '40px' }}>Select the seasoning you enjoyed most to earn 50 points!</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        maxWidth: '800px', 
        margin: '0 auto' 
      }}>
        {FLAVORS.map(flavor => (
          <button 
            key={flavor} 
            className="card btn" 
            style={{ 
              padding: '40px 20px', 
              fontSize: '1.3rem', 
              textTransform: 'uppercase', 
              borderColor: 'var(--glass-border)',
              margin: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}
            onClick={() => handleVote(flavor)}
            disabled={voted || loading}
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
  const [activeStaff, setActiveStaff] = useState(null);
  const [currentContactId, setCurrentContactId] = useState(null);
  const [currentContactName, setCurrentContactName] = useState(null);
  const [currentContactFirstName, setCurrentContactFirstName] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [notify, setNotify] = useState(null);
  const [logoutCountdown, setLogoutCountdown] = useState(null);
  const [keyboard, setKeyboard] = useState({ isOpen: false, type: 'default', value: '', callback: null, nextCallback: null, maxLength: null });
  
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

  const openKeyboard = (type, value, callback, maxLength = null, nextCallback = null) => {
    setKeyboard({ isOpen: true, type, value, callback, maxLength, nextCallback });
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

        {view === 'home' && <Home onNavigate={navigate} currentContactId={currentContactId} currentContactName={currentContactName} />}
        
        {/* Kiosk ID Label - Subtle indicator for staff */}
        <div style={{ position: 'fixed', top: '10px', right: '10px', fontSize: '0.8rem', opacity: 0.4, color: 'var(--neon-lime)', zIndex: 5, pointerEvents: 'none', fontWeight: 'bold' }}>
          {kioskId}
        </div>

        {view === 'main-menu' && <MainMenu onNavigate={navigate} />}
        {view === 'menu-infused' && <InfusedMenu onBack={() => navigate('main-menu')} />}
        {view === 'menu-products' && <ProductMenu onBack={() => navigate('main-menu')} />}
        {view === 'add-ticket' && <AddTicket onBack={() => navigate('home')} setNotify={setNotify} onFocusInput={openKeyboard} currentContactId={currentContactId} />}
        {view === 'colombia' && <ColombiaRetreat onBack={() => navigate('home')} onNavigate={navigate} currentContactId={currentContactId} setNotify={setNotify} />}
        {view === 'vote' && <FlavorVote contactId={currentContactId} onBack={() => navigate('home')} setNotify={setNotify} />}
        {view === 'register' && <CheckIn onBack={() => navigate('home')} onSuccess={handleCheckInSuccess} onFocusInput={openKeyboard} />}
        {view === 'thank-you' && <ThankYou name={currentContactFirstName || currentContactName} isNew={isNewUser} onContinue={() => navigate('main-menu')} />}
        {view === 'profile' && <Profile contactId={currentContactId} onNavigate={navigate} />}
        {view === 'giveaway' && <GiveawayEntry contactId={currentContactId} onNavigate={navigate} onSuccess={setCurrentContactId} setNotify={setNotify} onFocusInput={openKeyboard} />}
        {view === 'vip' && <VipLounge onNavigate={navigate} onSuccess={setCurrentContactId} setNotify={setNotify} onFocusInput={openKeyboard} />}
        
        {view === 'staff-login' && <StaffLogin onBack={() => navigate('home')} onLoginSuccess={(name) => { setActiveStaff(name); navigate('staff-dashboard'); }} onFocusInput={openKeyboard} setNotify={setNotify} />}
        {view === 'staff-dashboard' && <StaffDashboard onLogout={() => { setActiveStaff(null); navigate('home'); }} staffName={activeStaff} setNotify={setNotify} onFocusInput={openKeyboard} />}
        
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