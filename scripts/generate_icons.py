import zlib
import struct
import math
import os

def create_png(width, height, rgba_data):
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0
        raw.extend(rgba_data[y * width * 4:(y + 1) * width * 4])
    idat = zlib.compress(bytes(raw), 9)
    
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', idat)
    png += chunk(b'IEND', b'')
    return png

def render_icon(size):
    # Supersampling: 4x for small sizes, 2x for large
    scale = 4 if size <= 48 else 2
    w = size * scale
    h = size * scale
    buffer = bytearray(w * h * 4)

    radius = w * 0.22
    cx, cy = w / 2, h / 2

    # Column centers along X axis (5 iconic Niemeyer columns)
    col_x_list = [-0.54, -0.27, 0.0, 0.27, 0.54]

    # Star configuration (Majestic AI Star in the sky above the palace)
    star_cx = 0.0
    star_cy = -0.46
    star_r = 0.26      # Primary ray reach
    star_w = 0.08      # Secondary diagonal ray reach

    # Satellite sparkles (constellation accents)
    sat1_x, sat1_y, sat1_r = -0.48, -0.32, 0.08
    sat2_x, sat2_y, sat2_r = 0.48, -0.32, 0.08

    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4

            # Normalized coordinates (-1 to 1)
            nx = (x - cx) / (w * 0.5)
            ny = (y - cy) / (h * 0.5)

            # 1. Rounded rectangle container check
            dx = max(abs(x - cx) - (w * 0.45 - radius), 0)
            dy = max(abs(y - cy) - (h * 0.45 - radius), 0)
            corner_dist = math.hypot(dx, dy)
            if corner_dist > radius + 1.0:
                continue

            alpha_bg = max(0.0, min(1.0, (radius + 1.0 - corner_dist)))

            # 2. Rich Twilight Sky Gradient (Deep Royal Indigo -> Midnight Obsidian)
            # Vertical gradient: y from -1 to 1
            t_vert = (ny + 1.0) * 0.5
            t_vert = max(0.0, min(1.0, t_vert))
            
            # Top: Deep Indigo Violet (#312e81), Mid: Midnight Navy (#1e1b4b), Bottom: Sleek Obsidian (#090d16)
            if t_vert < 0.5:
                u = t_vert * 2.0
                bg_r = int(49 * (1 - u) + 30 * u)
                bg_g = int(46 * (1 - u) + 27 * u)
                bg_b = int(129 * (1 - u) + 75 * u)
            else:
                u = (t_vert - 0.5) * 2.0
                bg_r = int(30 * (1 - u) + 9 * u)
                bg_g = int(27 * (1 - u) + 13 * u)
                bg_b = int(75 * (1 - u) + 22 * u)

            # Soft golden celestial glow in the sky around the AI Star
            dist_to_star = math.hypot(nx - star_cx, ny - star_cy)
            if dist_to_star < 0.70:
                glow = ((1.0 - dist_to_star / 0.70) ** 2.2) * 0.55
                bg_r = min(255, int(bg_r + 250 * glow))
                bg_g = min(255, int(bg_g + 190 * glow))
                bg_b = min(255, int(bg_b + 70 * glow))

            # 3. Geometry of Palácio do Planalto Building
            is_roof = False
            is_glass = False
            is_slab_mid = False
            is_column = False
            col_lit = True
            is_ramp = False
            is_base = False
            is_water = False

            # Base Plaza / Terrace Line
            if 0.50 <= ny <= 0.56 and abs(nx) <= 0.82:
                is_base = True

            # Espelho d'Água (Water reflection under the terrace)
            elif 0.56 < ny <= 0.76 and abs(nx) <= 0.78:
                is_water = True

            # Floating Roof Slab (Horizontal cantilever)
            elif 0.02 <= ny <= 0.09 and abs(nx) <= 0.76:
                is_roof = True

            # Glass Pavilion (Behind the colonnade)
            elif 0.09 < ny < 0.50 and abs(nx) <= 0.68:
                is_glass = True
                # Intermediate floor slab dividing 2nd/3rd floor
                if 0.28 <= ny <= 0.31 and abs(nx) <= 0.67:
                    is_slab_mid = True

            # The 5 Signature Niemeyer Columns (Forefront)
            if 0.09 <= ny <= 0.50:
                for cx_col in col_x_list:
                    rel_x = nx - cx_col
                    if abs(rel_x) <= 0.12:
                        # Normalized vertical position along column height: u in [0, 1]
                        u_col = (ny - 0.09) / 0.41
                        # Niemeyer curve equation:
                        # Top connects at width ~0.045
                        # Curves inward at waist u=0.25 to ~0.025
                        # Flares gracefully outward to width ~0.070 at u=0.65
                        # Tapers down to base point ~0.015 at u=1.0
                        if u_col < 0.25:
                            v = u_col / 0.25
                            w_half = 0.045 * (1 - v) + 0.025 * v
                        elif u_col <= 0.65:
                            v = (u_col - 0.25) / 0.40
                            w_half = 0.025 + (0.070 - 0.025) * math.sin(v * math.pi / 2)
                        else:
                            v = min(1.0, max(0.0, (u_col - 0.65) / 0.35))
                            w_half = 0.070 * (max(0.0, 1.0 - v) ** 1.6) + 0.015 * v

                        if abs(rel_x) <= w_half:
                            is_column = True
                            col_lit = rel_x <= 0.0
                            break

            # The Iconic Presidential Ramp (Rampa do Planalto)
            # Rises from ground (nx=0.36, ny=0.50) up to central 2nd floor (nx=-0.04, ny=0.30)
            if 0.30 <= ny <= 0.50:
                ramp_t = (ny - 0.30) / 0.20  # 0 at top, 1 at ground
                ramp_x = -0.04 * (1 - ramp_t) + 0.36 * ramp_t
                if abs(nx - ramp_x) <= 0.032:
                    is_ramp = True

            # 4. The AI Star (Estrela de IA) in the Sky
            is_star = False
            is_star_core = False
            
            # Primary 4-pointed astroid star: sqrt(|x|) + sqrt(|y|) <= sqrt(r)
            dx_s = abs(nx - star_cx)
            dy_s = abs(ny - star_cy)
            if dx_s < star_r and dy_s < star_r:
                astroid = math.sqrt(dx_s) + math.sqrt(dy_s)
                if astroid <= math.sqrt(star_r):
                    is_star = True
                    if astroid <= math.sqrt(star_r * 0.36):
                        is_star_core = True

            # Diagonal micro-rays of the star
            if not is_star and dx_s < star_w and dy_s < star_w:
                if abs(dx_s - dy_s) <= 0.025 and (dx_s + dy_s) <= star_w * 1.4:
                    is_star = True

            # Satellite Spark 1
            is_sat1 = False
            dx_s1 = abs(nx - sat1_x)
            dy_s1 = abs(ny - sat1_y)
            if dx_s1 < sat1_r and dy_s1 < sat1_r:
                if math.sqrt(dx_s1) + math.sqrt(dy_s1) <= math.sqrt(sat1_r):
                    is_sat1 = True

            # Satellite Spark 2
            is_sat2 = False
            dx_s2 = abs(nx - sat2_x)
            dy_s2 = abs(ny - sat2_y)
            if dx_s2 < sat2_r and dy_s2 < sat2_r:
                if math.sqrt(dx_s2) + math.sqrt(dy_s2) <= math.sqrt(sat2_r):
                    is_sat2 = True

            # 5. Composite Pixel Colors
            if is_star:
                if is_star_core:
                    # Blazing white-gold center
                    fr, fg, fb = 255, 255, 245
                else:
                    # Warm Amber-Gold AI Ray (#fbbf24 / #f59e0b)
                    fr, fg, fb = 251, 191, 36
            elif is_sat1 or is_sat2:
                fr, fg, fb = 253, 224, 71 # Soft gold
            elif is_ramp:
                # Presidential Ramp: Crisp warm white
                fr, fg, fb = 255, 255, 255
            elif is_column:
                if col_lit:
                    # Front Niemeyer Column (Lit side): Pure architectural marble
                    fr, fg, fb = 255, 255, 255
                else:
                    # Front Niemeyer Column (Shaded facet): Architectural cool silver
                    fr, fg, fb = 212, 224, 240
            elif is_roof:
                # Floating Roof Slab: Clean white marble with gold rim on top edge
                if ny <= 0.04:
                    fr, fg, fb = 255, 248, 220
                else:
                    fr, fg, fb = 248, 250, 252
            elif is_slab_mid:
                # Mid floor slab
                fr, fg, fb = 203, 213, 225
            elif is_glass:
                # Tinted Glass Hallway with interior warm illumination
                v_gl = (ny - 0.09) / 0.41
                # Dark cyan/navy glass with subtle warm glow inside
                fr = int(18 * (1 - v_gl) + 40 * v_gl)
                fg = int(35 * (1 - v_gl) + 65 * v_gl)
                fb = int(80 * (1 - v_gl) + 115 * v_gl)
            elif is_base:
                # Foundation terrace
                fr, fg, fb = 226, 232, 240
            elif is_water:
                # Espelho d'Água with soft reflections fading down
                fade = (ny - 0.56) / 0.20
                fr = int(15 * (1 - fade) + bg_r * fade)
                fg = int(35 * (1 - fade) + bg_g * fade)
                fb = int(75 * (1 - fade) + bg_b * fade)
            else:
                fr, fg, fb = bg_r, bg_g, bg_b

            buffer[idx] = fr
            buffer[idx + 1] = fg
            buffer[idx + 2] = fb
            buffer[idx + 3] = int(255 * alpha_bg)

    # Downsample by scale factor (box filter averaging)
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            r_sum = g_sum = b_sum = a_sum = 0
            for sy in range(scale):
                for sx in range(scale):
                    s_idx = ((y * scale + sy) * w + (x * scale + sx)) * 4
                    a = buffer[s_idx + 3]
                    r_sum += buffer[s_idx] * a
                    g_sum += buffer[s_idx + 1] * a
                    b_sum += buffer[s_idx + 2] * a
                    a_sum += a
            out_idx = (y * size + x) * 4
            if a_sum > 0:
                out[out_idx] = int(r_sum / a_sum)
                out[out_idx + 1] = int(g_sum / a_sum)
                out[out_idx + 2] = int(b_sum / a_sum)
                out[out_idx + 3] = int(a_sum / (scale * scale))
            else:
                out[out_idx] = out[out_idx + 1] = out[out_idx + 2] = out[out_idx + 3] = 0

    return create_png(size, size, out)

sizes = [16, 32, 48, 128, 512]
target_dirs = [
    'public/icons',
    'dist/icons',
    'dist/chrome/icons',
    'dist/firefox/icons'
]

for d in target_dirs:
    os.makedirs(d, exist_ok=True)

for s in sizes:
    png_bytes = render_icon(s)
    for d in target_dirs:
        path = os.path.join(d, f'icon-{s}.png')
        with open(path, 'wb') as f:
            f.write(png_bytes)
    print(f'Generated icon-{s}.png ({s}x{s}, {len(png_bytes)} bytes) across all targets.')
