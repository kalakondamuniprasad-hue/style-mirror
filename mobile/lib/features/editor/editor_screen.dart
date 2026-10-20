import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gal/gal.dart';
import 'package:go_router/go_router.dart';
import 'package:image/image.dart' as img;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';

import '../../core/edit_history.dart';
import '../../core/project.dart';
import '../../style_mirror_app.dart';

const _filters = [
  'Original',
  'Soft',
  'Noir',
  'Warm',
  'Cool',
  'Fade',
  'Golden',
  'Cinema',
  'Rose',
  'Matte',
  'Vivid',
  'Mono',
  'Dusk',
  'Coastal',
  'Vintage',
  'Dream',
];

class EditorScreen extends ConsumerStatefulWidget {
  const EditorScreen({required this.projectId, super.key});
  final String projectId;

  @override
  ConsumerState<EditorScreen> createState() => _EditorScreenState();
}

class _EditorScreenState extends ConsumerState<EditorScreen> {
  MirrorProject? _project;
  EditHistory? _history;
  VideoPlayerController? _video;
  String _tool = 'Brightness';
  String _selectedFilter = 'Original';
  double _value = 0;
  double _compare = 1;
  RangeValues _trimRange = const RangeValues(0, 1);
  bool _loading = true;
  bool _exportPreparing = false;
  bool _exporting = false;
  bool _exportDialogOpen = false;
  Isolate? _exportIsolate;
  ReceivePort? _exportResultPort;
  String? _exportError;

