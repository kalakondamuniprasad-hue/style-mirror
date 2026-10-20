import 'dart:convert';

enum MediaKind { photo, video }

class EditOperation {
  const EditOperation({
    required this.tool,
    required this.value,
    this.label,
  });

  final String tool;
  final double value;
  final String? label;

  Map<String, Object?> toJson() => {
        'tool': tool,
        'value': value,
        'label': label,
      };

  factory EditOperation.fromJson(Map<String, dynamic> json) => EditOperation(
        tool: json['tool'] as String,
        value: (json['value'] as num).toDouble(),
        label: json['label'] as String?,
      );
}

class MirrorProject {
  const MirrorProject({
    required this.id,
    required this.name,
    required this.kind,
    required this.sourcePath,
    required this.createdAt,
    required this.updatedAt,
    this.operations = const [],
  });

  final String id;
  final String name;
  final MediaKind kind;
  final String sourcePath;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<EditOperation> operations;

  MirrorProject copyWith({
    String? name,
    List<EditOperation>? operations,
    DateTime? updatedAt,
  }) =>
      MirrorProject(
        id: id,
        name: name ?? this.name,
        kind: kind,
        sourcePath: sourcePath,
        createdAt: createdAt,
        updatedAt: updatedAt ?? DateTime.now(),
        operations: operations ?? this.operations,
      );

  Map<String, Object?> toMap() => {
        'id': id,
        'name': name,
        'kind': kind.name,
        'source_path': sourcePath,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'operations': jsonEncode(operations.map((e) => e.toJson()).toList()),
      };

  factory MirrorProject.fromMap(Map<String, Object?> map) => MirrorProject(
        id: map['id']! as String,
        name: map['name']! as String,
        kind: MediaKind.values.byName(map['kind']! as String),
        sourcePath: map['source_path']! as String,
        createdAt: DateTime.parse(map['created_at']! as String),
        updatedAt: DateTime.parse(map['updated_at']! as String),
        operations: (jsonDecode(map['operations']! as String) as List<dynamic>)
            .map((e) => EditOperation.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
