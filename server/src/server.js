import 'dotenv/config';
import app from './app.js';
import { authConfigured, databaseConfigured } from './config/env.js';

const port = Number(process.env.PORT || 4000);
if (!databaseConfigured()) console.warn('CARE360: DATABASE_URL is missing or still a sample value. Server and Explore Demo can run; real accounts need PostgreSQL configuration.');
else if (!authConfigured()) console.warn('CARE360: JWT_SECRET must be replaced with a private random value of at least 32 characters before real accounts can be used.');
const server = app.listen(port, () => console.log('CARE360 API listening on http://localhost:' + port));
server.on('error', error => {
  console.error('CARE360 API failed to start:', error.code === 'EADDRINUSE' ? 'Port ' + port + ' is already in use.' : error.message);
  process.exit(1);
});
