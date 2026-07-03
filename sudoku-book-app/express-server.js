'use strict';
const express = require('express');
const path = require('path');

// Config
const port = process?.env?.PORT || 4200;

// Create app
const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json({limit: 8192}));

// Serve static files from the Angular app build folder
const distPath = path.join(__dirname, 'dist/sudoku-book-app/browser');
app.use(express.static(distPath));

// Fallback all other requests to index.html for Angular SPA routing
app.get(/.*/, (req, res) => {
	res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
app.listen(port, () => {
	console.log(`Express server listening on http://localhost:${port}`);
});
