// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs::OpenOptions;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use walkdir::WalkDir;
use image::{DynamicImage, Rgba, ImageOutputFormat};
use image::GenericImageView;
use anyhow::anyhow;
use regex::Regex;
use std::fs;
use std::time::SystemTime;
use zip::write::SimpleFileOptions;
use zip::CompressionMethod;
use imageproc::drawing::draw_text_mut;
use rusttype::{Font, Scale};
use dirs::config_dir;

const SHIFT: i32 = 7;
const WATERMARK_PREFIX: &str = "<<==";
const WATERMARK_SUFFIX: &str = "==>>";
const OLD_WATERMARK_PREFIX: &str = "*/";
const TAIL_SCAN_SIZE: usize = 100;

fn shift_char(c: char, shift: i32) -> char {
    if c.is_ascii_uppercase() {
        let base = b'A';
        let idx = (c as u8) - base;
        let shifted = ((idx as i32 + shift).rem_euclid(26)) as u8 + base;
        shifted as char
    } else if c.is_ascii_lowercase() {
        let base = b'a';
        let idx = (c as u8) - base;
        let shifted = ((idx as i32 + shift).rem_euclid(26)) as u8 + base;
        shifted as char
    } else if c.is_ascii_digit() {
        let base = b'0';
        let idx = (c as u8) - base;
        let shifted = ((idx as i32 + shift).rem_euclid(10)) as u8 + base;
        shifted as char
    } else {
        c
    }
}

fn encode_text_impl(input: &str) -> String {
    input.chars().map(|c| shift_char(c, SHIFT)).collect()
}

fn decode_text_impl(input: &str) -> String {
    input.chars().map(|c| shift_char(c, -SHIFT)).collect()
}

#[tauri::command]
fn encode_text(text: &str) -> String {
    encode_text_impl(text)
}

#[tauri::command]
fn decode_text(text: &str) -> String {
    decode_text_impl(text)
}

#[tauri::command]
fn add_watermark_marker(text: &str) -> String {
    format!("{}{}{}", WATERMARK_PREFIX, encode_text_impl(text), WATERMARK_SUFFIX)
}

const MAX_WATERMARK_LENGTH: usize = 100;

fn read_tail(path: &PathBuf, max_len: usize) -> tauri::Result<(Vec<u8>, u64)> {
    let mut f = OpenOptions::new().read(true).open(path)?;
    let file_len = f.metadata()?.len();
    if file_len == 0 { return Ok((Vec::new(), 0)); }
    let read_len = std::cmp::min(max_len as u64, file_len) as usize;
    let mut buf = vec![0u8; read_len];
    f.seek(SeekFrom::End(-(read_len as i64)))?;
    f.read_exact(&mut buf)?;
    Ok((buf, file_len))
}

fn find_bytes(data: &[u8], pattern: &[u8], start_from: usize, reverse: bool) -> Option<usize> {
    if reverse {
        if pattern.len() > data.len() { return None; }
        for i in (start_from..=data.len() - pattern.len()).rev() {
            if &data[i..i + pattern.len()] == pattern { return Some(i); }
        }
        None
    } else {
        data.windows(pattern.len()).skip(start_from).position(|w| w == pattern).map(|p| p + start_from)
    }
}

fn find_watermark(data: &[u8], include_content: bool) -> Option<(usize, usize, Option<Vec<u8>>)> {
    let start = find_bytes(data, WATERMARK_PREFIX.as_bytes(), 0, true)?;
    let end = find_bytes(data, WATERMARK_SUFFIX.as_bytes(), start, false)?;
    if end <= start { return None; }
    let content = if include_content {
        Some(data[start + WATERMARK_PREFIX.len()..end].to_vec())
    } else { None };
    Some((start, end, content))
}


#[derive(serde::Deserialize)]
#[serde(rename_all = "snake_case")]
enum TextPosition {
    TopLeft,
    TopRight,
    Center,
    BottomLeft,
    BottomRight,
}