  bool get _isPhoto => _project?.kind == MediaKind.photo;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final project = await ref.read(projectStoreProvider).get(widget.projectId);
      if (project == null) {
        if (mounted) setState(() => _exportError = 'Project not found.');
        return;
      }
      _project = project;
      _history = EditHistory(project.operations);
      if (project.kind == MediaKind.video) {
        final file = File(project.sourcePath);
        if (!await file.exists()) throw const FileSystemException('Missing media');
        final controller = VideoPlayerController.file(file);
        _video = controller;
        await controller.initialize();
        if (mounted) setState(() {});
      }
    } catch (_) {
      if (mounted) {
        setState(() => _exportError = 'This media could not be opened.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final project = _project;
    final history = _history;
    if (project == null || history == null) return;
    HapticFeedback.selectionClick();
    final saved = project.copyWith(operations: history.operations);
    try {
      await ref.read(projectStoreProvider).save(saved);
      if (!mounted) return;
      setState(() => _project = saved);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Draft saved on this device.')),
      );
    } catch (_) {
      if (mounted) {
        _notice('Could not save the draft. Check available device storage.');
      }
    }
  }

  void _setTool(String tool) {
    setState(() {
      _tool = tool;
      _value = switch (tool) {
        'Brightness' || 'Contrast' || 'Saturation' || 'Warmth' => 0,
        'Sharpness' || 'Vignette' || 'Effects' => 0,
        'Speed' => 1,
        _ => 50,
      };
    });
  }

  void _commitTool() {
    final history = _history;
    if (history == null) return;
    if (_tool == 'Filters') {
      history.push(
        EditOperation(tool: 'filter', value: _value, label: _selectedFilter),
      );
    } else {
      history.push(EditOperation(tool: _tool.toLowerCase(), value: _value));
    }
    HapticFeedback.selectionClick();
    setState(() {});
    unawaited(_save());
  }

  void _addDiscreteOperation(String tool, {double value = 1, String? label}) {
    _history?.push(EditOperation(tool: tool, value: value, label: label));
    setState(() {});
    unawaited(_save());
  }

  Future<void> _rename() async {
    final project = _project;
    if (project == null) return;
    final controller = TextEditingController(text: project.name);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename project'),
        content: TextField(
          controller: controller,
          maxLength: 80,
          decoration: const InputDecoration(labelText: 'Project name'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (name != null && name.isNotEmpty && mounted) {
      setState(() => _project = project.copyWith(name: name));
      await _save();
    }
  }

  Future<void> _addText() async {
    final controller = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add title'),
        content: TextField(
          controller: controller,
          maxLength: 80,
          decoration: const InputDecoration(hintText: 'Type your title'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Add')),
        ],
      ),
    );
    controller.dispose();
    if (text != null && text.isNotEmpty && mounted) {
      _addDiscreteOperation('text', label: text);
    }
  }

  Future<void> _toggleVideo() async {
    final video = _video;
    if (video == null || !video.value.isInitialized) return;
    if (video.value.isPlaying) {
      await video.pause();
    } else {
      await video.play();
    }
    if (mounted) setState(() {});
  }

  Future<void> _chooseAspectRatio() async {
    final ratio = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final ratio in ['Original', '1:1', '4:5', '3:4', '16:9'])
              ListTile(
                title: Text(ratio),
                onTap: () => Navigator.pop(context, ratio),
              ),
          ],
        ),
      ),
    );
    if (ratio != null && mounted) _addDiscreteOperation('aspect', label: ratio);
  }

  Future<void> _export() async {
    if (_exportPreparing || _exporting) return;
    setState(() => _exportPreparing = true);
    final project = _project;
    final history = _history;
    if (project == null || history == null) {
      setState(() => _exportPreparing = false);
      return;
    }
    if (project.kind == MediaKind.video) {
      _notice('MP4 rendering is not configured in this client yet.');
      setState(() => _exportPreparing = false);
      return;
    }

    var format = 'jpg';
    var quality = ref.read(exportQualityProvider);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Export photo'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: format,
                decoration: const InputDecoration(labelText: 'Format'),
                items: const [
                  DropdownMenuItem(value: 'jpg', child: Text('JPG')),
                  DropdownMenuItem(value: 'png', child: Text('PNG')),
                ],
                onChanged: (value) {
                  if (value != null) setDialogState(() => format = value);
                },
              ),
              const SizedBox(height: 12),
              Text('JPG quality: $quality%'),
              Slider(
                value: quality.toDouble(),
                min: 40,
                max: 100,
                divisions: 12,
                onChanged: format == 'png'
                    ? null
                    : (value) => setDialogState(() => quality = value.round()),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Export')),
          ],
        ),
      ),
    );
    if (confirmed != true || !mounted) {
      if (mounted) setState(() => _exportPreparing = false);
      return;
    }
    String? outputPath;
    final resultPort = ReceivePort();
    _exportResultPort = resultPort;
    setState(() {
      _exportPreparing = false;
      _exporting = true;
      _exportError = null;
    });
    _exportDialogOpen = true;
    final progressDialog = showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: const Text('Exporting your photo'),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              LinearProgressIndicator(),
              SizedBox(height: 18),
              Text('Your original is safe.'),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => _cancelExport(outputPath),
              child: const Text('Cancel export'),
            ),
          ],
        ),
      ),
    );

    try {
      final outputDirectory = await getApplicationDocumentsDirectory();
      if (!mounted) return;
      final exports = Directory(p.join(outputDirectory.path, 'exports'));
      await exports.create(recursive: true);
      if (!mounted) return;
      final createdOutputPath = p.join(
        exports.path,
        '${p.basenameWithoutExtension(project.name)}_${DateTime.now().millisecondsSinceEpoch}.$format',
      );
      outputPath = createdOutputPath;
      _exportIsolate = await Isolate.spawn<Map<String, Object?>>(
        _exportPhotoWorker,
        {
          'sourcePath': project.sourcePath,
          'outputPath': createdOutputPath,
          'format': format,
          'quality': quality,
          'operations':
              jsonEncode(history.operations.map((e) => e.toJson()).toList()),
          'replyPort': resultPort.sendPort,
        },
        onError: resultPort.sendPort,
      );
      final result = await resultPort.first;
      if (!mounted) return;
      if (result is Map && result['ok'] == true) {
        if (!File(createdOutputPath).existsSync()) {
          throw const FileSystemException('Export output was not created');
        }
        await Gal.putImage(createdOutputPath, album: 'STYLE MIRROR');
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Saved to your photo library.'),
            action: SnackBarAction(
              label: 'Share',
              onPressed: () => SharePlus.instance.share(
                ShareParams(files: [XFile(createdOutputPath)]),
              ),
            ),
          ),
        );
      } else {
        final message =
            result is Map ? result['error']?.toString() : 'Export failed.';
        throw StateError(message ?? 'Export failed.');
      }
    } catch (error) {
      if (mounted && _exportError != 'Export cancelled.') {
        _notice('Export failed: $error');
      }
    } finally {
      _exportIsolate?.kill(priority: Isolate.immediate);
      _exportIsolate = null;
      _exportResultPort?.close();
      _exportResultPort = null;
      if (outputPath != null && _exportError == 'Export cancelled.') {
        final output = File(outputPath);
        if (await output.exists()) await output.delete();
      }
      if (mounted) {
        setState(() => _exporting = false);
        if (_exportDialogOpen) {
          _exportDialogOpen = false;
          Navigator.of(context, rootNavigator: true).maybePop();
        }
      }
      await progressDialog;
    }
  }

  Future<void> _cancelExport(String? outputPath) async {
    if (!_exportDialogOpen) return;
    _exportDialogOpen = false;
    if (mounted) setState(() => _exportError = 'Export cancelled.');
    _exportIsolate?.kill(priority: Isolate.immediate);
    if (outputPath != null) {
      final output = File(outputPath);
      if (await output.exists()) await output.delete();
    }
    _exportResultPort?.sendPort.send({
      'ok': false,
      'error': 'Export cancelled.',
    });
    if (mounted) Navigator.of(context, rootNavigator: true).pop();
  }

  void _notice(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  void dispose() {
    _exportIsolate?.kill(priority: Isolate.immediate);
    _exportResultPort?.close();
    _video?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final project = _project;
    final history = _history;
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (project == null || history == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Editor')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_exportError ?? 'Project unavailable.'),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => context.go('/projects'),
                child: const Text('Back to projects'),
              ),
            ],
          ),
        ),
      );
    }
    final tools = project.kind == MediaKind.photo
        ? const [
            'Brightness',
            'Contrast',
            'Saturation',
            'Warmth',
            'Sharpness',
            'Vignette',
            'Crop',
            'Filters',
            'Effects',
            'AI Enhance',
          ]
        : const ['Trim', 'Split', 'Speed', 'Audio', 'Text', 'Effects'];
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back to projects',
          onPressed: () => context.go('/projects'),
          icon: const Icon(Icons.arrow_back),
        ),
        title: GestureDetector(
          onTap: _rename,
          child: Text(project.name, maxLines: 1, overflow: TextOverflow.ellipsis),
        ),
        actions: [
          IconButton(
            tooltip: 'Undo',
            onPressed: history.canUndo
                ? () {
                    history.undo();
                    setState(() {});
                    unawaited(_save());
                  }
                : null,
            icon: const Icon(Icons.undo),
          ),
          IconButton(
            tooltip: 'Redo',
            onPressed: history.canRedo
                ? () {
                    history.redo();
                    setState(() {});
                    unawaited(_save());
                  }
                : null,
            icon: const Icon(Icons.redo),
          ),
          IconButton(
            tooltip: 'Save draft',
            onPressed: _save,
            icon: const Icon(Icons.save_outlined),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _isPhoto
                  ? _photoPreview(project, history)
                  : _videoPreview(project),
            ),
            if (_isPhoto)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18),
                child: Column(
                  children: [
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Before / after'),
                    ),
                    Slider(
                      value: _compare,
                      onChanged: (value) => setState(() => _compare = value),
                    ),
                  ],
                ),
              ),
            SizedBox(
              height: 74,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                itemCount: tools.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final tool = tools[index];
                  final active = tool == _tool;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: ChoiceChip(
                      label: Text(tool),
                      selected: active,
                      onSelected: (_) => _setTool(tool),
                    ),
                  );
                },
              ),
            ),
            _toolControls(),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: _save,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Save'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _exporting ? null : _export,
                      icon: const Icon(Icons.ios_share),
                      label: const Text('Export'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _photoPreview(MirrorProject project, EditHistory history) {
    final file = File(project.sourcePath);
    if (!file.existsSync()) {
      return const Center(child: Text('Original media is no longer available.'));
    }
    final selectedFilters = history.operations
        .where((operation) => operation.tool == 'filter')
        .toList();
    final filter = selectedFilters.isEmpty ? null : selectedFilters.last.label;
    final colorFilter = _previewFilter(history.operations);
    return Padding(
      padding: const EdgeInsets.all(18),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: LayoutBuilder(
          builder: (context, constraints) => Stack(
            fit: StackFit.expand,
            children: [
              Image.file(file, fit: BoxFit.contain, errorBuilder: (_, __, ___) {
                return const Center(child: Text('Could not preview this image.'));
              }),
              if (colorFilter != null)
                ClipRect(
                  clipper: _CompareClipper(_compare),
                  child: ColorFiltered(
                    colorFilter: colorFilter,
                    child: Image.file(file, fit: BoxFit.contain),
                  ),
                ),
              if (filter != null)
                Positioned(
                  left: 14,
                  bottom: 14,
                  child: Chip(label: Text(filter)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  ColorFilter? _previewFilter(List<EditOperation> operations) {
    if (operations.isEmpty) return null;
    final brightness = operations
        .where((operation) => operation.tool == 'brightness')
        .fold<double>(0, (total, operation) => total + operation.value / 100);
    final contrast = operations
        .where((operation) => operation.tool == 'contrast')
        .fold<double>(
          1,
          (total, operation) => total * (1 + operation.value / 100),
        );
    if (brightness != 0 || contrast != 1) {
      final offset = 128 * (1 - contrast) + brightness * 255;
      return ColorFilter.matrix([
        contrast, 0, 0, 0, offset,
        0, contrast, 0, 0, offset,
        0, 0, contrast, 0, offset,
        0, 0, 0, 1, 0,
      ]);
    }
    final saturation = operations
        .where((operation) => operation.tool == 'saturation')
        .fold<double>(0, (total, operation) => total + operation.value / 100);
    if (saturation != 0) {
      final color = saturation >= 0 ? Colors.orange : Colors.blueGrey;
      return ColorFilter.mode(
        color.withValues(alpha: saturation.abs().clamp(0.0, 0.35).toDouble()),
        BlendMode.softLight,
      );
    }
    final selectedFilters = operations
        .where((operation) => operation.tool == 'filter')
        .toList();
    final filter =
        selectedFilters.isEmpty ? null : selectedFilters.last;
    if (filter != null && filter.label != 'Original') {
      final color = switch (filter.label) {
        'Warm' || 'Golden' || 'Vintage' => Colors.orangeAccent,
        'Cool' || 'Coastal' || 'Dusk' => Colors.blueAccent,
        'Rose' || 'Dream' => Colors.pinkAccent,
        'Noir' || 'Mono' => Colors.black,
        _ => Colors.deepPurpleAccent,
      };
      return ColorFilter.mode(
        color.withValues(alpha: filter.value / 300),
        BlendMode.softLight,
      );
    }
    return null;
  }

  Widget _videoPreview(MirrorProject project) {
    final controller = _video;
    if (controller == null || !controller.value.isInitialized) {
      return Center(
        child: Text(_exportError ?? 'Video preview is unavailable.'),
      );
    }
    return Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AspectRatio(
            aspectRatio: controller.value.aspectRatio,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  VideoPlayer(controller),
                  if (_history?.operations
                          .any((operation) => operation.tool == 'text') ??
                      false)
                    Center(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(8),
                          child: Text(
                            _history!.operations
                                .lastWhere((operation) => operation.tool == 'text')
                                .label!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          VideoProgressIndicator(controller, allowScrubbing: true),
          Row(
            children: [
              IconButton(
                tooltip: controller.value.isPlaying ? 'Pause' : 'Play',
                onPressed: _toggleVideo,
                icon: Icon(
                  controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                ),
              ),
              Expanded(
                child: Text(
                  '${controller.value.position.inSeconds}s / ${controller.value.duration.inSeconds}s',
                ),
              ),
              IconButton(
                tooltip: 'Split at playhead',
                onPressed: () => _addDiscreteOperation(
                  'split',
                  value: controller.value.position.inMilliseconds.toDouble(),
                ),
                icon: const Icon(Icons.content_cut),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _toolControls() {
    final video = _video;
    if (_tool == 'Trim') {
      final durationMs =
          (video?.value.duration.inMilliseconds ?? 0).toDouble();
      return Column(
        children: [
          const Text('Choose the clip range'),
          RangeSlider(
            values: _trimRange,
            min: 0,
            max: 1,
            divisions: 100,
            labels: RangeLabels(
              '${(_trimRange.start * durationMs / 1000).round()}s',
              '${(_trimRange.end * durationMs / 1000).round()}s',
            ),
            onChanged: (value) => setState(() => _trimRange = value),
            onChangeEnd: (value) {
              _addDiscreteOperation(
                'trim_start',
                value: value.start * durationMs,
              );
              _addDiscreteOperation(
                'trim_end',
                value: value.end * durationMs,
              );
            },
          ),
        ],
      );
    }
    if (_tool == 'Crop') {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            const Expanded(child: Text('Crop & aspect ratio')),
            TextButton(
              onPressed: _chooseAspectRatio,
              child: const Text('Aspect ratio'),
            ),
            IconButton(
              tooltip: 'Rotate 90 degrees',
              onPressed: () => _addDiscreteOperation('rotate', value: 90),
              icon: const Icon(Icons.rotate_right),
            ),
            IconButton(
              tooltip: 'Flip horizontal',
              onPressed: () => _addDiscreteOperation('flip'),
              icon: const Icon(Icons.flip),
            ),
          ],
        ),
      );
    }
    if (_tool == 'Filters') {
      return SizedBox(
        height: 116,
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _filters.length,
                itemBuilder: (context, index) {
                  final filter = _filters[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: filter == _selectedFilter,
                      onSelected: (_) => setState(() => _selectedFilter = filter),
                    ),
                  );
                },
              ),
            ),
            Row(
              children: [
                const SizedBox(width: 16, child: Text('0')),
                Expanded(
                  child: Slider(
                    value: _value.clamp(0, 100).toDouble(),
                    min: 0,
                    max: 100,
                    onChanged: (value) => setState(() => _value = value),
                    onChangeEnd: (_) => _commitTool(),
                  ),
                ),
                const SizedBox(width: 32, child: Text('100')),
              ],
            ),
          ],
        ),
      );
    }
    if (_tool == 'AI Enhance') {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          children: [
            const Text(
              'AI enhancement needs a configured enhancement service. A safe local auto-adjust is available now.',
            ),
            TextButton.icon(
              onPressed: () {
                _setTool('Brightness');
                _value = 8;
                _commitTool();
              },
              icon: const Icon(Icons.auto_awesome),
              label: const Text('Apply gentle auto-light'),
            ),
          ],
        ),
      );
    }
    if (_tool == 'Effects') {
      final options =
          _isPhoto ? ['Vignette', 'Sharpness', 'Grain'] : ['Fade', 'Blur'];
      return Wrap(
        alignment: WrapAlignment.center,
        spacing: 8,
        children: [
          for (final option in options)
            ActionChip(
              label: Text(option),
              onPressed: () => _addDiscreteOperation(
                option.toLowerCase(),
                value: 35,
              ),
            ),
        ],
      );
    }
    if (_tool == 'Text') {
      return Center(
        child: TextButton.icon(
          onPressed: _addText,
          icon: const Icon(Icons.title),
          label: const Text('Add text overlay'),
        ),
      );
    }
    if (_tool == 'Audio') {
      return Row(
        children: [
          const SizedBox(width: 16),
          const Text('Volume'),
          Expanded(
            child: Slider(
              value: _value.clamp(0, 100).toDouble(),
              onChanged: (value) => setState(() => _value = value),
              onChangeEnd: (value) async {
                await video?.setVolume(value / 100);
                _commitTool();
              },
            ),
          ),
          TextButton(
            onPressed: () => _notice('Choose music and voiceover in a later build.'),
            child: const Text('Add audio'),
          ),
        ],
      );
    }
    if (_tool == 'Split') {
      return Center(
        child: Text(
          '${historyLengthLabel()} edit operations saved in this local draft.',
        ),
      );
    }
    final range = _tool == 'Speed' ? 0.25 : -100.0;
    final maximum = _tool == 'Speed' ? 4.0 : 100.0;
    if (_tool == 'Speed') {
      _value = _value.clamp(range, maximum).toDouble();
    }
    final label = _tool == 'Speed'
        ? '${_value.toStringAsFixed(2)}×'
        : '${_value.round()}';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          SizedBox(width: 84, child: Text(_tool)),
          Expanded(
            child: Slider(
              value: _value.clamp(range, maximum).toDouble(),
              min: range,
              max: maximum,
              onChanged: (value) {
                setState(() => _value = value);
                if (_tool == 'Speed') unawaited(video?.setPlaybackSpeed(value));
              },
              onChangeEnd: (_) => _commitTool(),
            ),
          ),
          SizedBox(width: 42, child: Text(label)),
        ],
      ),
    );
  }

  int historyLengthLabel() => _history?.operations.length ?? 0;
}

class _CompareClipper extends CustomClipper<Rect> {
  const _CompareClipper(this.fraction);
  final double fraction;

  @override
  Rect getClip(Size size) => Rect.fromLTWH(0, 0, size.width * fraction, size.height);

  @override
  bool shouldReclip(_CompareClipper oldClipper) =>
      oldClipper.fraction != fraction;
}

void _exportPhotoWorker(Map<String, Object?> message) {
  final replyPort = message['replyPort']! as SendPort;
  try {
    final source = File(message['sourcePath']! as String).readAsBytesSync();
    var image = img.decodeImage(source);
    if (image == null) throw const FormatException('Unsupported image file.');

    final operations =
        (jsonDecode(message['operations']! as String) as List<dynamic>)
            .map((item) => EditOperation.fromJson(item as Map<String, dynamic>));
    if (image.width * image.height > 100000000) {
      throw const FormatException('This image is too large to export safely.');
    }
    for (final operation in operations) {
      final amount = operation.value / 100;
      if (operation.tool == 'brightness') {
        image = img.adjustColor(image, brightness: amount);
      } else if (operation.tool == 'contrast') {
        image = img.adjustColor(image, contrast: amount);
      } else if (operation.tool == 'saturation') {
        image = img.adjustColor(image, saturation: amount);
      } else if (operation.tool == 'warmth') {
        image = _applyWarmth(image, amount);
      } else if (operation.tool == 'vignette') {
        image = _applyVignette(image, amount);
      } else if (operation.tool == 'sharpness') {
        image = _applySharpness(image, amount);
      } else if (operation.tool == 'filter') {
        image = _applyFilter(image, operation.label, amount);
      } else if (operation.tool == 'aspect') {
        image = _cropToAspect(image, operation.label);
      } else if (operation.tool == 'rotate' && operation.value == 90) {
        image = img.copyRotate(image, angle: 90);
      } else if (operation.tool == 'flip') {
        image = img.copyFlip(image, direction: img.FlipDirection.horizontal);
      }
    }

    final format = message['format']! as String;
    final encoded = format == 'png'
        ? img.encodePng(image)
        : img.encodeJpg(image, quality: message['quality']! as int);
    File(message['outputPath']! as String).writeAsBytesSync(encoded);
    replyPort.send({'ok': true});
  } catch (error) {
    replyPort.send({'ok': false, 'error': error.toString()});
  }
}

img.Image _applyWarmth(img.Image source, double amount) {
  final image = img.Image.from(source);
  for (var y = 0; y < image.height; y++) {
    for (var x = 0; x < image.width; x++) {
      final pixel = source.getPixel(x, y);
      image.setPixelRgba(
        x,
        y,
        (pixel.r + amount * 48).round().clamp(0, 255),
        pixel.g.round(),
        (pixel.b - amount * 48).round().clamp(0, 255),
        pixel.a.round(),
      );
    }
  }
  return image;
}

img.Image _applyVignette(img.Image source, double amount) {
  final image = img.Image.from(source);
  final centerX = (image.width - 1) / 2;
  final centerY = (image.height - 1) / 2;
  final radius = math.sqrt(centerX * centerX + centerY * centerY);
  if (radius == 0) return image;
  for (var y = 0; y < image.height; y++) {
    for (var x = 0; x < image.width; x++) {
      final pixel = source.getPixel(x, y);
      final distance = math.sqrt(
        math.pow(x - centerX, 2) + math.pow(y - centerY, 2),
      );
      final factor =
          (1 - math.max(0, amount) * math.pow(distance / radius, 2) * 0.8)
              .clamp(0.15, 1.0)
              .toDouble();
      image.setPixelRgba(
        x,
        y,
        (pixel.r * factor).round(),
        (pixel.g * factor).round(),
        (pixel.b * factor).round(),
        pixel.a.round(),
      );
    }
  }
  return image;
}

img.Image _applySharpness(img.Image source, double amount) {
  final strength = amount.clamp(0, 1).toDouble() * 0.6;
  if (strength == 0 || source.width < 3 || source.height < 3) return source;
  final original = img.Image.from(source);
  for (var y = 1; y < source.height - 1; y++) {
    for (var x = 1; x < source.width - 1; x++) {
      final center = original.getPixel(x, y);
      final up = original.getPixel(x, y - 1);
      final down = original.getPixel(x, y + 1);
      final left = original.getPixel(x - 1, y);
      final right = original.getPixel(x + 1, y);
      double sharpen(double channel, double a, double b, double c, double d) =>
          (channel * (1 + 4 * strength) - (a + b + c + d) * strength)
              .clamp(0, 255)
              .toDouble();
      source.setPixelRgba(
        x,
        y,
        sharpen(center.r, up.r, down.r, left.r, right.r).round(),
        sharpen(center.g, up.g, down.g, left.g, right.g).round(),
        sharpen(center.b, up.b, down.b, left.b, right.b).round(),
        center.a.round(),
      );
    }
  }
  return source;
}

img.Image _applyFilter(img.Image source, String? name, double intensity) {
  final strength = intensity.clamp(0, 1).toDouble();
  if (name == null || name == 'Original' || strength == 0) return source;
  final settings = switch (name) {
    'Noir' || 'Mono' => (brightness: 0.0, contrast: 0.2, saturation: -1.0),
    'Warm' || 'Golden' || 'Vintage' =>
      (brightness: 0.06, contrast: 0.04, saturation: 0.08),
    'Cool' || 'Coastal' || 'Dusk' =>
      (brightness: 0.0, contrast: 0.08, saturation: -0.08),
    'Vivid' => (brightness: 0.0, contrast: 0.16, saturation: 0.28),
    'Fade' || 'Matte' => (brightness: 0.05, contrast: -0.18, saturation: -0.1),
    'Rose' || 'Dream' => (brightness: 0.04, contrast: -0.04, saturation: 0.05),
    'Cinema' => (brightness: -0.02, contrast: 0.2, saturation: -0.12),
    _ => (brightness: 0.02, contrast: 0.02, saturation: 0.02),
  };
  return img.adjustColor(
    source,
    brightness: settings.brightness * strength,
    contrast: settings.contrast * strength,
    saturation: settings.saturation * strength,
  );
}

img.Image _cropToAspect(img.Image source, String? aspect) {
  final targetRatio = switch (aspect) {
    '1:1' => 1.0,
    '4:5' => 4 / 5,
    '3:4' => 3 / 4,
    '16:9' => 16 / 9,
    _ => source.width / source.height,
  };
  final currentRatio = source.width / source.height;
  if ((targetRatio - currentRatio).abs() < 0.001) return source;
  final width =
      currentRatio > targetRatio ? (source.height * targetRatio).round() : source.width;
  final height =
      currentRatio > targetRatio ? source.height : (source.width / targetRatio).round();
  return img.copyCrop(
    source,
    x: (source.width - width) ~/ 2,
    y: (source.height - height) ~/ 2,
    width: width,
    height: height,
  );
}
