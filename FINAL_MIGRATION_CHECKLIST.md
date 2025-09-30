# 🎯 ENDEcode: Полный Чек-лист Миграции Kotlin→Tauri
## Анализ endecode-compose → endecode-tauri

**Цель:** Максимально идентичная копия функционала с современным дизайном

---

## ✅ **ЧТО УЖЕ РАБОТАЕТ** (80% функционала готов!)

### 🎨 **UI/UX - ОТЛИЧНО**
- ✅ Профессиональный минималистичный дизайн (лучше оригинала)
- ✅ Темная/светлая тема с переключателем
- ✅ Консоль с цветным логированием и временными метками
- ✅ Прогресс-бар с анимацией
- ✅ Модальные окна и настройки
- ✅ Многоязычность (i18n: en, ru, es)
- ✅ Адаптивная верстка

### 🔧 **Rust Backend - ГОТОВО**
- ✅ `encode_text / decode_text` (Caesar shift=7)
- ✅ `add_tail_watermark` - невидимый watermark в конец файла
- ✅ `extract_tail_watermark` - извлечение watermark
- ✅ `has_tail_watermark` - проверка наличия
- ✅ `remove_tail_watermarks` - удаление из всех файлов
- ✅ `get_supported_files` - сканирование папки
- ✅ `batch_copy_and_encode` - батч-копирование с watermark
- ✅ `load_preferences / save_preferences` - настройки

### 📱 **Frontend - РАБОТАЕТ**
- ✅ Выбор папки через dialog API
- ✅ Encrypt/Decrypt операции
- ✅ Quick Test (encode/decode)
- ✅ Batch Copy форма (все поля)
- ✅ Remove Watermarks кнопка
- ✅ Валидация форм
- ✅ State management
- ✅ Console с разными типами сообщений

---

## ❌ **ЧТО НЕ РАБОТАЕТ / ТРЕБУЕТ ДОРАБОТКИ**

### 🚨 **КРИТИЧНЫЕ БАГИ**

#### 1. **Visible Watermark НЕ РЕАЛИЗОВАН**
**Файл:** `src-tauri/src/lib.rs` строки 115-161

**Проблема:**
```rust
fn add_text_to_image(...) -> tauri::Result<bool> {
    let font_bytes: Option<&[u8]> = None; // ← НЕТ ШРИФТА!
    let Some(bytes) = font_bytes else { return Ok(false) }; // ← ВСЕГДА FALSE
```

**Что нужно:**
- [ ] Добавить embedded TTF шрифт в проект
- [ ] Или использовать системный шрифт через `rusttype` или `fontdb`
- [ ] Реализовать наложение текста на изображение (как в Kotlin/OpenCV)
- [ ] Параметры: белый цвет, прозрачность 0.5, позиция bottom-right

**Приоритет:** 🔥 **HIGH**

---

#### 2. **Visible Watermark UI - Mock Implementation**
**Файл:** `src/ui/visibleWatermarkForm.ts` строки 108-131

**Проблема:**
```typescript
// TODO: Visible watermark feature needs proper file enumeration
const mockFilePath = `${selectedPath}\\photo_${photoNumber}.jpg`; // Placeholder!
consoleManager.warning('TODO: Visible watermark feature needs proper file enumeration');
```

**Что нужно:**
- [ ] Получить список файлов из папки (`get_supported_files`)
- [ ] Отфильтровать только изображения
- [ ] Найти файл с номером N (по имени или по порядку)
- [ ] Вызвать `add_text_to_image` с реальным путем

**Приоритет:** 🔥 **HIGH**

---

#### 3. **Swap Logic - Частично реализован**
**Файл:** `src-tauri/src/lib.rs` строки 313-323

**Статус:** Код есть, но не протестирован!

```rust
if add_swap {
    let base_num = order;
    let swap_num = base_num + 10; // Меняет N ↔ N+10
    // ... swap logic ...
}
```

**Что проверить:**
- [ ] Тестировать swap на реальных файлах (001.jpg ↔ 011.jpg)
- [ ] Убедиться что файлы действительно меняются местами
- [ ] Проверить edge cases (файл не существует, нет прав и т.д.)

**Приоритет:** ⚠️ **MEDIUM**

---

#### 4. **ZIP Archives - Реализовано, но не протестировано**
**Файл:** `src-tauri/src/lib.rs` строки 218-242, 329-334

**Статус:** Функция `create_zip_stored` готова, используется в batch операции

**Что проверить:**
- [ ] Создается ли ZIP архив после batch операции?
- [ ] Используется ли STORED (без сжатия) метод?
- [ ] Правильная ли структура папок в ZIP?
- [ ] Удаляются ли исходные папки после создания ZIP?

**Приоритет:** ⚠️ **MEDIUM**

---

#### 5. **Progress Events - НЕТ Real-time обновлений**
**Файл:** `src/ui/fileOperations.ts`, `batchForm.ts`

**Проблема:**
```typescript
const progressPromise = progressBar.simulateProgress(5000); // ← СИМУЛЯЦИЯ!
```

