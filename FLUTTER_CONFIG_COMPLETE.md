# 📱 Flutter App Configuration Guide

## 🎯 Overview

This guide shows you exactly how to configure your Flutter app to connect to the NestJS backend and enable Google Sign-In.

---

## 📍 STEP 1: Update API Base URL

### Find Your Computer's IP Address

**Windows (PowerShell):**
```powershell
ipconfig
```

**Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Example output:** `192.168.1.100`

### Update Flutter App Configuration

**Option A: If you have a constants file**

Look for a file like:
- `lib/constants/api_constants.dart`
- `lib/config/api_config.dart`
- `lib/core/constants.dart`

**Update:**
```dart
class ApiConstants {
  // OLD - Only works for Android Emulator
  // static const String baseUrl = 'http://10.0.2.2:3000';
  
  // NEW - Works for physical devices
  static const String baseUrl = 'http://192.168.1.100:3000'; // Use YOUR IP
}
```

**Option B: If you have an API service file**

Look for files like:
- `lib/services/api_service.dart`
- `lib/core/api/auth_api.dart`
- `lib/network/api_client.dart`

**Update:**
```dart
class ApiService {
  // OLD
  // final String baseUrl = 'http://10.0.2.2:3000';
  
  // NEW
  final String baseUrl = 'http://192.168.1.100:3000'; // Use YOUR IP
}
```

**Option C: If using environment variables**

Look for `.env` file in your Flutter project root:

```env
# OLD
# API_BASE_URL=http://10.0.2.2:3000

# NEW
API_BASE_URL=http://192.168.1.100:3000
```

---

## 🔐 STEP 2: Configure Google Sign-In

### A. Install Dependencies

**File:** `pubspec.yaml`

```yaml
dependencies:
  flutter:
    sdk: flutter
  google_sign_in: ^6.1.6
  http: ^1.1.0
  shared_preferences: ^2.2.2
```

**Run:**
```bash
flutter pub get
```

### B. Generate SHA-1 Certificate

**Navigate to android folder:**
```bash
cd android
```

**Generate SHA-1:**
```bash
# Windows
.\gradlew signingReport

# Mac/Linux
./gradlew signingReport
```

**Copy the SHA-1** from the output under `Variant: debug` → `SHA1`:
```
SHA1: A1:B2:C3:D4:E5:F6:...
```

### C. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**

#### Create Android OAuth Client

- Click **+ CREATE CREDENTIALS** → **OAuth client ID**
- Application type: **Android**
- Name: `Arena Chain Android`
- Package name: Find in `android/app/build.gradle`:
  ```gradle
  defaultConfig {
      applicationId "com.example.arenachain" // This is your package name
  }
  ```
- SHA-1 certificate fingerprint: Paste from step B
- Click **CREATE**

#### Verify Web OAuth Client

Make sure you have a Web client ID (already in your backend `.env`):
```
258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com
```

### D. Update Flutter Google Sign-In Code

**Find your Google Sign-In initialization** (usually in a service or viewmodel file):

**BEFORE:**
```dart
final GoogleSignIn _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
);
```

**AFTER:**
```dart
final GoogleSignIn _googleSignIn = GoogleSignIn(
  scopes: ['email', 'profile'],
  serverClientId: '258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com',
);
```

### E. Implement Google Sign-In Flow

**Example implementation:**

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    serverClientId: '258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com',
  );

  Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      // 1. Trigger Google Sign-In
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        // User cancelled
        return null;
      }

      // 2. Get authentication details
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      
      // 3. Get ID token
      final String? idToken = googleAuth.idToken;
      
      if (idToken == null) {
        throw Exception('Failed to get ID token');
      }

      // 4. Send to backend
      final response = await http.post(
        Uri.parse('http://192.168.1.100:3000/auth/google/mobile'), // Use YOUR IP
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Backend authentication failed: ${response.body}');
      }
    } catch (error) {
      print('Google Sign-In Error: $error');
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
  }
}
```

---

## 🔧 STEP 3: Backend Endpoint for Mobile Google Auth

The current backend uses web-based Google OAuth redirect flow. For mobile apps, we need a direct endpoint.

**Add this to your backend** (if not already present):

**File:** `src/auth/auth.controller.ts`

```typescript
@Post('google/mobile')
@ApiOperation({ summary: 'Google Sign-In for mobile apps' })
async googleMobileAuth(@Body() body: { idToken: string }) {
  return this.authService.googleMobileLogin(body.idToken);
}
```

**File:** `src/auth/auth.service.ts`

```typescript
import { OAuth2Client } from 'google-auth-library';

