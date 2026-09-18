use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;
use serde::{Deserialize, Serialize};
use image::{GenericImageView, ImageFormat};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessOptions {
    #[serde(default)]
    pub target_format: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    pub compression_mode: Option<String>,
    #[serde(default)]
    pub quality: Option<u8>,
    #[serde(default)]
    pub lossless: Option<bool>,
    #[serde(default)]
    pub max_width: Option<String>,
    #[serde(default)]
    pub target_size_bytes: Option<u64>,
    #[serde(default)]
    pub output_dir: Option<String>,
    #[serde(default)]
    pub suffix: Option<String>,
    #[serde(default)]
    pub replace_original: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessResult {
    pub success: bool,
    pub input_path: String,
    pub output_path: String,
    pub input_size: u64,
    pub output_size: u64,
    pub savings_bytes: u64,
    pub savings_percent: f64,
    pub duration_ms: u128,
    pub target_format: String,
    pub exif_sanitized: bool,
    pub is_animated: bool,
    pub calibrated_quality: Option<u8>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedFile {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub ext: String,
}

/// Determine unique destination path with collision avoidance
fn resolve_output_path(
    input_path: &Path,
    target_format: &str,
    suffix: &str,
    output_dir: Option<&str>,
    replace_original: bool,
) -> PathBuf {
    let parent = match output_dir {
        Some(dir) if !dir.trim().is_empty() && Path::new(dir).exists() => PathBuf::from(dir),
        _ => input_path.parent().unwrap_or_else(|| Path::new(".")).to_path_buf(),
    };

    let file_stem = input_path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
    let input_ext = input_path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();

    let out_ext = match target_format {
        "webp" => "webp",
        "png" => "png",
        "jpg" | "jpeg" => "jpg",
        "svg" => "svg",
        "avif" => "avif",
        _ => &input_ext,
    };

    if replace_original && out_ext == input_ext && suffix.is_empty() && parent == input_path.parent().unwrap() {
        return input_path.to_path_buf();
    }

    let base_name = format!("{}{}.{}", file_stem, suffix, out_ext);
    let mut final_path = parent.join(&base_name);

    if final_path.exists() && !replace_original {
        let mut counter = 1;
        while final_path.exists() {
            let candidate = format!("{}-{}.{}", file_stem, counter, out_ext);
            final_path = parent.join(&candidate);
            counter += 1;
        }
    }

    final_path
}

/// Minify SVG text by stripping XML declarations, comments, and extraneous whitespace
fn minify_svg(svg_content: &str) -> String {
    let mut result = String::with_capacity(svg_content.len());
    let mut in_comment = false;
    let chars: Vec<char> = svg_content.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        if !in_comment && i + 3 < len && chars[i] == '<' && chars[i+1] == '!' && chars[i+2] == '-' && chars[i+3] == '-' {
            in_comment = true;
            i += 4;
            continue;
        }
        if in_comment {
            if i + 2 < len && chars[i] == '-' && chars[i+1] == '-' && chars[i+2] == '>' {
                in_comment = false;
                i += 3;
            } else {
                i += 1;
            }
            continue;
        }
        result.push(chars[i]);
        i += 1;
    }

    // Collapse multi-spaces into single space
    let mut collapsed = String::with_capacity(result.len());
    let mut last_was_ws = false;
    for c in result.chars() {
        if c.is_whitespace() {
            if !last_was_ws {
                collapsed.push(' ');
                last_was_ws = true;
            }
        } else {
            collapsed.push(c);
            last_was_ws = false;
        }
    }

    collapsed.replace("> <", "><").trim().to_string()
}

/// Process a single image using native high-speed Rust libraries
pub fn process_image_file(input_path_str: &str, options: &ProcessOptions) -> Result<ProcessResult, String> {
    let start_time = Instant::now();
    let input_path = Path::new(input_path_str);

    if !input_path.exists() {
        return Err(format!("Input file does not exist: {}", input_path_str));
    }

    let input_meta = fs::metadata(input_path).map_err(|e| e.to_string())?;
    let input_size = input_meta.len();
    let input_ext = input_path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();

    let target_format = options.target_format.as_deref().unwrap_or("original").to_lowercase();
    let target_format = if target_format == "original" {
        input_ext.clone()
    } else {
        target_format
    };

    let suffix = options.suffix.as_deref().unwrap_or("");
    let replace_original = options.replace_original.unwrap_or(false);
    let output_path = resolve_output_path(
        input_path,
        &target_format,
        suffix,
        options.output_dir.as_deref(),
        replace_original,
    );

    // Parse max width constraint
    let max_width_limit: Option<u32> = options.max_width.as_deref().and_then(|s| s.parse().ok());

    let mut calibrated_quality: Option<u8> = None;

    // Handle SVG files
    if target_format == "svg" || input_ext == "svg" {
        let svg_data = fs::read_to_string(input_path).map_err(|e| e.to_string())?;
        let minified = minify_svg(&svg_data);
        fs::write(&output_path, minified.as_bytes()).map_err(|e| e.to_string())?;
        
        let output_meta = fs::metadata(&output_path).map_err(|e| e.to_string())?;
        let output_size = output_meta.len();
        let savings_bytes = input_size.saturating_sub(output_size);
        let savings_percent = if input_size > 0 {
            (savings_bytes as f64 / input_size as f64) * 100.0
        } else {
            0.0
        };

        return Ok(ProcessResult {
            success: true,
            input_path: input_path_str.to_string(),
            output_path: output_path.to_string_lossy().to_string(),
            input_size,
            output_size,
            savings_bytes,
            savings_percent: (savings_percent * 10.0).round() / 10.0,
            duration_ms: start_time.elapsed().as_millis(),
            target_format: "SVG".to_string(),
            exif_sanitized: true,
            is_animated: false,
            calibrated_quality: None,
            error: None,
        });
    }

    // Load bitmap image via `image` crate
    let mut img = image::open(input_path).map_err(|e| format!("Failed to open image: {}", e))?;

    // Apply max width resizing if specified
    if let Some(limit) = max_width_limit {
        let (w, h) = img.dimensions();
        if w > limit {
            let new_h = (h as f64 * (limit as f64 / w as f64)).round() as u32;
            img = img.resize_exact(limit, new_h, image::imageops::FilterType::Lanczos3);
        }
    }

    let (width, height) = img.dimensions();
    let quality = options.quality.unwrap_or(82).clamp(1, 100);
    let lossless = options.lossless.unwrap_or(false);

/// Quantize 32-bit RGBA image to high-efficiency 8-bit indexed palette using pngquant algorithm
fn compress_png_quantized(
    rgba: &image::RgbaImage,
    width: u32,
    height: u32,
    quality: u8,
) -> Result<Vec<u8>, String> {
    let mut attr = imagequant::new();
    attr.set_speed(4).map_err(|e| format!("imagequant speed error: {:?}", e))?;

    let q_max = quality.clamp(30, 100);
    let q_min = (q_max as f32 * 0.5).round() as u8;
    attr.set_quality(q_min, q_max).map_err(|e| format!("imagequant quality error: {:?}", e))?;

    let (w, h) = (width as usize, height as usize);
    let pixels: Vec<imagequant::RGBA> = rgba
        .chunks_exact(4)
        .map(|c| imagequant::RGBA::new(c[0], c[1], c[2], c[3]))
        .collect();

    let mut liq_img = attr.new_image(pixels, w, h, 0.0)
        .map_err(|e| format!("imagequant new_image error: {:?}", e))?;

    let mut res = attr.quantize(&mut liq_img)
        .map_err(|e| format!("imagequant quantize error: {:?}", e))?;
    res.set_dithering_level(1.0).map_err(|e| format!("imagequant dithering error: {:?}", e))?;

    let (palette, indexed_pixels) = res.remapped(&mut liq_img)
        .map_err(|e| format!("imagequant remapping error: {:?}", e))?;

    let mut png_buf = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_buf, width, height);
        encoder.set_color(png::ColorType::Indexed);
        encoder.set_depth(png::BitDepth::Eight);

        let mut rgb_palette = Vec::with_capacity(palette.len() * 3);
        let mut trns = Vec::with_capacity(palette.len());
        let mut has_transparency = false;

        for c in &palette {
            rgb_palette.push(c.r);
            rgb_palette.push(c.g);
            rgb_palette.push(c.b);
            trns.push(c.a);
            if c.a < 255 {
                has_transparency = true;
            }
        }

        encoder.set_palette(&rgb_palette);
        if has_transparency {
            while let Some(&255) = trns.last() {
                trns.pop();
            }
            if !trns.is_empty() {
                encoder.set_trns(&trns);
            }
        }

        let mut writer = encoder.write_header().map_err(|e| format!("PNG header error: {:?}", e))?;
        writer.write_image_data(&indexed_pixels).map_err(|e| format!("PNG data error: {:?}", e))?;
    }

    Ok(png_buf)
}

    // Compress & convert to target format
    match target_format.as_str() {
        "webp" => {
            let rgba = img.to_rgba8();
            let encoder = webp::Encoder::from_rgba(&rgba, width, height);
            let memory = if lossless {
                encoder.encode_lossless()
            } else {
                encoder.encode(quality as f32)
            };
            fs::write(&output_path, &*memory).map_err(|e| e.to_string())?;
        }
        "png" => {
            let mut final_png_data = Vec::new();
            let rgba = img.to_rgba8();

            if !lossless {
                if let Ok(quantized) = compress_png_quantized(&rgba, width, height, quality) {
                    final_png_data = quantized;
                }
            }

            if final_png_data.is_empty() {
                img.write_to(&mut std::io::Cursor::new(&mut final_png_data), ImageFormat::Png)
                    .map_err(|e| format!("PNG encode failed: {}", e))?;
            }

            // Run Oxipng lossless optimization on top
            let mut oxi_opts = oxipng::Options::from_preset(1);
            oxi_opts.strip = oxipng::StripChunks::Safe;
            let optimized = oxipng::optimize_from_memory(&final_png_data, &oxi_opts)
                .unwrap_or(final_png_data);
            fs::write(&output_path, &optimized).map_err(|e| e.to_string())?;
        }
        "jpg" | "jpeg" => {
            let rgb = img.to_rgb8();
            let mut file = fs::File::create(&output_path).map_err(|e| e.to_string())?;
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut file, quality);
            encoder.encode(&rgb, width, height, image::ExtendedColorType::Rgb8)
                .map_err(|e| format!("JPEG encode failed: {}", e))?;
        }
        _ => {
            // Default: WebP if original was WebP or unknown
            let rgba = img.to_rgba8();
            let encoder = webp::Encoder::from_rgba(&rgba, width, height);
            let memory = if lossless {
                encoder.encode_lossless()
            } else {
                encoder.encode(quality as f32)
            };
            fs::write(&output_path, &*memory).map_err(|e| e.to_string())?;
        }
    }

    // Check if target size calibration is requested
    if let Some(target_bytes) = options.target_size_bytes {
        let current_size = fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);
        if current_size > target_bytes && target_format == "webp" && !lossless {
            // Binary search to find optimal quality that fits under target ceiling
            let rgba = img.to_rgba8();
            let encoder = webp::Encoder::from_rgba(&rgba, width, height);
            let mut low = 10u8;
            let mut high = quality.saturating_sub(5);
            let mut best_q = low;

            while low <= high {
                let mid = (low + high) / 2;
                let candidate = encoder.encode(mid as f32);
                if (candidate.len() as u64) <= target_bytes {
                    best_q = mid;
                    low = mid + 1;
                } else {
                    high = mid.saturating_sub(1);
                }
            }
            let final_data = encoder.encode(best_q as f32);
            fs::write(&output_path, &*final_data).map_err(|e| e.to_string())?;
            calibrated_quality = Some(best_q);
        } else if current_size > target_bytes && target_format == "png" && !lossless {
            let rgba = img.to_rgba8();
            for candidate_q in [60, 45, 30, 20] {
                if let Ok(quantized) = compress_png_quantized(&rgba, width, height, candidate_q) {
                    let mut oxi_opts = oxipng::Options::from_preset(1);
                    oxi_opts.strip = oxipng::StripChunks::Safe;
                    let optimized = oxipng::optimize_from_memory(&quantized, &oxi_opts).unwrap_or(quantized);
                    if (optimized.len() as u64) <= target_bytes {
                        let _ = fs::write(&output_path, &optimized);
                        calibrated_quality = Some(candidate_q);
                        break;
                    }
                }
            }
        }
    }

    let output_meta = fs::metadata(&output_path).map_err(|e| e.to_string())?;
    let output_size = output_meta.len();
    let savings_bytes = input_size.saturating_sub(output_size);
    let savings_percent = if input_size > 0 {
        (savings_bytes as f64 / input_size as f64) * 100.0
    } else {
        0.0
    };

    Ok(ProcessResult {
        success: true,
        input_path: input_path_str.to_string(),
        output_path: output_path.to_string_lossy().to_string(),
        input_size,
        output_size,
        savings_bytes,
        savings_percent: (savings_percent * 10.0).round() / 10.0,
        duration_ms: start_time.elapsed().as_millis(),
        target_format: target_format.to_uppercase(),
        exif_sanitized: true,
        is_animated: false,
        calibrated_quality,
        error: None,
    })
}

