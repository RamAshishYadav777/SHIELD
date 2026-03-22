const webpush = require('web-push');
const fs = require('fs');
const vapidKeys = webpush.generateVAPIDKeys();
const content = `PUSH_PUBLIC_KEY=${vapidKeys.publicKey}\nPUSH_PRIVATE_KEY=${vapidKeys.privateKey}`;
fs.writeFileSync('keys.txt', content);
console.log('Keys written to keys.txt');
