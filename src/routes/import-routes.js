const { Router } = require('express');
const multer = require('multer');
const { importCSV } = require('../services/csv-import-service');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Import CSV file
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const csvContent = req.file.buffer.toString('utf-8');
    const results = importCSV(csvContent);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
