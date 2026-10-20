import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import 'project.dart';

class ProjectStore {
  ProjectStore._();

  static final ProjectStore instance = ProjectStore._();
  Database? _database;

  Future<Database> get _db async {
    final current = _database;
    if (current != null) return current;

    final directory = await getApplicationDocumentsDirectory();
    final database = await openDatabase(
      p.join(directory.path, 'style_mirror.db'),
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            kind TEXT NOT NULL,
            source_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            operations TEXT NOT NULL
          )
        ''');
      },
    );
    _database = database;
    return database;
  }

  Future<List<MirrorProject>> list({String query = ''}) async {
    final rows = await (await _db).query(
      'projects',
      where: query.isEmpty ? null : 'name LIKE ?',
      whereArgs: query.isEmpty ? null : ['%$query%'],
      orderBy: 'updated_at DESC',
    );
    return rows.map(MirrorProject.fromMap).toList();
  }

  Future<void> save(MirrorProject project) async {
    await (await _db).insert(
      'projects',
      project.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<MirrorProject?> get(String id) async {
    final rows = await (await _db).query(
      'projects',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    return rows.isEmpty ? null : MirrorProject.fromMap(rows.single);
  }

  Future<void> delete(String id) async {
    await (await _db).delete('projects', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> close() async {
    await _database?.close();
    _database = null;
  }
}
