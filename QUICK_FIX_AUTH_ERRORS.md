# 🚀 QUICK FIX: Authentication Errors

## 📱 Problem Summary

Your Flutter app is showing two main errors:
1. **Connection Timeout** - Can't reach backend at `10.0.2.2:3000`
2. **Google Sign-In Failed** - API Exception error code 10

---

## ✅ STEP 1: Fix Backend Connection (CRITICAL - Do This First!)

### Problem
The Flutter app is using `10.0.2.2:3000` which ONLY works for Android Emulator, NOT physical devices.

### Solution

#### A. Find Your Computer's IP Address

**On Windows (PowerShell):**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (WiFi or Ethernet).
Example: `192.168.1.100`

**On Mac/Linux:**
```bash
ifconfig | grep "inet "
```

#### B. Update Backend to Listen on All Interfaces

The backend is currently configured to listen on `localhost` only. We need to change it to `0.0.0.0` to accept connections from your phone.

**File:** `src/main.ts` (Line 35)

**Change from:**
```typescript
await app.listen(process.env.PORT ?? 3000);
```

**Change to:**
```typescript
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

#### C. Restart Backend

```bash
# Stop current backend (Ctrl+C)
# Then restart:
npm run start:dev
```

You should see:
```
Application is running on: http://localhost:3000
```

#### D. Test Backend is Accessible

**From your phone's browser**, navigate to:
```
http://YOUR_IP_ADDRESS:3000/api
```

Replace `YOUR_IP_ADDRESS` with the IP you found in step A.

**Example:** `http://192.168.1.100:3000/api`

✅ **You should see the Swagger API documentation page**
❌ **If you see "Can't connect" - check firewall settings**

#### E. Update Flutter App Base URL

**Location:** Your Flutter app's API configuration file

**Find the file that contains:**
```dart
static const String baseUrl = 'http://10.0.2.2:3000';
```

**Change to:**
```dart
static const String baseUrl = 'http://YOUR_IP_ADDRESS:3000';
```

**Example:**
```dart
static const String baseUrl = 'http://192.168.1.100:3000';
```

#### F. Restart Flutter App

```bash
# Hot reload WON'T work for this change
# You MUST restart the app:
flutter run
```

---

## ✅ STEP 2: Fix Google Sign-In

### Problem
Error code 10 = `DEVELOPER_ERROR` - Google Sign-In not properly configured.

### Solution

#### A. Generate SHA-1 Certificate Fingerprint

**Navigate to your Flutter app's android folder:**
```bash
cd your_flutter_app/android
```

**Generate SHA-1:**
```bash
# On Windows:
.\gradlew signingReport

# On Mac/Linux:
./gradlew signingReport
```

**Copy the SHA-1 fingerprint** from the output (looks like: `A1:B2:C3:D4:...`)

#### B. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**

#### C. Create OAuth 2.0 Client IDs

You need **TWO** client IDs:

**1. Android Client ID:**
- Click **+ CREATE CREDENTIALS** → **OAuth client ID**
- Application type: **Android**
- Name: `Arena Chain Android`
- Package name: Your app's package name (e.g., `com.arenachain.app`)
- SHA-1 certificate fingerprint: Paste the SHA-1 from step A
- Click **CREATE**

**2. Web Client ID (Already exists in your .env):**
- Your existing Web Client ID: `258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com`
- Make sure this is still active in Google Cloud Console

#### D. Update Flutter App

**Find your Google Sign-In configuration in Flutter:**

**Current code (likely):**
```dart
final GoogleSignIn _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
);
```

**Update to:**
```dart
final GoogleSignIn _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
  serverClientId: '258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com',
);
```

#### E. Rebuild Flutter App

```bash
# Clean build
flutter clean
flutter pub get

# Rebuild
flutter run
```

---

## 🧪 TESTING

### Test 1: Registration
1. Open Flutter app
2. Go to "Create Account"
3. Fill in details:
   - Email: `test@example.com`
   - Password: `Test123!`
   - Nickname: `TestUser`
4. Click "Create Account"

**Expected:** Success message or verification screen
**Not:** Connection timeout error

### Test 2: Email Verification
1. Check email inbox (including spam)
2. Find 6-digit OTP code
3. Enter code in app
4. Click "Verify"

**Expected:** Email verified, navigate to login
**Not:** Invalid OTP error

### Test 3: Login
1. Enter credentials
2. Click "Sign In"

**Expected:** Navigate to home screen
**Not:** Connection error

### Test 4: Google Sign-In
1. Click "Continue with Google"
2. Select Google account
3. Grant permissions

**Expected:** Navigate to home screen
**Not:** API Exception error

---

## 🔥 TROUBLESHOOTING

### Backend Connection Still Failing

**Check 1: Firewall**
```powershell
# Windows - Allow port 3000
netsh advfirewall firewall add rule name="Node 3000" dir=in action=allow protocol=TCP localport=3000
```

**Check 2: Same WiFi Network**
- Ensure phone and computer are on the SAME WiFi network
- Corporate/school networks may block device-to-device communication

**Check 3: Backend is Running**
```bash
# Check if backend is running
curl http://localhost:3000/api
```

### Google Sign-In Still Failing

**Check 1: Package Name**
- Verify package name in `android/app/build.gradle` matches Google Cloud Console
- Look for `applicationId "com.example.app"`

**Check 2: SHA-1**
- Make sure you used the correct SHA-1 (debug vs release)
- For development, use the **debug** SHA-1

**Check 3: OAuth Consent Screen**
- In Google Cloud Console, configure OAuth consent screen
- Add test users if app is in testing mode

### Email Not Sending

**Check 1: Gmail App Password**
- The password in `.env` should be an **App Password**, not your regular Gmail password
- Generate at: https://myaccount.google.com/apppasswords

**Check 2: Backend Logs**
```bash
# Check backend console for email errors
# Should show: "Email sent successfully to..."
```

---

## 📋 CHECKLIST

Before testing, ensure:

- [ ] Found computer's IP address
- [ ] Updated `src/main.ts` to listen on `0.0.0.0`
- [ ] Restarted backend
- [ ] Tested backend from phone browser (`http://YOUR_IP:3000/api`)
- [ ] Updated Flutter app base URL to use computer's IP
- [ ] Restarted Flutter app (NOT just hot reload)
- [ ] Generated SHA-1 fingerprint
- [ ] Created Android OAuth client in Google Cloud Console
- [ ] Added `serverClientId` to Flutter Google Sign-In
- [ ] Rebuilt Flutter app (`flutter clean && flutter run`)

---

## 🎯 SUCCESS CRITERIA

After completing all steps, you should be able to:

✅ Register new account from Flutter app
✅ Receive verification email
✅ Verify email with OTP
✅ Login with credentials
✅ Use "Forgot Password" flow
✅ Sign in with Google
✅ Navigate to home screen after authentication

---

## 📞 NEED HELP?

If you're still stuck after following this guide:

1. **Check backend logs** for error messages
2. **Check Flutter console** for detailed error messages
3. **Test each endpoint** individually using Swagger UI at `http://YOUR_IP:3000/api`
4. **Verify network connectivity** between phone and computer

---

## 🔗 RELATED FILES

- `FLUTTER_AUTH_GUIDE.md` - Complete Flutter integration guide
- `PLAYER_AUTH_API.md` - Backend API documentation
- `.env` - Backend configuration
- `src/main.ts` - Backend entry point

---

**Last Updated:** 2026-02-06
**Status:** Ready to implement
