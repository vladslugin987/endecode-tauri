# ENDEcode Migration Checklist
## Анализ Kotlin → Tauri v2 + Rust + TypeScript

На основе анализа оригинального Kotlin проекта `endecode-old/`, вот полный чек-лист того, что нужно реализовать в новой Tauri версии.

---

## ✅ **Уже реализовано в Tauri версии**

### 🎨 **UI/UX**
- ✅ Современный профессиональный дизайн без эмодзи
- ✅ Минималистичный интерфейс с glassmorphism
- ✅ Navbar + Sidebar + Console layout
- ✅ Темная/светлая тема с переключателем
- ✅ Адаптивный дизайн для разных размеров экрана
- ✅ SVG иконки вместо эмодзи
- ✅ Консоль с логированием и временными метками

### 🏗️ **Архитектура**
- ✅ Tauri v2 проект с TypeScript
- ✅ Модульная структура UI компонентов
- ✅ State management на нативном TypeScript
- ✅ Preferences система с JSON storage

### ⚙️ **Базовые функции**
- ✅ Encode/decode текста (Caesar cipher, shift=7)
- ✅ Базовые Tauri команды в Rust
- ✅ Выбор папки через dialog API
- ✅ Консоль с разными типами сообщений
- ✅ Прогресс-бар с анимацией

---

## ❌ **Критичные недостающие функции**

### 🔧 **Rust Backend - СРОЧНО**

#### 1. **Invisible Watermark System**
```rust
// Нужно реализовать:
fn add_tail_watermark(file_path: &str, watermark: &str) -> Result<(), Error>
fn extract_tail_watermark(file_path: &str) -> Result<Option<String>, Error>
fn has_tail_watermark(file_path: &str) -> Result<bool, Error>
fn remove_tail_watermarks_from_dir(dir_path: &str) -> Result<u32, Error>
```

**Что делает в Kotlin:**
- Добавляет байты `<<==ENCODED_TEXT==>>` в конец файлов
- Сканирует последние 100 байтов для поиска маркеров
- Поддерживает старый формат `*/ENCODED_TEXT`

#### 2. **Visible Watermark для изображений**
```rust
// Используя image crate:
fn add_text_to_image(
    image_path: &str, 
    text: &str, 
    position: Option<&str>  // "bottom-right", "center", etc.
) -> Result<(), Error>
```

**Что делает в Kotlin:**
- Использует OpenCV для наложения текста
- Позиционирование: bottom-right по умолчанию
- Прозрачность ~0.5, белый цвет

#### 3. **Batch Copy Operations**
```rust
fn batch_copy_and_encode(
    source_folder: &str,
    num_copies: u32,
    base_text: &str,
    add_swap: bool,
    add_watermark: bool,
    create_zip: bool,
    watermark_text: Option<&str>,
    photo_number: Option<u32>
) -> Result<(), Error>
```

**Что делает в Kotlin:**
- Создает папку `{source}-Copies/`
- Создает подпапки `001/`, `002/`, `003/` и т.д.
- Копирует исходную папку в каждую подпапку
- Применяет invisible watermark с автоинкрементом номера
- Опционально: swap файлов (001 ↔ 011)
- Опционально: visible watermark на указанное фото
- Опционально: создает ZIP архивы (stored, без сжатия)

#### 4. **File Scanning & Utils**
```rust
fn get_supported_files(dir_path: &str) -> Result<Vec<PathBuf>, Error>
fn is_image_file(path: &str) -> bool
fn is_video_file(path: &str) -> bool

// Поддерживаемые форматы:
const SUPPORTED_EXTENSIONS: &[&str] = &["txt", "jpg", "jpeg", "png", "mp4", "avi", "mov", "mkv"];
```

#### 5. **Progress Events**
```rust
// Нужно эмитить события для UI:
tauri::emit_all(app, "progress", ProgressPayload { current: 50, total: 100 });
tauri::emit_all(app, "log", LogPayload { message: "Processing file...", level: "info" });
```

### 📱 **Frontend - Интеграция**

#### 1. **Event Listeners**
```typescript
// В main.ts нужно добавить:
import { listen } from '@tauri-apps/api/event';

await listen('progress', (event) => {
  progressBar.setProgress(event.payload.current / event.payload.total * 100);
});

await listen('log', (event) => {
  consoleManager.log(event.payload.message, event.payload.level);
});
```

