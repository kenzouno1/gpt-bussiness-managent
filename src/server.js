const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database (runs schema migration)
require('./db/database');

const { requireAuth, requireAdmin } = require('./middleware/auth-middleware');
const authRoutes = require('./routes/auth-routes');
const userRoutes = require('./routes/user-routes');
const accountRoutes = require('./routes/account-routes');
const orgRoutes = require('./routes/org-routes');
const importRoutes = require('./routes/import-routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check (no auth)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public auth routes (no JWT needed)
app.use('/api/auth', authRoutes);

// Protect all other API routes with JWT
app.use('/api', requireAuth);

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/import', requireAdmin, importRoutes);
app.use('/api/users', userRoutes);

// SPA fallback — serve index.html for all non-API routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GPT Team Manager running on http://localhost:${PORT}`);

  // Start background schedulers after server is ready
  const { startAll } = require('./services/scheduler-manager');
  startAll();
});
