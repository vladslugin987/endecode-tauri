# ENDEcode UI - Professional Edition

Minimalist, professional interface for ENDEcode text encoding and watermarking application built with Tauri v2.

## Quick Start

```powershell
# Ensure Rust/Cargo is in PATH
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"

# Install dependencies
npm install

# Development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Design Philosophy

✨ **Professional Minimalism**
- Clean, distraction-free interface
- Human-centered design language
- No emoji clutter or "AI-generated" aesthetics
- Focus on functionality and usability

✨ **Modern Architecture**
- Native TypeScript (framework-free)
- Modular component system
- Professional design system with consistent spacing
- Subtle glassmorphism effects

✨ **Enhanced UX**
- Prominent console output panel
- Intuitive sidebar navigation
- SVG iconography
- Responsive layout optimization

✅ **Developer Experience**
- Modular component architecture
- TypeScript with strict type checking
- ESLint-compliant code
- Debug-friendly with global app instance

## Architecture

```
src/
├── main.ts              # Application entry point
├── styles.css           # CSS with theme variables
└── ui/                  # Modular components
    ├── types.ts         # TypeScript interfaces
    ├── state.ts         # Global state management
    ├── console.ts       # Logging system
    ├── preferences.ts   # Settings persistence
    ├── folderPicker.ts  # File dialog integration
    ├── topbar.ts        # Theme toggle & status
    ├── testForm.ts      # Quick testing
    ├── batchForm.ts     # Batch operations
    ├── visibleWatermarkForm.ts # Watermark management
    └── progressBar.ts   # Visual progress feedback
```

## Theme System

The UI supports automatic theme switching based on system preferences:

```css
:root {
  /* Light theme variables */
  --color-bg-primary: #f8fafc;
  --card-bg: rgba(255, 255, 255, 0.85);
}

[data-theme="dark"] {
  /* Dark theme overrides */
  --color-bg-primary: #0f172a;
  --card-bg: rgba(30, 41, 59, 0.85);
}
```

## Backend Integration

All Rust commands are properly typed and integrated:

```typescript
// Example usage
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<boolean>('batch_copy_and_encode', {
  sourceFolder: path,
  numCopies: 2,
  baseText: 'Test 001',
  addSwap: true,
  addWatermark: false,
  createZip: true
});
```

## Keyboard Shortcuts

- `Ctrl+T` - Toggle theme
- `Ctrl+L` - Clear console
- `Ctrl+R` - Run quick test
- `Escape` - Cancel operation (planned)

## Debug Mode

Access debug information in browser dev tools:

```javascript
// Get current application state
window.endecodeApp.exportDebugInfo()

// Restart application
window.endecodeApp.restart()
```

## Known TODOs

- [ ] Implement file enumeration for visible watermarks
- [ ] Add operation cancellation support
- [ ] Fix folder opening in explorer functionality
- [ ] Add drag & drop support for folders
- [ ] Implement real-time progress streaming

## Dependencies

- **@tauri-apps/api**: Core Tauri functionality
- **@tauri-apps/plugin-dialog**: File/folder selection
- **@tauri-apps/plugin-opener**: System integration (limited support)

## Build Output

- `dist/` - Vite build output
- `src-tauri/target/` - Rust build artifacts
- `src-tauri/target/release/bundle/` - Final application packages