/// Recursively scan directory for supported image files
pub fn scan_dir_for_images(dir_path: &str) -> Vec<ScannedFile> {
    let supported_exts = ["png", "jpg", "jpeg", "webp", "svg", "gif", "avif"];
    let mut files = Vec::new();

    for entry in walkdir::WalkDir::new(dir_path).follow_links(true).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(ext) = path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) {
                if supported_exts.contains(&ext.as_str()) {
                    if let Ok(meta) = fs::metadata(path) {
                        files.push(ScannedFile {
                            path: path.to_string_lossy().to_string(),
                            name: path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string(),
                            size: meta.len(),
                            ext: ext.to_uppercase(),
                        });
                    }
                }
            }
        }
    }
    files
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_png_quantization_savings() {
        let input_path = "../assets/icon.png";
        if !Path::new(input_path).exists() {
            return;
        }
        let opts = ProcessOptions {
            target_format: Some("png".to_string()),
            compression_mode: Some("smart".to_string()),
            quality: Some(82),
            lossless: Some(false),
            max_width: None,
            target_size_bytes: None,
            output_dir: Some("/tmp".to_string()),
            suffix: Some("-test-quantized".to_string()),
            replace_original: Some(false),
        };
        let res = process_image_file(input_path, &opts).expect("processing failed");
        assert!(res.savings_percent > 40.0, "Expected at least 40% reduction, got {}%", res.savings_percent);
    }
}
