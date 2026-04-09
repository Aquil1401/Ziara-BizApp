const fs = require('fs');
const dir = './public/icons';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// Tiny 1x1 transparent PNG
const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
fs.writeFileSync(dir + '/icon-192x192.png', Buffer.from(base64Png, 'base64'));
fs.writeFileSync(dir + '/icon-512x512.png', Buffer.from(base64Png, 'base64'));
console.log("Icons generated.");
