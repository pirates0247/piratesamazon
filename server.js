/**
 * server.js – Express backend for Pirates Amazon
 * Storage : Static file server only (orders are now in localStorage)
 */
const express = require('express');
const path    = require('path');
const cors    = require('cors');

// ── App ──────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, '.')));

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
