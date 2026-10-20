import 'dart:io';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

import '../../core/project.dart';
import '../../core/project_store.dart';

class ImportScreen extends StatefulWidget {
  const ImportScreen({required this.kind, super.key});
  final MediaKind kind;

  @override
  State<ImportScreen> createState() => _ImportScreenState();
}

class _ImportScreenState extends State<ImportScreen> {
  bool _checking = true;
  bool _busy = false;
  bool _needsSettings = false;
  String? _error;

  Permission get _mediaPermission =>
      widget.kind == MediaKind.photo ? Permission.photos : Permission.videos;

  @override
  void initState() {
    super.initState();
    _checkAndPick();
  }

  Future<void> _checkAndPick() async {
    if (mounted) {
      setState(() {
        _checking = true;
        _error = null;
      });
    }
    try {
      var status = await _mediaPermission.status;
      if (!status.isGranted && !status.isLimited) {
        status = await _mediaPermission.request();
      }
      if (!mounted) return;
      if (status.isGranted || status.isLimited) {
        setState(() {
          _checking = false;
          _needsSettings = false;
        });
        await _pick();
      } else {
        setState(() {
          _checking = false;
          _needsSettings = status.isPermanentlyDenied ||
              status.isRestricted ||
              status.isLimited;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _checking = false;
          _error = 'We could not check media access. Please retry.';
        });
      }
    }
  }

  Future<void> _pick() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final picker = ImagePicker();
      final XFile? selected = widget.kind == MediaKind.photo
          ? await picker.pickImage(source: ImageSource.gallery)
          : await picker.pickVideo(source: ImageSource.gallery);
      if (!mounted) return;
      if (selected == null) {
        context.go('/home');
        return;
      }
      final file = File(selected.path);
      final sourceExists = await file.exists();
      if (!mounted) return;
      if (!sourceExists) {
        setState(() => _error = 'That file is no longer available. Try again.');
        return;
      }
      final appDirectory = await getApplicationDocumentsDirectory();
      if (!mounted) return;
      final originals = Directory(p.join(appDirectory.path, 'originals'));
      await originals.create(recursive: true);
      final persistentPath = p.join(
        originals.path,
        '${const Uuid().v4()}${p.extension(selected.path)}',
      );
      await file.copy(persistentPath);
      if (!mounted) return;
      final now = DateTime.now();
      final project = MirrorProject(
        id: const Uuid().v4(),
        name: selected.name.replaceAll(RegExp(r'\.[^.]+$'), ''),
        kind: widget.kind,
        sourcePath: persistentPath,
        createdAt: now,
        updatedAt: now,
      );
      await ProjectStore.instance.save(project);
      if (mounted) context.go('/editor/${project.id}');
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Could not import this media. Try another file.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.kind == MediaKind.photo ? 'Photo access' : 'Video access';
    final noun = widget.kind == MediaKind.photo ? 'photos' : 'videos';
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => context.go('/home'),
          icon: const Icon(Icons.close),
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: _checking || _busy
                ? const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 18),
                      Text('Opening your media library…'),
                    ],
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _needsSettings
                            ? Icons.lock_outline
                            : Icons.photo_library_outlined,
                        size: 56,
                      ),
                      const SizedBox(height: 18),
                      Text(
                        _needsSettings
                            ? 'Allow access in Settings'
                            : 'Choose a $noun to edit',
                        style: Theme.of(context).textTheme.titleLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        _needsSettings
                            ? 'STYLE MIRROR only uses media you select. Enable library access to continue.'
                            : 'Your original stays untouched. You can change this permission later in system settings.',
                        textAlign: TextAlign.center,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                      const SizedBox(height: 22),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _needsSettings
                              ? openAppSettings
                              : _checkAndPick,
                          child: Text(_needsSettings ? 'Open Settings' : 'Retry'),
                        ),
                      ),
                      if (_needsSettings)
                        TextButton(
                          onPressed: _checkAndPick,
                          child: const Text('I changed the permission'),
                        ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