Прогресс-бар не показывает реальный прогресс операции, только симулирует!

**Что нужно в Rust:**
```rust
// В batch_copy_and_encode и других длительных операциях:
use tauri::Manager;

#[tauri::command]
fn batch_copy_and_encode(
    app: tauri::AppHandle, // ← Добавить параметр
    // ... другие параметры
) -> tauri::Result<bool> {
    for i in 0..num_copies {
        // ... работа ...
        
        // Emit progress event
        app.emit_all("progress", serde_json::json!({
            "current": i + 1,
            "total": num_copies,
            "message": format!("Processing copy {}/{}", i+1, num_copies)
        })).ok();
    }
}
```

**Что нужно в TypeScript:**
```typescript
import { listen } from '@tauri-apps/api/event';

await listen('progress', (event: any) => {
    const { current, total, message } = event.payload;
    const percent = (current / total) * 100;
    progressBar.setProgress(percent);
    consoleManager.info(message);
});
```

**Приоритет:** 🔥 **HIGH** (для UX)

---

#### 6. **Open Folder - НЕ РАБОТАЕТ**
**Файл:** `src/ui/folderPicker.ts` (вероятно)

**Проблема:** Кнопка "Open Folder" рядом с выбранным путем не открывает Explorer/Finder

**Что нужно:**
```typescript
import { open } from '@tauri-apps/plugin-opener';

async function openFolderInExplorer(path: string) {
    try {
        await open(path);
    } catch (error) {
        consoleManager.error(`Failed to open folder: ${error}`);
    }
}
```

**Приоритет:** 💡 **LOW** (nice to have)

---

### 🎯 **ФУНКЦИОНАЛЬНЫЕ ОТЛИЧИЯ ОТ KOTLIN ВЕРСИИ**

#### 7. **Profile Section - Отсутствует**
В Kotlin версии есть mock данные для "Profile" (имя пользователя, статистика).

**Статус:** В Tauri версии нет

**Нужно ли:** Скорее всего НЕТ (было заглушкой в Kotlin)

**Приоритет:** 💡 **SKIP** (не критично)

---

#### 8. **Drag & Drop - Отсутствует**
В Kotlin/Compose была поддержка drag-and-drop для папок.

**Что добавить:**
```typescript
// В main.ts или folderPicker.ts
const dropZone = document.getElementById('app-container');

dropZone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    const firstItem = files[0];
    
    if (firstItem && firstItem.type === '') { // Папка
        const path = (firstItem as any).path; // Tauri specific
        folderPicker.setPath(path);
    }
});
```

**Приоритет:** ⚠️ **MEDIUM** (удобство)

---

#### 9. **Auto-clear Console - Checkbox не работает?**
**Файл:** Нужно проверить `preferences.ts` и `console.ts`

**Проверить:**
- [ ] Сохраняется ли настройка `auto_clear_console` в preferences?
- [ ] Очищается ли консоль автоматически перед новыми операциями?
- [ ] Работает ли toggle в Settings?

**Приоритет:** 💡 **LOW**

---

## 📊 **СРАВНЕНИЕ АРХИТЕКТУРЫ**

| Функция | Kotlin/Compose | Tauri/Rust | Статус |
|---------|----------------|------------|--------|
| **Encode/Decode** | EncodingUtils.kt | ✅ lib.rs | ✅ **Работает** |
| **Invisible Watermark** | WatermarkUtils.kt | ✅ lib.rs | ✅ **Работает** |
| **Visible Watermark** | ImageUtils.kt (OpenCV) | ❌ lib.rs (mock) | ❌ **НЕ РАБОТАЕТ** |
| **Batch Copy** | BatchUtils.kt | ✅ lib.rs | ✅ **Работает (не тестировано)** |
| **File Scanning** | FileUtils.kt | ✅ lib.rs | ✅ **Работает** |
| **ZIP Archives** | BatchUtils.kt | ✅ lib.rs | ⚠️ **Не тестировано** |
| **Swap Files** | BatchUtils.kt | ✅ lib.rs | ⚠️ **Не тестировано** |
| **Preferences** | SharedPreferences | ✅ lib.rs + JSON | ✅ **Работает** |
| **Progress Events** | Flow/LiveData | ❌ Симуляция | ❌ **Нужно добавить emit** |
| **UI Theme** | Material3 Dark/Light | ✅ CSS Variables | ✅ **Работает (лучше!)** |
| **Dialogs** | Compose Dialog | ✅ Modal Manager | ✅ **Работает** |
| **i18n** | Нет | ✅ JSON файлы | ✅ **Работает (лучше!)** |

---

## 🔥 **ПРИОРИТЕТНЫЙ ПЛАН ИСПРАВЛЕНИЙ**

### **Неделя 1: Критичные баги**
1. ⚠️ **Visible Watermark** (add_text_to_image)
   - Добавить embedded шрифт
   - Протестировать на реальных изображениях
   - Интегрировать в UI

