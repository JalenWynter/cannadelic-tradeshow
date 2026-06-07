export function qrLandingPageHtml(signupUrl, eventTitle) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#0a0a0c" />
  <title>GŪDESSENCE — Scan to Sign Up</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: #0a0a0c;
      background-image: radial-gradient(ellipse at 60% 40%, rgba(204,255,0,0.06) 0%, transparent 60%),
                        radial-gradient(ellipse at 20% 80%, rgba(255,0,127,0.05) 0%, transparent 50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
      color: #fff;
      padding: 40px 20px;
      gap: 36px;
    }
    .cannadelic-tag {
      font-size: 0.75rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(204,255,0,0.6);
      font-weight: 600;
    }
    .qr-frame {
      padding: 28px;
      border-radius: 24px;
      border: 2px solid rgba(204,255,0,0.25);
      background: rgba(255,255,255,0.03);
      box-shadow: 0 0 60px rgba(204,255,0,0.08);
    }
    .qr-frame img, .qr-frame canvas {
      display: block;
    }
    .cta-text {
      text-align: center;
      line-height: 1.15;
    }
    .cta-text .headline {
      font-size: clamp(1.8rem, 5vw, 2.8rem);
      font-weight: 800;
      color: #ccff00;
      letter-spacing: -0.5px;
    }
    .cta-text .sub {
      margin-top: 10px;
      font-size: clamp(1rem, 2.5vw, 1.3rem);
      color: rgba(255,255,255,0.7);
      font-weight: 400;
    }
    .cta-text .highlight {
      color: #ff007f;
      font-weight: 700;
    }
    .footer-note {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.25);
      text-align: center;
      max-width: 320px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <p class="cannadelic-tag">Cannadelic Night Market</p>
  <div class="qr-frame" id="qrContainer"></div>
  <div class="cta-text">
    <p class="headline">Sign up here</p>
    <p class="sub"><span class="highlight">Free popcorn</span> — scan with your phone</p>
  </div>
  <p class="footer-note">Open the QR link on your phone to sign up instantly. No app needed.</p>
  <script src="https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0-rc.1/lib/qr-code-styling.js"></script>
  <script>
    const qr = new QRCodeStyling({
      width: 260,
      height: 260,
      data: ${JSON.stringify(signupUrl)},
      dotsOptions: { color: '#ccff00', type: 'extra-rounded' },
      backgroundOptions: { color: '#0a0a0c' },
      cornersSquareOptions: { color: '#ff007f', type: 'dot' },
      cornersDotOptions: { color: '#ccff00', type: 'dot' },
    });
    qr.append(document.getElementById('qrContainer'));
  </script>
</body>
</html>`;
}