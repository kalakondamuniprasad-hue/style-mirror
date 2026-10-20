import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:style_mirror/style_mirror_app.dart';

void main() {
  testWidgets('unconfigured backend presents actionable setup guidance',
      (tester) async {
    await tester.pumpWidget(const ProviderScope(child: StyleMirrorApp()));
    await tester.pumpAndSettle();

    expect(find.text('Connect your account'), findsOneWidget);
    expect(find.textContaining('SUPABASE_URL'), findsOneWidget);
  });
}
