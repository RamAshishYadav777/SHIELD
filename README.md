# SHIELD
Real-time emergency management and location-based safety tools.

---

SHIELD is a full-stack safety platform designed to help people manage emergency contacts and broadcast SOS alerts when things go wrong. It uses live location tracking, web sockets for instant updates, and a neighborhood-based chat system.

## Core Features

- **SOS Alerts**: Send your live location to your contacts instantly.
- **Dynamic Contacts**: Keep up to 5 emergency contacts (1st is free, others can be unlocked via Razorpay).
- **Safe Zones**: Register locations where you feel safe and notify others when you enter/leave.
- **Neighborhood Chat**: A GPS-restricted chat room to connect with people nearby.
- **Push Notifications**: Real-time alerts even when the app is closed.

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, Socket.io-client.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io.
- **Services**: 
  - **Razorpay**: Payment gateway for premium slots.
  - **SendGrid**: Email alerts for SOS triggers.
  - **Cloudinary**: Profile and incident image hosting.
  - **Web Push**: VAPID-based push notifications.

## Project Structure

```text
SHIELD/
├── frontend/   # Next.js application
├── backend/    # Node.js API & Socket server
└── .env.example # Global environment template
```

## Quick Start

### 1. Set up Environment Variables
You'll need to configure `.env` files in both directories. Templates are provided:
- Copy `frontend/.env.example` to `frontend/.env.local`
- Copy `backend/.env.example` to `backend/.env`

### 2. Install & Run

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The app will be running at `http://localhost:3000` and the API at `http://localhost:5000`.

## Testing
- **SOS**: You can trigger a test SOS from the dashboard to see the live location broadcast.
- **Payment**: Use Razorpay test credentials to test the premium contact slot unlocking.
