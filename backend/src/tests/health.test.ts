import request from 'supertest';
import express from 'express';

const app = express();
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

describe('GET /health', () => {
  it('should return UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'UP');
  });
});
