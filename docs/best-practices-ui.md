# UI and UX best practices (Cannadelic mobile QR)

## Staff approval

- **Two step confirm** instead of PIN on phone monitor (tap Approve, then "Are you sure?")
- **Always verify in person** before second tap (name + email or phone)
- Kiosk Staff Portal PIN stays for sensitive actions (VIP, wipe, etc.)

## Guest mobile signup

- **Hide form after submit**; show clear PENDING success state only
- **No network jargon** on guest screen (no LTE/WiFi copy)
- **Validation**: names 1 to 40 chars, email format + max 254, phone 10 to 15 digits
- **Require email or phone** (not both mandatory)

## Kiosk UI

- **Large touch targets** (min 44px height on buttons)
- **High contrast** status: green = live, red = fix config
- **No em dashes** in guest or staff facing copy
- **Virtual keyboard** draggable; opens below active field

## Accessibility

- Labels tied to inputs on mobile pages (`for` / `id`)
- `autocomplete` on name, email, tel fields
- `inputmode` for email and phone on mobile
- Status messages as text (not color alone): "PENDING", "Cloud relay live"
- Font size at least 16px on mobile inputs (prevents iOS zoom)

## Security and spam

- Server side validation mirrors client (relay + kiosk)
- Duplicate pending signup blocked (same email or phone per event)
- Rate limiting: add at CDN/Railway if abused (future)
- Staff monitor URL is unlisted; bookmark only, do not print publicly

## Show day operations

- Railway HTTPS relay (stable URL)
- Kiosk on staff hotspot; guests on any cell data
- Run `npm run validate:show` before leaving for venue
- Test one LTE signup + approve after setup

## Performance

- Kiosk polls relay every 4s (lightweight)
- Local DB remains source of truth for points and raffle
- Relay only queues signups between phone and kiosk
