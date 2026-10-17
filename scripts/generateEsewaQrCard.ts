import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

async function generateEsewaCard() {
  const payload = 'https://esewa.com.np/#/mobile_payment?mobile=9767573721&name=Sahina%20Shrestha';
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Generate crisp high-resolution QR PNG (1000x1000)
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    width: 1000,
    color: {
      dark: '#1C1B1A',
      light: '#FFFFFF'
    }
  });

  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(path.join(publicDir, 'esewa_qr.png'), base64Data, 'base64');
  console.log('✅ Generated crisp scannable QR PNG at /public/esewa_qr.png');
}

generateEsewaCard().catch(console.error);