2. ⚠️ **Visible Watermark UI** (visibleWatermarkForm.ts)
   - Реализовать file enumeration
   - Найти N-ое изображение по номеру
   - Убрать mock implementation

3. ⚠️ **Progress Events**
   - Добавить `app.emit_all()` в Rust
   - Подключить `listen()` в TypeScript
   - Реальный прогресс-бар

### **Неделя 2: Тестирование**
4. ✅ **Batch Copy Operations**
   - E2E тест на реальных папках
   - Проверить watermark injection
   - Проверить swap logic
   - Проверить ZIP creation

5. ✅ **Все операции**
   - Encrypt/Decrypt большой папки (100+ файлов)
   - Batch copy с 10+ копиями
   - Remove watermarks

### **Неделя 3: Полировка**
6. 💡 **Drag & Drop**
7. 💡 **Open Folder кнопка**
8. 💡 **Auto-clear Console**

---

## 🧪 **ТЕСТ-КЕЙСЫ ДЛЯ ПРОВЕРКИ**

### **Test 1: Invisible Watermark (ПРОЙДЕН ✅)**
```
1. Создать папку с test.txt
2. Select Folder
3. Encrypt: "Document_001"
4. Decrypt → должен показать "Document_001"
5. Remove Watermarks
6. Decrypt → "No watermark"
```

### **Test 2: Batch Copy (НУЖНО ПРОТЕСТИРОВАТЬ)**
```
1. Папка с 3 файлами (001.jpg, 002.txt, 003.png)
2. Batch Form:
   - Base text: "Order 001"
   - Copies: 3
   - ✓ Create ZIP
   - ✓ Add Swap
3. Run → должно создать:
   - {source}-Copies/001/{files with watermark}
   - {source}-Copies/002/{files with watermark}
   - {source}-Copies/003/{files with watermark}
   - 001.zip, 002.zip, 003.zip
4. Проверить swap: 001.jpg ↔ 011.jpg в каждой копии
```

### **Test 3: Visible Watermark (НЕ РАБОТАЕТ ❌)**
```
1. Папка с image_001.jpg, image_002.jpg
2. Watermark Management:
   - Text: "SAMPLE"
   - Photo Number: 1
3. Add Visible Watermark
4. Открыть image_001.jpg → должен быть текст "SAMPLE" (белый, прозрачный, bottom-right)
```

### **Test 4: Real Progress (НЕ РАБОТАЕТ ❌)**
```
1. Папка с 50+ файлами
2. Encrypt
3. Прогресс-бар должен обновляться по мере обработки файлов (не симуляция!)
```

---

## 📝 **TODO LIST**

### **Срочно (This Week)**
- [ ] Добавить embedded шрифт для visible watermark
- [ ] Реализовать `add_text_to_image` полностью
- [ ] Исправить `visibleWatermarkForm.ts` (file enumeration)
- [ ] Добавить progress events (Rust emit → TS listen)
- [ ] Протестировать batch copy на реальных данных

### **Важно (Next Week)**  
- [ ] Протестировать ZIP creation
- [ ] Протестировать swap logic
- [ ] Добавить drag & drop для папок
- [ ] Исправить "Open Folder" кнопку
- [ ] E2E тесты всех операций

### **Желательно (Later)**
- [ ] Проверить auto-clear console
- [ ] Добавить keyboard shortcuts (Ctrl+E для Encrypt и т.д.)
- [ ] Оптимизировать большие batch операции
- [ ] Добавить cancellation для длительных операций

---

## 🎯 **ИТОГОВЫЙ ВЕРДИКТ**

### ✅ **Что ОТЛИЧНО получилось:**
1. **UI/UX** - даже лучше оригинала! Минималистичный, профессиональный.
2. **Invisible Watermark** - работает на 100%, протестировано.
3. **Консоль** - удобнее чем в Kotlin версии.
4. **Архитектура** - чище и модульнее.
5. **i18n** - есть в Tauri, не было в Kotlin.

### ⚠️ **Что нужно ДОДЕЛАТЬ:**
1. **Visible Watermark** - критично, основная функция не работает.
2. **Progress Events** - UX страдает без реального прогресса.
3. **Тестирование** - batch copy не протестирован на реальных данных.

### 📊 **Процент готовности:**
- **UI/Frontend:** 95% ✅
- **Rust Backend:** 85% ⚠️ (visible watermark + progress events)
- **Тестирование:** 40% ❌
- **Общий:** **~75%** 🎯

---

## 🚀 **Следующие шаги (Priority Order)**

1️⃣ **Исправить Visible Watermark** (критично для feature parity)
2️⃣ **Добавить Progress Events** (критично для UX)
3️⃣ **Протестировать Batch Copy** (убедиться что работает как в Kotlin)
4️⃣ **Полировка** (drag&drop, open folder, auto-clear)

**Время до полной готовности:** ~1-2 недели при активной разработке.

---

**Вывод:** Проект очень близок к завершению! Основной функционал портирован, осталось доделать visible watermark и протестировать batch операции. 🎉