#[tauri::command]
fn add_text_to_image(path: String, text: String, position: Option<TextPosition>) -> tauri::Result<bool> {
    // Load image
    let p = PathBuf::from(&path);
    let img = image::open(&p).map_err(|e| anyhow!(e))?;

    // TODO: replace with embedded TTF. For now, return Ok(false) if not provided.
    // Using rusttype requires a TTF; skip gracefully if missing.
    let font_bytes: Option<&[u8]> = None;
    let Some(bytes) = font_bytes else { return Ok(false) };
    let font = Font::try_from_bytes(bytes).ok_or_else(|| anyhow!("Font load failed"))?;

    // Parameters similar to Kotlin: small font, semi-transparent white, padding
    let (w, h) = img.dimensions();
    let scale = Scale { x: (w as f32 * 0.02).max(10.0), y: (w as f32 * 0.02).max(10.0) };
    let color = Rgba([255u8, 255u8, 255u8, (0.5 * 255.0) as u8]);
    let padding = 5i32;

    // Measure text size (approx by rusttype)
    let v_metrics = font.v_metrics(scale);
    let glyphs: Vec<_> = font.layout(&text, scale, rusttype::point(0.0, 0.0 + v_metrics.ascent)).collect();
    let width: i32 = glyphs.iter().rev().find_map(|g| {
        g.pixel_bounding_box().map(|bb| bb.max.x as i32)
    }).unwrap_or(0);
    let height: i32 = (v_metrics.ascent - v_metrics.descent).ceil() as i32;

    let pos = match position.unwrap_or(TextPosition::BottomRight) {
        TextPosition::BottomRight => (w as i32 - width - padding, h as i32 - padding),
        TextPosition::BottomLeft => (padding, h as i32 - padding),
        TextPosition::TopRight => (w as i32 - width - padding, height + padding),
        TextPosition::TopLeft => (padding, height + padding),
        TextPosition::Center => (((w as i32 - width) / 2).max(0), ((h as i32 + height) / 2).max(0)),
    };

    // Draw text
    let mut rgba_img = img.to_rgba8();
    draw_text_mut(&mut rgba_img, color, pos.0, pos.1, scale, &font, &text);

    // Save back
    let fmt = match p.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) {
        Some(ref e) if e == "png" => ImageOutputFormat::Png,
        _ => ImageOutputFormat::Jpeg(80),
    };
    let mut out = std::fs::File::create(&p).map_err(|e| anyhow!(e))?;
    let dynimg = DynamicImage::ImageRgba8(rgba_img);
    dynimg.write_to(&mut out, fmt).map_err(|e| anyhow!(e))?;
    Ok(true)
}

fn supported_extensions() -> &'static [&'static str] {
    &["txt", "jpg", "jpeg", "png", "mp4", "avi", "mov", "mkv"]
}

fn is_image_file(path: &PathBuf) -> bool {
    matches!(path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()),
        Some(ref e) if ["jpg","jpeg","png"].contains(&e.as_str()))
}

fn is_video_file(path: &PathBuf) -> bool {
    matches!(path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()),
        Some(ref e) if ["mp4","avi","mov","mkv"].contains(&e.as_str()))
}


fn extract_trailing_number(text: &str) -> i32 {
    let mut digits = String::new();
    for ch in text.chars().rev() {
        if ch.is_ascii_digit() { digits.push(ch); } else { break; }
    }
    if digits.is_empty() { 1 } else { digits.chars().rev().collect::<String>().parse().unwrap_or(1) }
}

fn extract_file_number(name: &str) -> Option<i32> {
    let re = Regex::new(r".*?(\d+).*").ok()?;
    re.captures(name).and_then(|c| c.get(1)).and_then(|m| m.as_str().parse::<i32>().ok())
}

