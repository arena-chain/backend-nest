# Flutter Frontend Guide: Implementing Channel Creation

This guide explains how to implement the "Create Channel" feature in your Flutter app, linking it to the logged-in User.

## 1. Prerequisites (State Management)
You need to have the logged-in user's ID stored in your app state (e.g., using `Provider`, `Riverpod`, or `SharedPreferences`) after a successful login.

**Example `UserProvider` (Simplified):**
```dart
class UserProvider with ChangeNotifier {
  String? _userId;
  String? get userId => _userId;

  void setUser(String id) {
    _userId = id;
    notifyListeners();
  }
}
```

## 2. API Service (`channel_service.dart`)
Create a service to handle the HTTP call.

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class ChannelService {
  final String baseUrl = 'http://localhost:3000'; // Replace with your IP for emulator

  Future<bool> createChannel({
    required String name,
    required String description,
    required String ownerId,
    String? bannerUrl,
  }) async {
    final url = Uri.parse('$baseUrl/channel');
    
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'description': description,
          'ownerId': ownerId, // CRITICAL: Linking User to Channel
          'bannerUrl': bannerUrl,
        }),
      );

      if (response.statusCode == 201) {
        return true;
      } else {
        print('Failed to create channel: ${response.body}');
        return false;
      }
    } catch (e) {
      print('Error creating channel: $e');
      return false;
    }
  }
}
```

## 3. Create Channel Screen (`create_channel_screen.dart`)
A simple form to collect channel details.

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/channel_service.dart';
import '../providers/user_provider.dart'; // Import your user provider

class CreateChannelScreen extends StatefulWidget {
  @override
  _CreateChannelScreenState createState() => _CreateChannelScreenState();
}

class _CreateChannelScreenState extends State<CreateChannelScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final ChannelService _channelService = ChannelService();
  bool _isLoading = false;

  Future<void> _submit() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);

      // Get logged-in user ID
      final userId = Provider.of<UserProvider>(context, listen: false).userId;
      
      if (userId == null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: specific user not found')));
        setState(() => _isLoading = false);
        return;
      }

      final success = await _channelService.createChannel(
        name: _nameController.text,
        description: _descController.text,
        ownerId: userId,
      );

      setState(() => _isLoading = false);

      if (success) {
        Navigator.pop(context); // Go back or to the new channel
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Channel Created!')));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to create channel')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Create Your Channel')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(labelText: 'Channel Name'),
                validator: (val) => val!.isEmpty ? 'Name is required' : null,
              ),
              SizedBox(height: 16),
              TextFormField(
                controller: _descController,
                decoration: InputDecoration(labelText: 'Description'),
                maxLines: 3,
              ),
              SizedBox(height: 24),
              _isLoading 
                  ? CircularProgressIndicator()
                  : ElevatedButton(
                      onPressed: _submit,
                      child: Text('Create Channel'),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Key Concept
The **User** and **Channel** are related by the `ownerId`.
1.  **Backend**: `Channel` schema has `ownerId: Types.ObjectId`.
2.  **Frontend**: You MUST send the `ownerId` in the POST body.
3.  **Security**: Ideally, the backend should extract `ownerId` from the JWT token (req.user.id), but for now, sending it explicitly from the frontend works as per your current DTO.
