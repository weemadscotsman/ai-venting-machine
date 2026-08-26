const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/api/conversation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});

// Write 2MB of data
const payload = 'a'.repeat(2 * 1024 * 1024);
req.write(payload);
req.end();
