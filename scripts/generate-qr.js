import QRCode from 'qrcode';
import { mkdir } from 'node:fs/promises';
const value=process.argv[2];
let url; try {url=new URL(value);} catch {throw new Error('Pass the verified production HTTPS URL: npm run qr -- https://your-host/');}
if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash) throw new Error('Use a stable HTTPS URL without credentials or query parameters.');
await mkdir('public',{recursive:true});
await QRCode.toFile('public/qr.png',url.href,{width:1000,margin:4,errorCorrectionLevel:'M',color:{dark:'#163e70',light:'#ffffff'}});
console.log('Print-ready QR saved to public/qr.png. Scan the printed copy before launch.');