fn swap_files(a: &PathBuf, b: &PathBuf) -> anyhow::Result<()> {
    let parent = a.parent().ok_or_else(|| anyhow!("No parent dir"))?;
    let temp = parent.join(format!("temp_{}_{}", SystemTime::now().duration_since(SystemTime::UNIX_EPOCH)?.as_millis(), a.file_name().unwrap().to_string_lossy()));
    fs::rename(a, &temp)?;
    fs::rename(b, a)?;
    fs::rename(&temp, b)?;
    Ok(())
}

fn add_visible_watermark_in_folder(folder: &PathBuf, text: &str, photo_number: i32) -> anyhow::Result<bool> {
    let mut found = false;
    for file_str in get_supported_files(folder.to_string_lossy().to_string()).map_err(|e| anyhow!(e))? {
        let file_path = PathBuf::from(&file_str);
        if is_image_file(&file_path) {
            if let Some(n) = extract_file_number(file_path.file_name().unwrap().to_string_lossy().as_ref()) {
                if n == photo_number {
                    // Best-effort; if font missing, function returns Ok(false)
                    let _ = add_text_to_image(file_str, text.to_string(), None)?;
                    found = true;
                    break;
                }
            }
        }
    }
    Ok(found)
}

fn create_zip_stored(folder: &PathBuf) -> anyhow::Result<PathBuf> {
    let zip_path = folder.parent().unwrap().join(format!("{}.zip", folder.file_name().unwrap().to_string_lossy()));
    let file = fs::File::create(&zip_path)?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);

    let base = folder.clone();
    for entry in WalkDir::new(&base).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        let rel = p.strip_prefix(&base).unwrap();
        let name = rel.to_string_lossy().replace('\\', "/");
        if p.is_dir() {
            if !name.is_empty() {
                zip.add_directory(format!("{}/", name), options)?;
            }
        } else {
            let data = fs::read(p)?;
            let file_options = options;
            zip.start_file(name, file_options)?;
            zip.write_all(&data)?;
        }
    }
    zip.finish()?;
    Ok(zip_path)
}

