from PIL import Image
import os
import shutil

src_path = r'C:\Users\T-GAMER\.gemini\antigravity\brain\2b29ad42-6dad-4071-afdb-95d54dfb89ad\.user_uploaded\media_1793915739318_68ada502.png'
im = Image.open(src_path).convert('RGBA')

# Crop to tight bounding box of the non-transparent content
bbox = im.getbbox()
print('Emblem bounding box:', bbox)
emblem = im.crop(bbox)
ew, eh = emblem.size
print(f'Cropped emblem size: {ew}x{eh}')

sizes = [16, 32, 48, 128, 512]
target_dirs = [
    'public/icons',
    'dist/icons',
    'dist/chrome/icons',
    'dist/firefox/icons',
    'docs/icons',
    'dist/docs/icons',
    'dist/chrome/docs/icons',
    'dist/firefox/docs/icons'
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
