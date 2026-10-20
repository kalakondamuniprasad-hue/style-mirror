import 'package:flutter_test/flutter_test.dart';
import 'package:style_mirror/core/edit_history.dart';
import 'package:style_mirror/core/project.dart';

void main() {
  group('EditHistory', () {
    test('undo and redo restore immutable operation snapshots', () {
      final history = EditHistory(const []);
      final brightness = EditOperation(tool: 'brightness', value: 12);
      final contrast = EditOperation(tool: 'contrast', value: -8);

      history.push(brightness);
      history.push(contrast);
      expect(history.operations, [brightness, contrast]);

      history.undo();
      expect(history.operations, [brightness]);
      expect(history.canRedo, isTrue);

      history.redo();
      expect(history.operations, [brightness, contrast]);
      expect(history.canRedo, isFalse);
    });

    test('a new edit after undo clears the redo branch', () {
      final history = EditHistory(const []);
      history.push(const EditOperation(tool: 'brightness', value: 15));
      history.push(const EditOperation(tool: 'contrast', value: 10));
      history.undo();
      history.push(const EditOperation(tool: 'saturation', value: 25));

      expect(history.canRedo, isFalse);
      expect(history.operations.map((operation) => operation.tool), [
        'brightness',
        'saturation',
      ]);
    });
  });

  test('project metadata and operation stack survive serialization', () {
    final project = MirrorProject(
      id: 'project-1',
      name: 'Portrait',
      kind: MediaKind.photo,
      sourcePath: '/local/original.jpg',
      createdAt: DateTime.utc(2026, 1, 2),
      updatedAt: DateTime.utc(2026, 1, 3),
      operations: const [
        EditOperation(tool: 'brightness', value: 12.5),
        EditOperation(tool: 'filter', value: 60, label: 'Warm'),
      ],
    );

    final restored = MirrorProject.fromMap(project.toMap());
    expect(restored.id, project.id);
    expect(restored.kind, MediaKind.photo);
    expect(restored.sourcePath, project.sourcePath);
    expect(restored.operations, hasLength(2));
    expect(restored.operations.last.label, 'Warm');
    expect(restored.operations.first.value, 12.5);
  });
}