fn process_files(folder: &PathBuf, base_text_without_number: &str, order_number: &str) -> anyhow::Result<()> {
    let files = get_supported_files(folder.to_string_lossy().to_string()).map_err(|e| anyhow!(e))?;
    let encoded_text = format!("{} {}", base_text_without_number, order_number);
    let _encoded_for_tail = encode_text_impl(&encoded_text);
    let marker = format!("{}{}{}", WATERMARK_PREFIX, encoded_text, WATERMARK_SUFFIX);

    for file_str in files {
        let file_path = PathBuf::from(&file_str);
        if is_video_file(&file_path) {
            let _ = add_tail_watermark(file_str.clone(), encoded_text.clone()).map_err(|e| anyhow!(e))?;
        } else {
            // Append marker to file if not present
            let mut content = String::new();
            if let Ok(mut f) = fs::File::open(&file_path) {
                use std::io::Read as _;
                let _ = f.read_to_string(&mut content);
            }
            if !content.contains(&marker) {
                let mut f = OpenOptions::new().append(true).create(true).open(&file_path)?;
                f.write_all(marker.as_bytes())?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn batch_copy_and_encode(
    source_folder: String,
    num_copies: i32,
    base_text: String,
    add_swap: bool,
    add_watermark: bool,
    create_zip: bool,
    watermark_text: Option<String>,
    photo_number: Option<i32>
) -> tauri::Result<bool> {
    use fs_extra::dir::{copy as copy_dir, CopyOptions};

    let src = PathBuf::from(&source_folder);
    let copies_folder = src.parent().ok_or_else(|| anyhow!("No parent for source folder"))?.join(format!("{}-Copies", src.file_name().unwrap().to_string_lossy()));
    if !copies_folder.exists() { fs::create_dir_all(&copies_folder).map_err(|e| anyhow!(e))?; }

    let start_number = extract_trailing_number(&base_text);
    let base_text_without_number = base_text.trim_end_matches(|c: char| c.is_ascii_digit()).trim().to_string();

    let mut folders_to_zip: Vec<(PathBuf, String)> = Vec::new();

    for i in 0..num_copies.max(0) {
        let order = start_number + i;
        let order_str = format!("{:03}", order);
        let order_folder = copies_folder.join(&order_str);
        fs::create_dir_all(&order_folder).map_err(|e| anyhow!(e))?;
        let destination_folder = order_folder.join(src.file_name().unwrap());

        let mut opts = CopyOptions::new();
        opts.overwrite = true;
        opts.copy_inside = true;
        copy_dir(&src, &destination_folder, &opts).map_err(|e| anyhow!(e))?;

        process_files(&destination_folder, &base_text_without_number, &order_str).map_err(|e| anyhow!(e))?;

        if add_watermark {
            let actual_photo_number = photo_number.unwrap_or(order);
            let actual_text = watermark_text.clone().unwrap_or(order_str.clone());
            let _ = add_visible_watermark_in_folder(&destination_folder, &actual_text, actual_photo_number).map_err(|e| anyhow!(e))?;
        }

        if add_swap {
            // swap base number with +10
            let base_num = order;
            let swap_num = base_num + 10;
            let file_strings = get_supported_files(destination_folder.to_string_lossy().to_string()).map_err(|e| anyhow!(e))?;
            let images: Vec<PathBuf> = file_strings.into_iter()
                .map(|s| PathBuf::from(s))
                .filter(|p| is_image_file(p))
                .collect();
            let file_a = images.iter().find(|p| extract_file_number(p.file_name().unwrap().to_string_lossy().as_ref()) == Some(base_num)).cloned();
            let file_b = images.iter().find(|p| extract_file_number(p.file_name().unwrap().to_string_lossy().as_ref()) == Some(swap_num)).cloned();
            if let (Some(a), Some(b)) = (file_a, file_b) { let _ = swap_files(&a, &b).map_err(|e| anyhow!(e))?; }
        }

        folders_to_zip.push((destination_folder.clone(), order_str));
    }

    if create_zip {
        for (folder_to_zip, _order_str) in folders_to_zip {
            let _ = create_zip_stored(&folder_to_zip).map_err(|e| anyhow!(e))?;
            let _ = fs::remove_dir_all(&folder_to_zip);
        }
    }

    Ok(true)
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct Preferences {
    theme_mode: Option<String>,
    auto_clear_console: Option<bool>,
    last_selected_path: Option<String>,
}

fn prefs_path() -> anyhow::Result<PathBuf> {
    let base = config_dir().ok_or_else(|| anyhow!("no config dir"))?.join("endecode");
    if !base.exists() { fs::create_dir_all(&base)?; }
    Ok(base.join("preferences.json"))
}

#[tauri::command]
fn load_preferences() -> tauri::Result<Preferences> {
    let p = prefs_path().map_err(|e| anyhow!(e))?;
    if !p.exists() { return Ok(Preferences::default()); }
    let data = fs::read(&p).map_err(|e| anyhow!(e))?;
    let prefs: Preferences = serde_json::from_slice(&data).map_err(|e| anyhow!(e))?;
    Ok(prefs)
}

#[tauri::command]
fn save_preferences(prefs: Preferences) -> tauri::Result<bool> {
    let p = prefs_path().map_err(|e| anyhow!(e))?;
    let data = serde_json::to_vec_pretty(&prefs).map_err(|e| anyhow!(e))?;
    fs::write(&p, data).map_err(|e| anyhow!(e))?;
    Ok(true)
}

// ==================== Invisible Watermark Functions ====================

/// Add watermark to the tail/end of a file
#[tauri::command]
fn add_tail_watermark(path: String, text: String) -> tauri::Result<bool> {
    let encoded_text = encode_text_impl(&text);
    let watermark = format!("{}{}{}", WATERMARK_PREFIX, encoded_text, WATERMARK_SUFFIX);
    
    // Read existing file content
    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(&path)
        .map_err(|e| anyhow!("Failed to open file {}: {}", path, e))?;
    
    // Check if watermark already exists
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| anyhow!("Failed to read file {}: {}", path, e))?;
    
    // Check last TAIL_SCAN_SIZE bytes for existing watermark
    let tail_start = if buffer.len() > TAIL_SCAN_SIZE {
        buffer.len() - TAIL_SCAN_SIZE
    } else {
        0
    };
    let tail_slice = &buffer[tail_start..];
    
    // Convert to string for searching (lossy is ok for watermark detection)
    let tail_str = String::from_utf8_lossy(tail_slice);
    
    // Don't add if watermark already exists
    if tail_str.contains(WATERMARK_PREFIX) || tail_str.contains(OLD_WATERMARK_PREFIX) {
        return Ok(false);
    }
    
    // Append watermark
    file.write_all(watermark.as_bytes())
        .map_err(|e| anyhow!("Failed to write watermark to {}: {}", path, e))?;
    
    Ok(true)
}

/// Check if file has a tail watermark
#[tauri::command]
fn has_tail_watermark(path: String) -> tauri::Result<bool> {
    let mut file = fs::File::open(&path)
        .map_err(|e| anyhow!("Failed to open file {}: {}", path, e))?;
    
    // Read last TAIL_SCAN_SIZE bytes
    let metadata = file.metadata()
        .map_err(|e| anyhow!("Failed to get file metadata {}: {}", path, e))?;
    
    let file_size = metadata.len() as usize;
    if file_size == 0 {
        return Ok(false);
    }
    
    let scan_size = TAIL_SCAN_SIZE.min(file_size);
    let offset = file_size - scan_size;
    
    file.seek(SeekFrom::Start(offset as u64))
        .map_err(|e| anyhow!("Failed to seek in file {}: {}", path, e))?;
    
    let mut buffer = vec![0u8; scan_size];
    file.read_exact(&mut buffer)
        .map_err(|e| anyhow!("Failed to read from file {}: {}", path, e))?;
    
    let content = String::from_utf8_lossy(&buffer);
    Ok(content.contains(WATERMARK_PREFIX) || content.contains(OLD_WATERMARK_PREFIX))
}

/// Extract watermark from file tail
#[tauri::command]
fn extract_tail_watermark(path: String) -> tauri::Result<Option<String>> {
    let mut file = fs::File::open(&path)
        .map_err(|e| anyhow!("Failed to open file {}: {}", path, e))?;
    
    // Read last TAIL_SCAN_SIZE bytes
    let metadata = file.metadata()
        .map_err(|e| anyhow!("Failed to get file metadata {}: {}", path, e))?;
    
    let file_size = metadata.len() as usize;
    if file_size == 0 {
        return Ok(None);
    }
    
    let scan_size = TAIL_SCAN_SIZE.min(file_size);
    let offset = file_size - scan_size;
    
    file.seek(SeekFrom::Start(offset as u64))
        .map_err(|e| anyhow!("Failed to seek in file {}: {}", path, e))?;
    
    let mut buffer = vec![0u8; scan_size];
    file.read_exact(&mut buffer)
        .map_err(|e| anyhow!("Failed to read from file {}: {}", path, e))?;
    
    let content = String::from_utf8_lossy(&buffer);
    
    // Try new format first: <<==ENCODED_TEXT==>>
    if let Some(start_pos) = content.rfind(WATERMARK_PREFIX) {
        let after_prefix = &content[start_pos + WATERMARK_PREFIX.len()..];
        if let Some(end_pos) = after_prefix.find(WATERMARK_SUFFIX) {
            let encoded = &after_prefix[..end_pos];
            let decoded = decode_text_impl(encoded);
            return Ok(Some(decoded));
        }
    }
    
    // Try old format: */ENCODED_TEXT (at end of file)
    if let Some(start_pos) = content.rfind(OLD_WATERMARK_PREFIX) {
        let encoded = &content[start_pos + OLD_WATERMARK_PREFIX.len()..];
        let decoded = decode_text_impl(encoded.trim());
        return Ok(Some(decoded));
    }
    
    Ok(None)
}

/// Remove tail watermarks from all supported files in directory
#[tauri::command]
fn remove_tail_watermarks(dir: String) -> tauri::Result<String> {
    let dir_path = PathBuf::from(&dir);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(anyhow!("Directory does not exist: {}", dir).into());
    }
    
    let mut processed_count = 0;
    let mut removed_count = 0;
    let mut error_count = 0;
    
    // Get all supported files in directory
    for entry in WalkDir::new(&dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file()) {
        
        let path = entry.path();
        let path_str = path.to_string_lossy().to_string();
        
        // Check if it's a supported file type
        if !is_supported_file(path) {
            continue;
        }
        
        processed_count += 1;
        
        match remove_watermark_from_file(&path_str) {
            Ok(true) => removed_count += 1,
            Ok(false) => {}, // No watermark found, that's ok
            Err(_) => error_count += 1,
        }
    }
    
    let result = format!(
        "Watermark removal completed.\nFiles processed: {}\nWatermarks removed: {}\nErrors: {}",
        processed_count, removed_count, error_count
    );
    
    Ok(result)
}

/// Helper function to remove watermark from a single file
fn remove_watermark_from_file(path: &str) -> anyhow::Result<bool> {
    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(path)?;
    
    // Read entire file
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;
    
    if buffer.is_empty() {
        return Ok(false);
    }
    
    // Convert to string (using lossy conversion for watermark detection)
    let content = String::from_utf8_lossy(&buffer);
    let mut modified = false;
    let mut new_content = content.to_string();
    
    // Remove new format watermarks: <<==...==>>
    while let Some(start_pos) = new_content.rfind(WATERMARK_PREFIX) {
        if let Some(end_pos) = new_content[start_pos..].find(WATERMARK_SUFFIX) {
            let actual_end = start_pos + end_pos + WATERMARK_SUFFIX.len();
            new_content = format!("{}{}", &new_content[..start_pos], &new_content[actual_end..]);
            modified = true;
        } else {
            break; // Malformed watermark, stop trying
        }
    }
    
    // Remove old format watermarks: */...
    if let Some(start_pos) = new_content.rfind(OLD_WATERMARK_PREFIX) {
        // Remove everything from the old prefix to end of file
        new_content = new_content[..start_pos].to_string();
        modified = true;
    }
    
    if modified {
        // Write back the cleaned content
        file.seek(SeekFrom::Start(0))?;
        file.set_len(0)?; // Truncate file
        file.write_all(new_content.as_bytes())?;
        file.flush()?;
    }
    
    Ok(modified)
}

/// Helper function to check if file is supported
fn is_supported_file(path: &std::path::Path) -> bool {
    if let Some(extension) = path.extension() {
        if let Some(ext_str) = extension.to_str() {
            let ext_lower = ext_str.to_lowercase();
            return matches!(ext_lower.as_str(), "txt" | "jpg" | "jpeg" | "png" | "mp4" | "avi" | "mov" | "mkv");
        }
    }
    false
}

/// Get list of all supported files in directory
#[tauri::command]
fn get_supported_files(dir: String) -> tauri::Result<Vec<String>> {
    let dir_path = PathBuf::from(&dir);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(anyhow!("Directory does not exist: {}", dir).into());
    }
    
    let mut files = Vec::new();
    
    for entry in WalkDir::new(&dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file()) {
        
        let path = entry.path();
        
        if is_supported_file(path) {
            files.push(path.to_string_lossy().to_string());
        }
    }
    
    // Sort files for consistent ordering
    files.sort();
    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            encode_text,
            decode_text,
            add_watermark_marker,
            has_tail_watermark,
            extract_tail_watermark,
            add_tail_watermark,
            remove_tail_watermarks,
            get_supported_files,
            add_text_to_image,
            load_preferences,
            save_preferences,
            batch_copy_and_encode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
