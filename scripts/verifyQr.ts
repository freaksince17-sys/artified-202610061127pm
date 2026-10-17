import jsQR from 'jsqr';
import sharp from 'sharp';
import path from 'path';

async function verify() {
  const imgPath = path.resolve('public/esewa_qr.png');
  const { data, info } = await sharp(imgPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  if (code) {
    console.log('✅ jsQR Successfully Decoded QR Code!');
    console.log('Decoded Payload:', code.data);
  } else {
    console.error('❌ Could not decode QR code.');
  }
}

verify().catch(console.error);
