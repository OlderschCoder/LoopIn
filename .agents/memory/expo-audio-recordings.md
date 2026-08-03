---
name: expo-audio + file-system recordings
description: How audio recording/persistence works in the mobile app and the privacy rule for deletion
---

# Audio recordings (SafeDate AI mobile)

- Recording uses `expo-audio` (`useAudioRecorder`/`useAudioRecorderState`/`useAudioPlayer`/`useAudioPlayerStatus`), NOT the deprecated `expo-av`.
- Persistence uses `expo-file-system` **v19 new API**: `Paths.document`, `new Directory(...)`, `new File(...)`, `file.copy(dest)`, `file.exists`, `file.delete()`. The old `getInfoAsync`/`copyAsync`/`documentDirectory` API now lives at `expo-file-system/legacy` — do not mix them.
- Recorder writes to a temp/cache uri; copy it into `Paths.document/recordings` on stop so it survives cache purges. Guard all file ops with `Platform.OS !== "web"` (web uses ephemeral blob uris that won't persist across reloads).

**Why:** This is a privacy-first safety app — recordings are sensitive evidence.

**How to apply:** Deleting a recording MUST delete the backing audio file (`new File(uri).delete()` after an `exists` check), not just the AsyncStorage metadata. Validate `file.exists` before playback and surface "file unavailable" if missing. Mic needs `NSMicrophoneUsageDescription` (iOS) + `RECORD_AUDIO` (Android) in app.json.

# Any device-local file archive (recordings, match-profile photos via expo-image-picker, etc.)

Same v19 file API + privacy rules apply to every on-device file store. Two non-obvious rules that bit us in code review:

- **Centralize file deletion in the data layer.** When a parent entity is deleted, delete its backing files inside the AppContext delete fn (e.g. `deleteMatchProfile` loops `target.photos` and unlinks each) — NOT only in the screen's delete handler. Otherwise any other call site that deletes the entity orphans files on disk.
- **Editor screens must not orphan files on cancel/back.** A picker that copies into `Paths.document` immediately leaves files behind if the user backs out before Save. Track copied-but-uncommitted uris in a ref `Set`, delete them in a `useEffect` unmount cleanup, and clear the set on Save. For removing an *already-saved* file mid-edit, defer the unlink to a `pendingDelete` set that only flushes on Save (so backing out doesn't break the still-saved profile). Photos need `NSPhotoLibraryUsageDescription`/`NSCameraUsageDescription` (iOS) + `CAMERA` (Android) + the `expo-image-picker` plugin in app.json.
