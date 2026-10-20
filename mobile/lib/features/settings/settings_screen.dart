import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../style_mirror_app.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _clearCache(BuildContext context) async {
    try {
      final directory = await getTemporaryDirectory();
      if (await directory.exists()) {
        for (final entity in directory.listSync()) {
          await entity.delete(recursive: true);
        }
      }
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Temporary cache cleared.')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cache could not be cleared. Try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final quality = ref.watch(exportQualityProvider);
    final email = Supabase.instance.client.auth.currentUser?.email ?? 'Signed in';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile & settings'),
        leading: IconButton(
          tooltip: 'Home',
          onPressed: () => context.go('/home'),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: const Text('Account'),
              subtitle: Text(email),
            ),
          ),
          const SizedBox(height: 18),
          Text('Appearance', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          DropdownButtonFormField<ThemeMode>(
            initialValue: themeMode,
            decoration: const InputDecoration(labelText: 'Theme'),
            items: const [
              DropdownMenuItem(value: ThemeMode.system, child: Text('System')),
              DropdownMenuItem(value: ThemeMode.light, child: Text('Light')),
              DropdownMenuItem(value: ThemeMode.dark, child: Text('Dark')),
            ],
            onChanged: (value) async {
              if (value == null) return;
              ref.read(themeModeProvider.notifier).state = value;
              final prefs = await SharedPreferences.getInstance();
              await prefs.setString('theme_mode', value.name);
            },
          ),
          const SizedBox(height: 18),
          DropdownButtonFormField<int>(
            initialValue: quality,
            decoration: const InputDecoration(labelText: 'Default photo quality'),
            items: const [
              DropdownMenuItem(value: 70, child: Text('Smaller · 70%')),
              DropdownMenuItem(value: 88, child: Text('Balanced · 88%')),
              DropdownMenuItem(value: 96, child: Text('Maximum · 96%')),
            ],
            onChanged: (value) async {
              if (value == null) return;
              ref.read(exportQualityProvider.notifier).state = value;
              final prefs = await SharedPreferences.getInstance();
              await prefs.setInt('export_quality', value);
            },
          ),
          const SizedBox(height: 22),
          Text('Storage & privacy',
              style: Theme.of(context).textTheme.titleMedium),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.cleaning_services_outlined),
            title: const Text('Clear temporary cache'),
            subtitle: const Text('Saved projects and originals are kept.'),
            onTap: () => _clearCache(context),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy'),
            subtitle: const Text(
              'Media remains on this device unless you explicitly upload it.',
            ),
          ),
          const SizedBox(height: 18),
          OutlinedButton.icon(
            onPressed: () async {
              try {
                await Supabase.instance.client.auth.signOut();
                if (context.mounted) context.go('/auth');
              } on AuthException catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(error.message)),
                  );
                }
              } catch (_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Could not sign out. Retry.')),
                  );
                }
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Sign out'),
          ),
          const SizedBox(height: 8),
          Text(
            'Account deletion is not yet exposed by the connected API. Contact your service administrator to request removal.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 2,
        onDestinationSelected: (index) {
          if (index == 0) context.go('/home');
          if (index == 1) context.go('/projects');
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_open_outlined),
            label: 'Projects',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
