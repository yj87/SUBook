import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookings.js';
import venueRoutes from './routes/venues.js';

dotenv.config();

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

app.get('/', (req, res) => res.send('Backend is running!'));
console.log("=== CHECKING ROUTES ===");
console.log("Booking Routes loaded:", typeof bookingRoutes);
console.log("=======================");
app.use('/api', bookingRoutes);
app.use('/api', venueRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
