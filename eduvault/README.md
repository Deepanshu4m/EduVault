# 🎓 EduVault

### A Full-Stack EdTech Platform — Learn, Teach & Grow

> EduVault is a production-ready MERN stack ed-tech platform where **students** can discover and purchase courses, track their progress, and leave reviews — while **instructors** can create, manage, and publish rich course content with video support.

## ✨ Features

**Students**
- Browse & search courses by category
- Secure course purchase via Razorpay
- Video player with progress tracking
- Rate & review enrolled courses

**Instructors**
- Create, edit & publish courses
- Upload media via Cloudinary
- Instructor dashboard with earnings & student stats

**Auth & Security**
- OTP-based email verification on signup
- JWT authentication
- Forgot password via secure email token
- Role-based access — Student / Instructor / Admin

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Redux Toolkit, React Router v6, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, Bcrypt |
| Media | Cloudinary |
| Payments | Razorpay |
| Email | Nodemailer (Gmail SMTP) |

## 🚀 Getting Started

### 1. Clone
```bash
git clone https://github.com/Deepanshu4m/EduVault.git
cd EduVault
```

### 2. Install Dependencies
```bash
npm install
cd server && npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` in both root and server folders and fill in your values.

### 4. Run
```bash
npm run dev
# Frontend → http://localhost:3000
# Backend  → http://localhost:4000
```

## 👤 Author
**Deepanshu** — [GitHub](https://github.com/Deepanshu4m)