#### 2. **Drag & Drop поддержка**
- В Kotlin есть сложная DnD система для папок
- Нужно реализовать через HTML5 drag & drop API
- Валидация что это папка, не файл

#### 3. **Диалоги**
- BatchCopyDialog - настройка всех параметров
- AddTextDialog - текст + номер фото
- DeleteWatermarksDialog - подтверждение

### 🔄 **Функциональная логика**

#### 1. **Name to Inject поле**
- В Kotlin это центральное поле для текста
- Используется для encode/decode операций
- Автоматически инкрементируется в batch операциях

#### 2. **Encrypt/Decrypt Operations**
- **Encrypt**: сканирует папку, добавляет invisible watermark ко всем файлам
- **Decrypt**: сканирует папку, извлекает и декодирует watermark из всех файлов

#### 3. **Auto-clear Console**
- Очищает консоль перед новыми операциями
- Checkbox в UI должен работать

#### 4. **Swap Logic**
- Находит файлы с номерами N и N+10
- Меняет их местами (001.jpg ↔ 011.jpg)
- Используется в batch операциях

---

## 📊 **Приоритеты реализации**

### 🔥 **CRITICAL (Неделя 1)**
1. **Invisible watermark** - основная функция приложения
2. **Encrypt/Decrypt** - базовые операции
3. **File scanning** - поддержка всех форматов

### 🚨 **HIGH (Неделя 2)**
1. **Batch copy operations** - ключевая функция
2. **Visible watermark** для изображений
3. **ZIP archive creation** (stored, no compression)

### ⚠️ **MEDIUM (Неделя 3)**
1. **Drag & Drop** для папок
2. **Progress events** и real-time обновления
3. **Диалоги** для настройки параметров

### 💡 **LOW (Неделя 4)**
1. **Swap logic** для файлов
2. **Profile section** (в Kotlin есть mock данные)
3. **Advanced console features** (поиск, фильтры)

---

## 🎯 **Конкретные задачи на завтра**

### Rust Backend
```bash
# В src-tauri/src/lib.rs добавить:
1. Invisible watermark functions (4 функции)
2. File scanning utilities  
3. Basic image text overlay
4. Progress event emitting
```

### TypeScript Frontend
```bash
# В src/ui/ добавить:
1. Event listeners для progress/log
2. Интеграция с новыми Rust командами
3. Валидация форм перед вызовом команд
4. Диалоги для batch операций
```

---

## 📋 **Тест сценарии для проверки**

### 1. **Invisible Watermark Test**
- Выбрать папку с txt/jpg файлами
- Ввести текст "Test 123" 
- Нажать Encrypt
- Нажать Decrypt
- Результат: видеть "Test 123" в консоли для каждого файла

### 2. **Batch Copy Test**
- Выбрать папку с 3 изображениями
- Base text: "Order 001"
- Copies: 3
- Enable ZIP creation
- Результат: папка `{source}-Copies/` с подпапками 001/, 002/, 003/ и ZIP файлами

### 3. **Visible Watermark Test**
- Выбрать папку с изображениями
- Добавить visible watermark "SAMPLE" на фото #1
- Результат: фото с белым полупрозрачным текстом в углу

---

## 📚 **Справочная информация**

### Kotlin код для reference:
- `BatchUtils.kt` - batch copy logic
- `EncodingUtils.kt` - encode/decode + watermark
- `WatermarkUtils.kt` - invisible watermark operations  
- `ImageUtils.kt` - visible watermark на изображения
- `FileUtils.kt` - file scanning utilities
- `HomeViewModel.kt` - основные операции

### Tauri crates для добавления:
```toml
[dependencies]
image = "0.24"           # для visible watermark
zip = "0.6"              # для ZIP archives  
walkdir = "2.3"          # для file scanning
anyhow = "1.0"           # error handling
regex = "1.5"            # для parsing номеров файлов
```

### Progress tracking pattern:
```rust
// Emit progress events:
let total_files = files.len();
for (i, file) in files.iter().enumerate() {
    // Process file...
    let progress = (i + 1) as f32 / total_files as f32;
    app.emit_all("progress", ProgressPayload { progress }).ok();
}
```

---

**Итого:** ~70% функциональности нужно доделать, в основном в Rust backend. UI уже готов и даже лучше оригинала.
