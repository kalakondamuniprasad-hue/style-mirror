import 'project.dart';

class EditHistory {
  EditHistory(List<EditOperation> initial)
      : _past = [List.unmodifiable(initial)];

  final List<List<EditOperation>> _past;
  final List<List<EditOperation>> _future = [];

  List<EditOperation> get operations => _past.last;
  bool get canUndo => _past.length > 1;
  bool get canRedo => _future.isNotEmpty;

  void push(EditOperation operation) {
    _future.clear();
    _past.add(List.unmodifiable([...operations, operation]));
  }

  void undo() {
    if (!canUndo) return;
    _future.add(_past.removeLast());
  }

  void redo() {
    if (!canRedo) return;
    _past.add(_future.removeLast());
  }
}
