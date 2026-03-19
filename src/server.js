const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database (runs schema migration)
require('./db/database');

const accountRoutes = require('./routes/account-routes');
const orgRoutes = require('./routes/org-routes');
const importRoutes = require('./routes/import-routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/accounts', accountRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/import', importRoutes);

app.listen(PORT, () => {
  console.log(`GPT Team Manager running on http://localhost:${PORT}`);
});
