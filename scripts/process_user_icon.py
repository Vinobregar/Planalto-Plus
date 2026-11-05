from PIL import Image
import math
import os
import shutil

src_path = r'C:\Users\T-GAMER\.gemini\antigravity\brain\2b29ad42-6dad-4071-afdb-95d54dfb89ad\.user_uploaded\media_1793842912346_70ea4168.jpg'
im = Image.open(src_path).convert('RGB')
w, h = im.size

# Identify plus sign pixels (magenta/violet) to protect the plus and its white halo
is_plus = bytearray(w * h)
for y in range(h):
    for x in range(w):
        r, g, b = im.getpixel((x, y))
        diff = max(abs(r-g), abs(g-b), abs(r-b))
        # Vibrant magenta/pink/violet of the plus sign
        if x > 550 and y > 240 and diff > 35 and b > 140 and (r > 120 or r < 100):
            is_plus[y * w + x] = 1

# Dilate plus sign by 14px to protect the white stroke around it
protect_halo = bytearray(w * h)
halo_radius = 16
for y in range(240, min(h, 490)):
    for x in range(550, min(w, 780)):
        if is_plus[y * w + x]:
            for dy in range(-halo_radius, halo_radius + 1):
                for dx in range(-halo_radius, halo_radius + 1):
                    if dx*dx + dy*dy <= halo_radius*halo_radius:
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            protect_halo[ny * w + nx] = 1

# Determine alpha mask
# Background checkerboard is alternating grey (~209) and light-grey (~247) with almost 0 saturation
out_rgba = Image.new('RGBA', (w, h), (0, 0, 0, 0))
for y in range(h):
    for x in range(w):
        r, g, b = im.getpixel((x, y))
        diff = max(abs(r-g), abs(g-b), abs(r-b))
        brightness = (r + g + b) / 3

        # Check if protected by the plus halo
        if protect_halo[y * w + x]:
            # In the plus region: only checkerboard pixels outside the white halo should be transparent
            # The white halo has r,g,b > 240. The checkerboard has grey squares ~209 and white squares ~247.
            # But the white halo is solid and doesn't alternate with 209!
            # If diff > 15 or brightness < 150 (dark outline of building): keep!
            if diff > 15 or brightness < 120:
                out_rgba.putpixel((x, y), (r, g, b, 255))
            elif r > 235 and g > 235 and b > 235 and is_plus[min(h-1, max(0, y+10)) * w + x]:
                # White halo directly above the plus
                out_rgba.putpixel((x, y), (r, g, b, 255))
            else:
                # Is it checkerboard?
                if diff <= 12 and (brightness >= 180):
                    out_rgba.putpixel((x, y), (0, 0, 0, 0))
                else:
                    out_rgba.putpixel((x, y), (r, g, b, 255))
        else:
            # General area (Building and Sky)
            # Neutral grey/white checkerboard is transparent
            is_checkerboard = (diff <= 14) and (brightness >= 170)
            if is_checkerboard:
                out_rgba.putpixel((x, y), (0, 0, 0, 0))
            else:
                out_rgba.putpixel((x, y), (r, g, b, 255))

# Crop to tight bounding box of the emblem
bbox = out_rgba.getbbox()
print('Emblem bounding box:', bbox)
emblem = out_rgba.crop(bbox)

# Now composite onto square icons with proper padding
ew, eh = emblem.size
print(f'Cropped emblem size: {ew}x{eh}')

sizes = [16, 32, 48, 128, 512]
target_dirs = [
    'public/icons',
    'dist/icons',
    'dist/chrome/icons',
    'dist/firefox/icons'
]

for d in target_dirs:
    os.makedirs(d, exist_ok=True)

# Generate 512x512 master icon first
master_size = 512
# Padding: fit within 92% of the icon width/height
scale = min((master_size * 0.92) / ew, (master_size * 0.92) / eh)
nw = int(ew * scale)
nh = int(eh * scale)
emblem_512 = emblem.resize((nw, nh), Image.Resampling.LANCZOS)

master_icon = Image.new('RGBA', (master_size, master_size), (0, 0, 0, 0))
off_x = (master_size - nw) // 2
off_y = (master_size - nh) // 2
master_icon.paste(emblem_512, (off_x, off_y), emblem_512)

# Save master
master_icon.save('public/icons/icon-512.png')

# Downsample to all standard sizes with Lanczos
for s in sizes:
    if s == 512:
        icon_s = master_icon
    else:
        icon_s = master_icon.resize((s, s), Image.Resampling.LANCZOS)
    
    for d in target_dirs:
        p = os.path.join(d, f'icon-{s}.png')
        icon_s.save(p)
    print(f'Saved {s}x{s} icon across all targets.')

# Also copy to brain artifact directory for display
brain_dir = r'C:\Users\T-GAMER\.gemini\antigravity\brain\2b29ad42-6dad-4071-afdb-95d54dfb89ad'
master_icon.save(os.path.join(brain_dir, 'icon-512.png'))
master_icon.resize((128, 128), Image.Resampling.LANCZOS).save(os.path.join(brain_dir, 'icon-128.png'))
print('All icons generated successfully!')
