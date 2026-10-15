/**
 * init_db.js – Seeds db.json with empty users and orders arrays.
 * Run once with: node init_db.js
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ users: [], orders: [] }, null, 2));
  console.log('✅ db.json created with empty users and orders.');
} else {
  console.log('ℹ️  db.json already exists – skipping creation.');
}
