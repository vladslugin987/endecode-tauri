# ENDEcode Design System

Professional design system for ENDEcode application.

## Design Principles

### 1. Professional Minimalism
- **No decorative elements** - every element serves a purpose
- **Clean typography** - system fonts, proper hierarchy
- **Purposeful color** - semantic meaning over decoration
- **Generous whitespace** - breathing room for content

### 2. Human-Centered Interface
- **Intuitive navigation** - natural information flow
- **Contextual feedback** - clear status indicators
- **Progressive disclosure** - complexity when needed
- **Accessible interactions** - keyboard shortcuts, proper focus

### 3. Technical Excellence
- **Performance first** - minimal CSS, efficient selectors
- **Maintainable code** - consistent naming, modular structure
- **Cross-platform** - works on all desktop environments
- **Future-proof** - scalable design tokens

## Layout Structure

```
┌─────────────────────────────────────────┐
│ Navbar (60px)                           │
├─────────────┬───────────────────────────┤
│ Sidebar     │ Main Content Area         │
│ (320px)     │ ├─ Console Panel          │
│             │ │  ├─ Output              │
│             │ │  ├─ Test Result         │
│             │ │  └─ Progress            │
│ ├─ Source   │ └─ [Future: Previews]     │
│ └─ Ops      │                           │
└─────────────┴───────────────────────────┘
```

### Key Improvements
- **Console prominence** - 70% of screen real estate
- **Logical grouping** - Source → Operations → Output
- **Scalable layout** - room for future features

## Color System

### Light Theme
```css
--gray-50: #f9fafb     /* Background */
--gray-100: #f3f4f6    /* Surface */
--gray-200: #e5e7eb    /* Border */
--gray-600: #4b5563    /* Text secondary */
--gray-900: #111827    /* Text primary */
--blue-500: #3b82f6    /* Accent */
```

### Dark Theme
- Inverted gray scale
- Maintained contrast ratios
- Consistent semantic meaning

## Typography

### Font Stack
```css
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
```

### Hierarchy
- **App Title**: 18px, 600 weight
- **Section Titles**: 13px, 600 weight, uppercase
- **Body Text**: 14px, 400 weight
- **Labels**: 12px, 500 weight, uppercase
- **Code**: 12px, monospace

## Spacing Scale

Consistent 4px-based spacing system:
```css
--space-1: 4px    /* Micro spacing */
--space-2: 8px    /* Component padding */
--space-3: 12px   /* Small gaps */
--space-4: 16px   /* Standard spacing */
--space-5: 20px   /* Section padding */
--space-6: 24px   /* Large spacing */
--space-8: 32px   /* Section margins */
```

## Component System

### Buttons
- **Primary**: Blue background, white text
- **Secondary**: Gray background, white text  
- **Danger**: Red background, white text
- **Outline**: Transparent with border
- **Ghost**: Transparent, hover background

**Sizes**: Small (28px), Default (36px), Large (44px)

### Inputs
- **Height**: 36px (consistent with buttons)
- **Border**: Light gray, blue on focus
- **Background**: White/surface color
- **Typography**: 14px body text

### Icons
- **SVG-based** - scalable, semantic
- **16px standard** - consistent sizing
- **Stroke-based** - modern aesthetic
- **2px stroke width** - optimal visibility

## Glass Effect

Subtle glassmorphism implementation:
```css
background: rgba(255, 255, 255, 0.7);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.2);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
```

**Usage**:
- Main console panel
- Navbar overlay
- Modal overlays (future)

## Responsive Behavior

### Breakpoints
- **768px**: Reduce sidebar padding
- **640px**: Stack layout vertically

### Mobile Strategy
- **Sidebar collapses** to overlay
- **Console becomes primary** view
- **Touch-friendly** sizing (44px targets)

## Accessibility

### Focus Management
- **Visible focus rings** - 3px blue outline
- **Logical tab order** - top to bottom, left to right
- **Skip links** - for screen readers

### Color Contrast
- **AA compliance** - 4.5:1 minimum ratio
- **Color independence** - never rely on color alone
- **High contrast mode** - respects system preferences

### Keyboard Navigation
- **All interactive elements** accessible via keyboard
- **Custom shortcuts** - Ctrl+T, Ctrl+L, Ctrl+R
- **Escape handling** - close dialogs, cancel operations

## Implementation Notes

### CSS Architecture
- **Custom properties** for theming
- **Logical properties** where applicable
- **Container queries** for component responsiveness
- **Modern CSS** - grid, flexbox, backdrop-filter

### Performance
- **Minimal CSS** - ~10KB gzipped
- **No animations** on reduced motion
- **Efficient selectors** - avoid deep nesting
- **Critical CSS** inlined for fast loading

### Browser Support
- **Chromium-based** - primary target (Tauri)
- **Webkit fallbacks** - -webkit-backdrop-filter
- **Progressive enhancement** - graceful degradation

## Future Considerations

### Planned Enhancements
- **Preview pane** - image thumbnails
- **Drag & drop zones** - visual feedback
- **Toast notifications** - non-intrusive alerts
- **Command palette** - power user features

### Scalability
- **Design tokens** ready for theming
- **Component library** for consistency
- **Utility classes** for rapid development
- **Plugin architecture** for extensions
