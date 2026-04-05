# SHIELD - Safety Platform

Emergency contact management and SOS alert system.

## Setup

1. Copy `.env.example` to `.env` in both `backend` and `frontend` folders.
2. Add your keys (MongoDB, Razorpay, etc).

## Run

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- SOS alert with live location
- Emergency contact slots (1st free, others unlockable)
- Neighborhood chat (based on GPS)
- Safe zone registration
- Real-time notifications via Socket.io