async googleMobileLogin(idToken: string) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Find or create user
    let user = await this.userModel.findOne({ email: payload.email });
    
    if (!user) {
      user = await this.userModel.create({
        email: payload.email,
        nickname: payload.name || payload.email.split('@')[0],
        googleId: payload.sub,
        isEmailVerified: true,
        role: 'player',
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);
    
    return {
      ...tokens,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
      },
    };
  } catch (error) {
    throw new UnauthorizedException('Google authentication failed');
  }
}
```

---

## 📝 STEP 4: Complete Auth Service Example

**File:** `lib/services/auth_service.dart`

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  // CHANGE THIS TO YOUR COMPUTER'S IP
  static const String baseUrl = 'http://192.168.1.100:3000';
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    serverClientId: '258917578177-fnjlpkqdthcvr2r4ibruccodtugnuf0e.apps.googleusercontent.com',
  );

  // Register Player
  Future<Map<String, dynamic>> registerPlayer({
    required String email,
    required String password,
    required String nickname,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register/player'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'nickname': nickname,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Registration failed');
    }
  }

  // Login
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await _saveTokens(data['accessToken'], data['refreshToken']);
      return data;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Login failed');
    }
  }

  // Verify Email
  Future<void> verifyEmail({
    required String email,
    required String otp,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/verify-email'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'otp': otp,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Verification failed');
    }
  }

  // Forgot Password
  Future<void> forgotPassword(String email) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Request failed');
    }
  }

  // Reset Password
  Future<void> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final error = jsonDecode(response.body);
      throw Exception(error['message'] ?? 'Password reset failed');
    }
  }

  // Google Sign-In
  Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) return null;

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;
      
      if (idToken == null) {
        throw Exception('Failed to get ID token');
      }

      final response = await http.post(
        Uri.parse('$baseUrl/auth/google/mobile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': idToken}),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        await _saveTokens(data['accessToken'], data['refreshToken']);
        return data;
      } else {
        throw Exception('Google authentication failed');
      }
    } catch (error) {
      print('Google Sign-In Error: $error');
      rethrow;
    }
  }

  // Sign Out
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
  }

  // Save tokens
  Future<void> _saveTokens(String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', accessToken);
    await prefs.setString('refreshToken', refreshToken);
  }

  // Get access token
  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('accessToken');
  }
}
```

---

## 🧪 TESTING CHECKLIST

### Before Testing

- [ ] Backend is running on `0.0.0.0:3000`
- [ ] Can access `http://YOUR_IP:3000/api` from phone browser
- [ ] Updated Flutter base URL to your computer's IP
- [ ] Restarted Flutter app (NOT just hot reload)
- [ ] Phone and computer on same WiFi network

### Test Registration

```dart
try {
  final result = await authService.registerPlayer(
    email: 'test@example.com',
    password: 'Test123!',
    nickname: 'TestUser',
  );
  print('Registration successful: $result');
} catch (e) {
  print('Registration failed: $e');
}
```

### Test Login

```dart
try {
  final result = await authService.login(
    email: 'test@example.com',
    password: 'Test123!',
  );
  print('Login successful: $result');
} catch (e) {
  print('Login failed: $e');
}
```

### Test Google Sign-In

```dart
try {
  final result = await authService.signInWithGoogle();
  if (result != null) {
    print('Google Sign-In successful: $result');
  } else {
    print('User cancelled Google Sign-In');
  }
} catch (e) {
  print('Google Sign-In failed: $e');
}
```

---

## 🚨 COMMON ERRORS & SOLUTIONS

### Error: Connection Timeout

**Cause:** Backend not accessible from phone

**Solutions:**
1. Verify backend is running
2. Check firewall settings
3. Ensure same WiFi network
4. Test from phone browser: `http://YOUR_IP:3000/api`

### Error: PlatformException(sign_in_failed, ApiException: 10)

**Cause:** Google Sign-In misconfigured

**Solutions:**
1. Verify SHA-1 is correct
2. Check package name matches
3. Ensure Android OAuth client created
4. Add `serverClientId` to GoogleSignIn

### Error: Invalid OTP

**Cause:** OTP expired or incorrect

**Solutions:**
1. Check email (including spam)
2. Request new OTP (resend-otp endpoint)
3. Verify email is correct

### Error: 401 Unauthorized

**Cause:** Invalid credentials or token

**Solutions:**
1. Verify email/password are correct
2. Check if email is verified
3. Ensure token is being sent in headers

---

## 📚 RELATED FILES

- `QUICK_FIX_AUTH_ERRORS.md` - Quick fix guide
- `FLUTTER_AUTH_GUIDE.md` - Original auth guide
- `PLAYER_AUTH_API.md` - Backend API documentation

---

**Last Updated:** 2026-02-06
**Status:** Ready to implement
