import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/backend_config.dart';
import 'core/project.dart';
import 'core/project_store.dart';
import 'features/auth/auth_screens.dart';
import 'features/editor/editor_screen.dart';
import 'features/home/home_screen.dart';
import 'features/import/import_screen.dart';
import 'features/projects/projects_screen.dart';
import 'features/settings/settings_screen.dart';

final projectStoreProvider =
    Provider<ProjectStore>((_) => ProjectStore.instance);
final themeModeProvider = StateProvider<ThemeMode>((_) {
  final value = _initialPreferences?.getString('theme_mode');
  return ThemeMode.values.firstWhere(
    (mode) => mode.name == value,
    orElse: () => ThemeMode.dark,
  );
});
final exportQualityProvider = StateProvider<int>(
  (_) => _initialPreferences?.getInt('export_quality') ?? 88,
);
SharedPreferences? _initialPreferences;

Future<void> loadPreferences() async {
  _initialPreferences = await SharedPreferences.getInstance();
}

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    if (backendConfigured) {
      _subscription =
          Supabase.instance.client.auth.onAuthStateChange.listen((_) {
        notifyListeners();
      });
    }
  }

  StreamSubscription<AuthState>? _subscription;

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final _authRefresh = _AuthRefresh();
final _router = GoRouter(
  initialLocation: '/',
  refreshListenable: _authRefresh,
  redirect: (context, state) {
    final configured = backendConfigured;
    final signedIn =
        configured && Supabase.instance.client.auth.currentSession != null;
    final isPublic = state.matchedLocation.startsWith('/auth') ||
        state.matchedLocation == '/setup';
    if (!configured && state.matchedLocation != '/setup') return '/setup';
    if (configured && !signedIn && !isPublic) return '/auth';
    if (signedIn && isPublic) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/', redirect: (_, __) => '/home'),
    GoRoute(path: '/setup', builder: (_, __) => const SetupScreen()),
    GoRoute(path: '/auth', builder: (_, __) => const WelcomeScreen()),
    GoRoute(path: '/auth/sign-in', builder: (_, __) => const SignInScreen()),
    GoRoute(path: '/auth/sign-up', builder: (_, __) => const SignUpScreen()),
    GoRoute(path: '/auth/reset', builder: (_, __) => const ResetPasswordScreen()),
    GoRoute(
      path: '/auth/verify',
      builder: (_, __) => const VerifyEmailScreen(),
    ),
    GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/projects', builder: (_, __) => const ProjectsScreen()),
    GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    GoRoute(
      path: '/import/:kind',
      builder: (_, state) => ImportScreen(
        kind: MediaKind.values.byName(state.pathParameters['kind']!),
      ),
    ),
    GoRoute(
      path: '/editor/:id',
      builder: (_, state) => EditorScreen(
        projectId: state.pathParameters['id']!,
      ),
    ),
  ],
);

class StyleMirrorApp extends ConsumerWidget {
  const StyleMirrorApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
        title: 'Stylora',
        debugShowCheckedModeBanner: false,
        theme: _theme(Brightness.light),
        darkTheme: _theme(Brightness.dark),
        themeMode: ref.watch(themeModeProvider),
        routerConfig: _router,
      );

  ThemeData _theme(Brightness brightness) {
    final dark = brightness == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFFBE8BFF),
      brightness: brightness,
      surface: dark ? const Color(0xFF17151C) : const Color(0xFFFCFAFF),
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor:
          dark ? const Color(0xFF100F13) : const Color(0xFFFCFAFF),
      appBarTheme: const AppBarTheme(centerTitle: false),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: dark ? const Color(0xFF1B1920) : const Color(0xFFF4F0F8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      ),
    );
  }
}
