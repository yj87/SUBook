import dotenv from 'dotenv';
dotenv.config(); // Load .env before importing the app

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './index.js';
import venueRoutes from './routes/venues.js';

app.use('/api', venueRoutes);

describe('Backend Health Check', () => {
  it('should return 200 OK on the root route', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Backend is running!');
  });
}); 