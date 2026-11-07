import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookings.js';
import venueRoutes from './routes/venues.js';

dotenv.config();

const app = express();

const rawFrontendOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : [];

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
];

const allowedOrigins = new Set([...defaultOrigins, ...rawFrontendOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server, test runners)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, '');

      try {
        const { hostname } = new URL(cleanOrigin);
        // Allow configured origins, any Vercel deployment (*.vercel.app), or localhost
        if (
          allowedOrigins.has(cleanOrigin) ||
          hostname.endsWith('.vercel.app') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1'
        ) {
          return callback(null, true);
        }
      } catch {
        // Fallback for non-standard origins
      }

      return callback(null, false);
    },
    credentials: true,
    // ADDED: Explicitly defined methods and headers to satisfy preflight tests
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());

app.get('/', (req, res) => res.send('Backend is running!'));
console.log("=== CHECKING ROUTES ===");
console.log("Booking Routes loaded:", typeof bookingRoutes);
console.log("=======================");
app.use('/api/bookings', bookingRoutes);
app.use('/api', venueRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;