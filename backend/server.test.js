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

  it('should allow CORS requests from vercel.app domains', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'https://subook-deployment.vercel.app');
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://subook-deployment.vercel.app');
  });

  it('should allow CORS requests from localhost:5173', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'http://localhost:5173');
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('should not allow CORS headers for unallowed origins', async () => {
    const res = await request(app)
      .get('/')
      .set('Origin', 'https://unauthorized-site.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
}); 