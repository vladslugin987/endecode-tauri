# ENDEcode Rewrite Checklist (Tauri v2 + Rust + HTML/CSS/TS)

> Target: Cross‑platform desktop (Windows, macOS) with native WebView, compact builds, auto‑updates, and fast file operations in Rust.
> Upstream reference: `endecode-compose` Kotlin project on GitHub (`https://github.com/vladslugin987/endecode-compose`).

## 1) Project Bootstrap
- [ ] Create folder `endecode` (done)
- [ ] Initialize Tauri v2 app with vanilla TS
  - `npm create tauri-app@latest` (or `pnpm`/`yarn`) → choose Vanilla TS
  - App name: ENDEcode
  - Identifier: com.vsdev.endecode
- [ ] Add Tauri plugins: updater, shell, fs, dialog, os, path
- [ ] Configure dev/prod profiles and Windows/macOS build targets

## 2) Domain Features Parity (from endecode-old)
- [ ] Text encoder/decoder (SHIFT=7 Caesar) with markers
  - Prefix: `<<==`, Suffix: `==>>`
  - Functions: encode, decode, addWatermark(text), extractWatermark(content)
- [ ] Invisible watermark in binary tail for videos/images
  - Append bytes `[<<==][encodedText][==>>]`
  - Detect/remove by scanning last N bytes (e.g., 100)
- [ ] Visible watermark on images
  - Draw small semi‑transparent text at configurable positions
  - Default: bottom‑right, white, alpha≈0.5, scale similar to Kotlin version
- [ ] Batch operations
  - Copy source folder into numbered subdirs 001..N
  - Inject text/watermarks into copied files
  - Optional swap of images with number +10
  - Optional pack each copy into ZIP (stored, no compression)
- [ ] Preferences
  - Store JSON in app config dir (e.g., `.endecode` or Tauri appDir)
  - theme_mode, auto_clear_console, last_selected_path (and future auth placeholders)

## 3) Rust Backend (tauri/src)
- [ ] Crates and deps
  - `image` (visible watermark), `zip` (STORED), `walkdir`, `anyhow`, `serde`, `serde_json`
  - Optional: `opencv` crate only if needed; prefer `image` for text draw first
  - `time`/`chrono` for timestamps, `crc32fast` for ZIP CRC
- [ ] Commands (invoke from UI)
  - `encode_text`, `decode_text`
  - `add_tail_watermark(path, text)` / `remove_tail_watermarks(dir)` / `has_watermark(path)` / `extract_tail_watermark(path)`
  - `add_text_to_image(path, text, position)`
  - `batch_copy_and_encode(params)` including progress streaming via events
  - `get_supported_files(dir)` / `is_image` / `is_video`
  - `zip_folder_stored(path)`
- [ ] File scanning rules
  - Supported: txt, jpg, jpeg, png, mp4, avi, mov, mkv
- [ ] Progress + logging
  - Emit `tauri::emit_all` events: `log`, `progress`, `done`, `error`

## 4) Frontend (HTML/CSS/TypeScript)
- [ ] UI Layout parity
  - File picker, name input, Encrypt/Decrypt buttons
  - Batch Copy dialog (copies, baseText, addSwap, addWatermark, createZip, watermarkText, photoNumber)
  - Add Text dialog (text, photoNumber)
  - Delete Watermarks action
  - Progress bar and console output
  - Theme toggle (light/dark)
- [ ] Call Rust commands via `@tauri-apps/api`
- [ ] Handle streamed events for progress/logs

## 5) Auto‑update & Packaging
- [ ] Configure `@tauri-apps/plugin-updater`
- [ ] Release pipeline: Windows MSI, macOS DMG
- [ ] Code signing setup for both platforms (certs/Apple Developer ID)
- [ ] Update feed hosting (GitHub Releases)

## 6) Parity Tests & Validation
- [ ] Golden tests for encode/decode against Kotlin outputs
- [ ] Watermark tail read/write/remove roundtrip on sample files
- [ ] Image watermark visual checks (pixel diff tolerance)
- [ ] Batch copy end‑to‑end smoke tests

## 7) Migration Plan
- [ ] Freeze `endecode-old` as reference
- [ ] Re‑implement features incrementally in Tauri:
  1. Encoding/Decoding (pure functions)
  2. Tail watermark add/extract/has/remove
  3. File scanning and simple encrypt/decrypt
  4. Image text
  5. Batch copy + ZIP + swap
  6. Preferences
  7. UI polish & events
  8. Updater + packaging

## 8) Nice‑to‑Have
- [ ] Drag‑and‑drop file area
- [ ] Keyboard shortcuts
- [ ] i18n
- [ ] Crash/error reporting

## References
- Project to migrate: `endecode-compose` on GitHub (`https://github.com/vladslugin987/endecode-compose`) — features/UI baseline.
- Tauri v2 docs: `https://tauri.app`
- Updater plugin docs: `https://tauri.app/plugin/updater/`
