# Mobile QA and regression status

## Review findings

| ID | Area | Severity | Description | Fix |
|---|---|---|---|---|
| QA-01 | Draft durability | High | Gallery picker paths may point to cache files that disappear after process death. | Copy selected media to app-private `originals/` before persisting the draft. |
| QA-02 | Edit integrity | High | Editing directly against the selected asset risks changing the only original. | Keep the original immutable and persist operations separately; render exports to a new file. |
| QA-03 | Session security | High | Storing bearer/session material in ordinary app preferences is not appropriate. | Configure Supabase Auth storage with `flutter_secure_storage`. |
| QA-04 | Recovery | Medium | A missing/corrupt asset could otherwise leave the editor spinning or crash. | Show loading, missing-project, media-open, and import errors with retry/navigation states. |
| QA-05 | Export reliability | Medium | Decoding and encoding full-size photos on the UI isolate can freeze the editor. | Decode and encode photo exports in a cancellable worker isolate; reject images above a 100 MP safety bound. |
| QA-06 | Project safety | Medium | Deletion without confirmation can destroy a draft. | Add a confirmation dialog; duplicate and rename stay local. |
| QA-07 | Platform/build validation | High | This checkout does not contain generated Android/iOS projects, and Flutter is not installed in the authoring environment. | Document SDK-specific native generation and required platform permission configuration. A real Flutter build/device test remains a release gate. |
| QA-08 | Video/export/backend scope | High | The current Django project model cannot persist rich video/operation data, and no maintained MP4 encoder is configured. | Keep drafts local, disclose unsupported MP4 rendering, and require a backend migration plus a maintained encoder before enabling cloud sync/video export. |

## Regression checklist

`Implemented` means source behavior is present; it is **not** a substitute for a
device/integration test. `Not run` means this environment lacked Flutter and
native platform projects.

| Flow | Status |
|---|---|
| Launch with valid Supabase session routes to Home | Implemented; not run |
| Launch without a session routes to Welcome/Sign In | Implemented; not run |
| Wrong password shows inline retryable error | Implemented; not run |
| Account creation and email-confirmation handoff | Implemented; Supabase email configuration required; not run |
| Password reset link and return to sign-in | Implemented; email configuration required; not run |
| Photo/video import, permission explanation, retry and settings | Implemented; platform permission configuration required; not run |
| Import cancellation returns to Home | Implemented; not run |
| Photo vs video editor routing | Implemented; not run |
| Local save, app restart, project reopen, rename, duplicate, search, delete | Implemented in SQLite; not run |
| Photo adjustments, filter presets, crop aspect/rotate/flip, undo/redo | Partially implemented; device/image parity not run |
| Before/after comparison | Implemented for current supported preview adjustments; not run |
| JPG/PNG export, gallery save and share sheet | Implemented in source; device permissions/APIs not run |
| Export cancellation | Worker-isolate cancellation implemented; not run |
| Video playback, timeline seek, trim metadata, split marker, speed and volume | Preview/draft controls implemented; not run |
| MP4 export, audio mixing, rendered video title/effects | Not implemented |
| Offline editing | Local import/draft/edit flow implemented; not run |
| Cloud project sync, export history, server-side account deletion | Not implemented |
| 4K/10-minute media, corrupted formats, low storage/memory, rotation, lifecycle | Not run; release/device QA required |
| `flutter analyze`, widget/integration/device tests | Not run: Flutter SDK unavailable |

## Release gates / next steps

1. Generate native projects with the documented Flutter SDK command, configure
   platform permissions, and run `flutter pub get`, `flutter analyze`, and
   `flutter test`.
2. Add widget and integration tests with a local Supabase/Django test setup;
   exercise deep links and auth confirmation/reset redirects.
3. Extend Django project/asset/export models and authorization rules for media
   type, operation stack, asset metadata, signed uploads, ownership, and
   export history. Add offline outbox/conflict handling before enabling sync.
4. Select a maintained native video encoder, implement cancellable background
   rendering, audio/text tracks, export progress notification, and validate
   quality and licensing on Android/iOS.
5. Profile 4K and 10-minute media on low-memory devices; add lifecycle,
   storage-space, thermal/battery, accessibility, and localization testing.
