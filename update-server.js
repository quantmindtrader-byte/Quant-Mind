const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;
const UPDATES_DIR = path.join(__dirname, 'dist');

app.use(cors());
app.use(express.static(UPDATES_DIR));

// Serve latest.yml for update checks
app.get('/updates/latest.yml', (req, res) => {
  const latestPath = path.join(UPDATES_DIR, 'latest.yml');
  if (fs.existsSync(latestPath)) {
    res.sendFile(latestPath);
  } else {
    res.status(404).send('No updates available');
  }
});

// Serve update files
app.get('/updates/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPDATES_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// List available updates
app.get('/updates', (req, res) => {
  try {
    const files = fs.readdirSync(UPDATES_DIR);
    const updateFiles = files.filter(file => 
      file.endsWith('.exe') || 
      file.endsWith('.yml') || 
      file.endsWith('.blockmap')
    );
    res.json({ files: updateFiles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list updates' });
  }
});

app.listen(PORT, () => {
  console.log(`Update server running on http://localhost:${PORT}`);
  console.log(`Updates directory: ${UPDATES_DIR}`);
});

module.exports = app;