import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/project.dart';
import '../../style_mirror_app.dart';

class ProjectsScreen extends ConsumerStatefulWidget {
  const ProjectsScreen({super.key});

  @override
  ConsumerState<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends ConsumerState<ProjectsScreen> {
  final _search = TextEditingController();
  bool _loading = true;
  String? _error;
  List<MirrorProject> _projects = [];
  Timer? _searchDebounce;
  int _loadGeneration = 0;

  @override
  void initState() {
    super.initState();
    _load();
    _search.addListener(_onSearch);
  }

  void _onSearch() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 250), _load);
  }

  Future<void> _load() async {
    final generation = ++_loadGeneration;
    final query = _search.text.trim();
    try {
      final projects =
          await ref.read(projectStoreProvider).list(query: query);
      if (mounted && generation == _loadGeneration) {
        setState(() {
          _projects = projects;
          _error = null;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted && generation == _loadGeneration) {
        setState(() {
          _error = 'Your local projects could not be loaded.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _delete(MirrorProject project) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete project?'),
        content: Text('“${project.name}” will be removed from this device.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await ref.read(projectStoreProvider).delete(project.id);
      if (!mounted) return;
      await _load();
    }
  }

  Future<void> _rename(MirrorProject project) async {
    final controller = TextEditingController(text: project.name);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename project'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLength: 80,
          decoration: const InputDecoration(labelText: 'Project name'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (name != null && name.isNotEmpty && mounted) {
      await ref.read(projectStoreProvider).save(project.copyWith(name: name));
      if (!mounted) return;
      await _load();
    }
  }

  Future<void> _duplicate(MirrorProject project) async {
    final duplicate = MirrorProject(
      id: '${project.id}-copy-${DateTime.now().millisecondsSinceEpoch}',
      name: '${project.name} copy',
      kind: project.kind,
      sourcePath: project.sourcePath,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      operations: project.operations,
    );
    await ref.read(projectStoreProvider).save(duplicate);
    if (!mounted) return;
    await _load();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _search.removeListener(_onSearch);
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Projects'),
          actions: [
            IconButton(
              tooltip: 'Home',
              onPressed: () => context.go('/home'),
              icon: const Icon(Icons.home_outlined),
            ),
          ],
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: TextField(
                controller: _search,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Search projects',
                ),
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _ErrorState(message: _error!, retry: _load)
                      : _projects.isEmpty
                          ? const _EmptyProjects()
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.builder(
                                padding:
                                    const EdgeInsets.fromLTRB(16, 0, 16, 100),
                                itemCount: _projects.length,
                                itemBuilder: (context, index) =>
                                    _ProjectTile(
                                  project: _projects[index],
                                  onOpen: () => context.go(
                                    '/editor/${_projects[index].id}',
                                  ),
                                  onRename: () => _rename(_projects[index]),
                                  onDuplicate: () =>
                                      _duplicate(_projects[index]),
                                  onDelete: () => _delete(_projects[index]),
                                ),
                              ),
                            ),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.go('/import/photo'),
          icon: const Icon(Icons.add),
          label: const Text('Create'),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: 1,
          onDestinationSelected: (index) {
            if (index == 0) context.go('/home');
            if (index == 2) context.go('/settings');
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

class _ProjectTile extends StatelessWidget {
  const _ProjectTile({
    required this.project,
    required this.onOpen,
    required this.onRename,
    required this.onDuplicate,
    required this.onDelete,
  });

  final MirrorProject project;
  final VoidCallback onOpen;
  final VoidCallback onRename;
  final VoidCallback onDuplicate;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: ListTile(
          contentPadding: const EdgeInsets.all(12),
          leading: SizedBox(
            width: 56,
            height: 56,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: project.kind == MediaKind.photo &&
                      File(project.sourcePath).existsSync()
                  ? Image.file(File(project.sourcePath), fit: BoxFit.cover)
                  : ColoredBox(
                      color: Theme.of(context).colorScheme.secondaryContainer,
                      child: Icon(
                        project.kind == MediaKind.video
                            ? Icons.movie_outlined
                            : Icons.image_outlined,
                      ),
                    ),
            ),
          ),
          title: Text(project.name, maxLines: 1, overflow: TextOverflow.ellipsis),
          subtitle: Text(
            '${project.kind.name.toUpperCase()} · ${project.operations.length} edits',
          ),
          trailing: PopupMenuButton<String>(
            tooltip: 'Project actions',
            onSelected: (value) {
              if (value == 'rename') onRename();
              if (value == 'duplicate') onDuplicate();
              if (value == 'delete') onDelete();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'rename', child: Text('Rename')),
              PopupMenuItem(value: 'duplicate', child: Text('Duplicate')),
              PopupMenuItem(value: 'delete', child: Text('Delete')),
            ],
          ),
          onTap: onOpen,
        ),
      );
}

class _EmptyProjects extends StatelessWidget {
  const _EmptyProjects();

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.photo_library_outlined, size: 52),
              const SizedBox(height: 14),
              Text('Your projects live here',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              const Text(
                'Start with a photo or video. Drafts are saved on this device.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.retry});
  final String message;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message),
            const SizedBox(height: 12),
            FilledButton(onPressed: retry, child: const Text('Retry')),
          ],
        ),
      );
}
