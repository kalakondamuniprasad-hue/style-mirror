import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/backend_config.dart';
import 'core/secure_auth_storage.dart';
import 'style_mirror_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadPreferences();
  const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  if (supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty) {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authOptions: FlutterAuthClientOptions(
        asyncStorage: SecureAuthStorage(),
      ),
    );
    backendConfigured = true;
  }

  runApp(const ProviderScope(child: StyleMirrorApp()));
}
