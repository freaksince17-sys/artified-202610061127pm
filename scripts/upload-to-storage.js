import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const storage = getStorage(app);

const files = [
  'DdMRgKdP4HK.mp4',
  'DdIUMC4BqFr.mp4',
  'DY6OqqfPyJu.mp4',
  'DdjhhazvaRr.mp4',
];

async function main() {
  console.log('Uploading videos to bucket:', config.storageBucket);
  for (const f of files) {
    const localPath = `./public/instagram_videos/${f}`;
    if (!fs.existsSync(localPath)) {
      console.log('Missing:', localPath);
      continue;
    }
    const buf = fs.readFileSync(localPath);
    console.log(`Uploading ${f} (${buf.length} bytes)...`);
    const storageRef = ref(storage, `instagram_videos/${f}`);
    try {
      const snap = await uploadBytes(storageRef, buf, { contentType: 'video/mp4' });
      const url = await getDownloadURL(snap.ref);
      console.log(`SUCCESS ${f}:`, url);
    } catch (err) {
      console.error(`FAILED ${f}:`, err.message);
    }
  }
}

main();
