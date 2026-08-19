# Techzon CRM Dashboard

Techzon CRM is a comprehensive internal application for managing student leads, CR (Class Representative) relationships, employee performance, attendance, and company holidays.

## Tech Stack
- **Frontend**: React, Vite, TypeScript, TailwindCSS, React Query, Zustand
- **Backend**: Node.js, Express, MongoDB, Socket.IO, Nodemailer
- **Authentication**: JWT-based Role-Based Access Control (RBAC)

## Project Structure
- `/frontend` - Vite React frontend application.
- `/backend` - Node.js Express backend application.

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hari-2812/Techzon-Dashboard.git
   cd Techzon-Dashboard
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Update the .env file with your local MongoDB URI and JWT_SECRET
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   # Ensure VITE_API_URL points to your local backend (e.g., http://localhost:5001/api)
   npm run dev
   ```

## Production Deployment Architecture

This project is built to be deployed on modern cloud platforms.

### Recommended Providers
- **Frontend**: Vercel or Netlify
- **Backend**: Render, Heroku, or DigitalOcean App Platform
- **Database**: MongoDB Atlas

### Backend Production Setup
1. Deploy the `/backend` folder to your chosen Node.js hosting platform.
2. Ensure the build command is `npm install` and start command is `npm start`.
3. Configure the following environment variables on the server:
   - `NODE_ENV=production`
   - `PORT=5001` (Or automatically assigned by platform)
   - `MONGODB_URI` (Your MongoDB Atlas connection string)
   - `JWT_SECRET` (A strong, random 256-bit string)
   - `CLIENT_URL` (The production URL of the frontend, e.g., `https://crm.techzonwide.com`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (Your company email credentials for sending onboarding emails)

**Health Check**: Ensure the backend is running by navigating to `https://your-backend-url.com/api/health`.

### Frontend Production Setup
1. Deploy the `/frontend` folder to Vercel or Netlify.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set the environment variable:
   - `VITE_API_URL=https://your-backend-url.com/api`
5. Ensure Single Page Application (SPA) routing is configured on the host (e.g., rewriting `/*` to `/index.html`).

## Important Notes on Production
- **Local Uploads**: By default, the system stores employee profile photos locally in `/backend/uploads`. If deploying to an ephemeral serverless environment (like Vercel or standard Render Web Services), these files will be lost on restart. It is recommended to attach a Persistent Disk or implement a Cloudinary/AWS S3 integration before utilizing the photo upload feature in production.
- **Email Delivery**: The system relies on Nodemailer to send welcome emails with temporary passwords when an Admin creates a new employee. You **must** provide valid SMTP credentials in production, otherwise, the email will fail (though the employee will still be created, and the admin can click "Resend Invitation" later).
