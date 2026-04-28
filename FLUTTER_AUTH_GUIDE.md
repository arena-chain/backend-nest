# Flutter Authentication Guide (NestJS Backend)

This guide explains how to integrate the new authentication features (OTP, Forgot Password, and Google Login) into your Flutter application.

## 📋 Table of Contents
1. [Setup & Dependencies](#1-setup--dependencies)
2. [Data Models](#2-data-models)
3. [Authentication Service](#3-authentication-service)
4. [Email Verification (OTP)](#4-email-verification-otp)
5. [Forgot Password Flow](#5-forgot-password-flow)
6. [Google Authentication](#6-google-authentication)

---

## 1. Setup & Dependencies

Add the following to your `pubspec.yaml`:

```yaml
dependencies:
  http: ^1.1.0
  google_sign_in: ^6.1.6
  shared_preferences: ^2.2.2 # For storing tokens
```

---

## 2. Data Models

Create a file `lib/models/auth_response.dart`:

```dart
class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final User? user;

  AuthResponse({required this.accessToken, required this.refreshToken, this.user});

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'],
      refreshToken: json['refreshToken'],
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }
}

class User {
  final String id;
  final String email;
  final String nickname;
  final String role;
  final bool isEmailVerified;

  User({
    required this.id,
    required this.email,
    required this.nickname,
    required this.role,
    required this.isEmailVerified,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      nickname: json['nickname'],
      role: json['role'],
      isEmailVerified: json['isEmailVerified'] ?? false,
    );
  }
}
```

---

## 3. Authentication Service

Create `lib/services/auth_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/auth_response.dart';

class AuthService {
  final String baseUrl = "http://localhost:3000/auth"; // Change for physical device

  // 1. Login
  Future<AuthResponse> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      return AuthResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(jsonDecode(response.body)['message']);
    }
  }

  // 2. Verify Email (OTP)
  Future<void> verifyEmail(String email, String otp) async {
    final response = await http.post(
      Uri.parse('$baseUrl/verify-email'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'otp': otp}),
    );

    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['message']);
    }
  }

  // 3. Forgot Password (Request OTP)
  Future<void> forgotPassword(String email) async {
    final response = await http.post(
      Uri.parse('$baseUrl/forgot-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email}),
    );

    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['message']);
    }
  }

  // 4. Reset Password
  Future<void> resetPassword(String email, String otp, String newPassword) async {
    final response = await http.post(
      Uri.parse('$baseUrl/reset-password'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      }),
    );

    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['message']);
    }
  }
}
```

---

## 4. Email Verification (OTP)

After registration, the backend automatically sends an email. 
1. Navigate the user to a "Verification Screen".
2. Collect the 6-digit code.
3. Call `authService.verifyEmail(email, otp)`.

---

## 5. Forgot Password Flow

1. **Step 1**: User enters email -> Call `authService.forgotPassword(email)`.
2. **Step 2**: Backend sends code -> User enters code and new password.
3. **Step 3**: Call `authService.resetPassword(email, otp, newPassword)`.

---

## 6. Google Authentication

For Google Auth, we use the "ID Token" strategy or the Redirect strategy. Since you are using a redirect on the backend, you can use a `WebView` or the `google_sign_in` package to get the data.

### Method: Using `google_sign_in` (Recommended)

1. **Configure Google Cloud Console**:
   - Add an **Android** and **iOS** OAuth Client ID in your Google Cloud Console.
   - Use the **Web Client ID** you provided in the `.env` for the `google_sign_in` configuration if needed.

2. **Flutter Code**:

```dart
import 'package:google_sign_in/google_sign_in.dart';

class GoogleAuthExample {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  Future<void> handleSignIn() async {
    try {
      // 1. Sign in with Google
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return; // User cancelled

      // 2. Get details
      final String email = googleUser.email;
      final String id = googleUser.id; // Correctly maps to googleId in backend
      final String name = googleUser.displayName ?? "";

      // 3. Send to your backend (Redirect logic usually handles this, 
      // but for mobile, you often call a direct social-login endpoint)
      
      // IMPORTANT: In your current backend configuration, the /auth/google/redirect 
      // expects a request from the Google OAuth flow. 
      // For Flutter, you should send the Google ID or ID Token to a specific mobile endpoint.
    } catch (error) {
      print(error);
    }
  }
}
```

### Recommendation for Mobile Google Auth:
The backend `google/redirect` is designed for Web Browsers. For Flutter, it is best to add a specific endpoint like `POST /auth/google/mobile` that accepts the `idToken` from Flutter and verifies it using the Google Auth library on the backend.

---
**Need help with specific UI implementation?** Let me know!
