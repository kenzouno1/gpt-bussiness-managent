#!/usr/bin/env node
/**
 * Seed the first admin user.
 * Usage: ADMIN_PASSWORD=secret node src/scripts/seed-admin.js
 * Env vars: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 */
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const username = process.env.ADMIN_USERNAME || 'admin';
const email = process.env.ADMIN_EMAIL || 'admin@local.dev';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Error: ADMIN_PASSWORD env var is required');
  console.error('Usage: ADMIN_PASSWORD=secret node src/scripts/seed-admin.js');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log(`User "${username}" already exists (id=${existing.id}). Nothing to do.`);
  process.exit(0);
}

const password_hash = bcrypt.hashSync(password, 10);
const result = db.prepare(
  'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
).run(username, email, password_hash, 'admin');

console.log(`Admin user created: username="${username}", id=${result.lastInsertRowid}`);
