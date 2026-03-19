# Phase 1: Project Setup

## Context Links
- [Plan Overview](plan.md)

## Overview
- **Priority:** P1
- **Status:** pending
- **Description:** Initialize Node.js project, install dependencies, create folder structure, configure dev scripts.

## Requirements
- Node.js project with package.json
- All npm dependencies installed
- Folder structure matching plan.md
- Dev script with nodemon for hot reload
- .gitignore updated for node_modules, *.db

## Implementation Steps

1. Run `npm init -y` in project root
2. Install production deps:
   ```
   npm i express better-sqlite3 papaparse otpauth jsonwebtoken multer cors
   ```
3. Install dev deps:
   ```
   npm i -D nodemon
   ```
4. Add scripts to package.json:
   ```json
   "scripts": {
     "dev": "nodemon src/server.js",
     "start": "node src/server.js"
   }
   ```
5. Create directory structure:
   ```
   src/db/
   src/routes/
   src/services/
   src/public/js/
   src/public/css/
   ```
6. Create `src/server.js` skeleton:
   - Express app on port 3000 (or env PORT)
   - `express.static('src/public')`
   - `express.json()` middleware
   - CORS middleware
   - Mount route files
7. Update `.gitignore`: add `node_modules/`, `*.db`, `data/`

## Related Code Files
- **Create:** `package.json`, `src/server.js`, all directories above
- **Modify:** `.gitignore`

## Todo List
- [ ] npm init + install deps
- [ ] Create folder structure
- [ ] Create server.js skeleton
- [ ] Update .gitignore
- [ ] Verify `npm run dev` starts without errors

## Success Criteria
- `npm run dev` starts Express on port 3000
- Static files served from `src/public/`
- All route mount points registered (404 is fine, routes not yet built)
