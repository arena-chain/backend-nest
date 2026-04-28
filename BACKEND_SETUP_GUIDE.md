# 🚀 Backend Setup & Deployment Guide

## 📦 Installation

### Install Missing Dependencies

The backend needs the `google-auth-library` package for mobile Google authentication:

```bash
npm install google-auth-library
```

### Verify All Dependencies

```bash
npm install
```

---

## ⚙️ Configuration

### 1. Environment Variables

Ensure your `.env` file is properly configured:

```env
# SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=eya.boujnayah2020@gmail.com
MAIL_PASS=uwoh syqj xcix jgbr
MAIL_FROM="Academie Sportive" <eya.boujnayah2020@gmail.com>

# Google Auth
GOOGLE_CLIENT_ID=258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/redirect

# App Configuration
JWT_SECRET=super-secret-key-change-this
MONGO_URI=mongodb://localhost:27017/arenachain
FRONTEND_URL=http://localhost:3000
PORT=3000
```

### 2. Database Setup

Ensure MongoDB is running:

```bash
# Check if MongoDB is running
# Windows:
net start MongoDB

# Mac/Linux:
sudo systemctl start mongod
```

---

## 🏃 Running the Backend

### Development Mode (Recommended)

```bash
npm run start:dev
```

**Expected output:**
```
🚀 Application is running!
📍 Local: http://localhost:3000
📍 Network: http://0.0.0.0:3000
📚 Swagger API: http://localhost:3000/api

💡 For physical devices, use your computer's IP address instead of localhost
   Example: http://192.168.1.X:3000
```

### Production Mode

```bash
# Build
npm run build

# Start
npm run start:prod
```

---

## 🌐 Network Configuration

### Find Your Computer's IP Address

**Windows (PowerShell):**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Example output:** `192.168.1.100`

### Configure Firewall

**Windows:**
```powershell
# Allow port 3000 through firewall
netsh advfirewall firewall add rule name="NestJS Backend" dir=in action=allow protocol=TCP localport=3000
```

**Mac:**
```bash
# Firewall should prompt automatically, or configure in System Preferences > Security & Privacy
```

**Linux:**
```bash
sudo ufw allow 3000/tcp
```

---

## 🧪 Testing the Backend

### 1. Test Locally

Open browser and navigate to:
```
http://localhost:3000/api
```

You should see the Swagger API documentation.

### 2. Test from Phone

**Prerequisites:**
- Phone and computer must be on the **same WiFi network**
- Firewall must allow port 3000

**From your phone's browser**, navigate to:
```
http://YOUR_IP_ADDRESS:3000/api
```

Replace `YOUR_IP_ADDRESS` with your computer's IP (e.g., `192.168.1.100`)

**✅ Success:** You see the Swagger API documentation
**❌ Failed:** "Can't connect" or timeout error

### 3. Test API Endpoints

Using Swagger UI at `http://YOUR_IP:3000/api`, test:

#### Register Player
- Endpoint: `POST /auth/register/player`
- Body:
```json
{
  "email": "test@example.com",
  "password": "Test123!",
  "nickname": "TestUser",
  "isPro": false,
  "isVerified": false
}
```

#### Login
- Endpoint: `POST /auth/login`
- Body:
```json
{
  "email": "test@example.com",
  "password": "Test123!"
}
```

#### Google Mobile Auth
- Endpoint: `POST /auth/google/mobile`
- Body:
```json
{
  "idToken": "YOUR_GOOGLE_ID_TOKEN_FROM_FLUTTER"
}
```

---

## 📊 Monitoring & Debugging

### View Backend Logs

The backend console will show:
- Incoming requests
- Email sending status
- Database operations
- Errors and warnings

**Example logs:**
```
[Nest] 12345  - 02/06/2026, 4:21:00 PM     LOG [MailService] Email sent successfully to test@example.com
[Nest] 12345  - 02/06/2026, 4:21:05 PM     LOG [AuthService] User registered: test@example.com
```

### Common Issues

#### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

#### MongoDB Connection Failed

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
1. Ensure MongoDB is running
2. Check `MONGO_URI` in `.env`
3. Verify MongoDB service status

#### Email Not Sending

**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`

**Solution:**
1. Use Gmail **App Password**, not regular password
2. Generate at: https://myaccount.google.com/apppasswords
3. Update `MAIL_PASS` in `.env`

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS/TLS
- [ ] Restrict CORS origins (currently allows all)
- [ ] Add rate limiting
- [ ] Implement request validation
- [ ] Set up logging and monitoring
- [ ] Use secure password hashing (already using bcrypt)
- [ ] Protect sensitive endpoints with authentication

---

## 📝 API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register/player` | Register new player |
| POST | `/auth/register/team-manager` | Register team manager |
| POST | `/auth/register/referee` | Register referee |
| POST | `/auth/register/admin` | Register admin |
| POST | `/auth/login` | Login user |
| POST | `/auth/verify-email` | Verify email with OTP |
| POST | `/auth/resend-otp` | Resend verification OTP |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with OTP |
| GET | `/auth/google` | Google OAuth (web) |
| GET | `/auth/google/redirect` | Google OAuth callback |
| POST | `/auth/google/mobile` | **Google Sign-In (mobile)** |

---

## 🎯 Flutter Integration Checklist

For Flutter app to work with this backend:

- [ ] Backend running on `0.0.0.0:3000`
- [ ] Firewall allows port 3000
- [ ] Can access Swagger from phone browser
- [ ] Flutter app uses correct IP address
- [ ] Google OAuth client created for Android
- [ ] SHA-1 certificate added to Google Cloud Console
- [ ] `google-auth-library` package installed
- [ ] CORS enabled (already configured)

---

## 📚 Related Documentation

- `QUICK_FIX_AUTH_ERRORS.md` - Quick fixes for common errors
- `FLUTTER_CONFIG_COMPLETE.md` - Complete Flutter configuration
- `FLUTTER_AUTH_GUIDE.md` - Original auth guide
- `PLAYER_AUTH_API.md` - Detailed API documentation

---

## 🆘 Troubleshooting

### Backend not accessible from phone

1. **Check same WiFi network**
   ```bash
   # On computer, check network
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. **Test connectivity**
   ```bash
   # From phone browser
   http://YOUR_IP:3000/api
   ```

3. **Check firewall**
   ```powershell
   # Windows - List firewall rules
   netsh advfirewall firewall show rule name=all | findstr 3000
   ```

### Google Auth not working

1. **Verify environment variables**
   ```bash
   # Check .env file
   cat .env | grep GOOGLE
   ```

2. **Test Google token verification**
   - Use Swagger UI
   - POST to `/auth/google/mobile`
   - Check backend logs for errors

### Email not sending

1. **Check SMTP configuration**
   ```bash
   # Verify .env
   cat .env | grep MAIL
   ```

2. **Test email service**
   - Register a new user
   - Check backend logs for email status
   - Check spam folder

---

## 🔄 Quick Restart

If you make changes to the code:

```bash
# Stop backend (Ctrl+C)

# Restart in dev mode
npm run start:dev
```

**Note:** Changes to `.env` require a restart!

---

**Last Updated:** 2026-02-06
**Version:** 1.0.0
**Status:** Production Ready
