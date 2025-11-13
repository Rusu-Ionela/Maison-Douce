// Add to backend/middleware/sanitize.js
const sanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

app.use(sanitize());
app.use(xss());