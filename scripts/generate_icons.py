import zlib
import struct
import math
import os

def create_png(width, height, rgba_data):
    # IHDR
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
    # Supersampling 2x for smooth edges
    scale = 2
    w = size * scale
    h = size * scale
    buffer = bytearray(w * h * 4)

    # Theme colors: Indigo gradient background with white/gold emblem
    # Background: rounded rect
    radius = w * 0.22
    cx, cy = w / 2, h / 2

    def inside_rounded_rect(px, py):
        # Bounds inside rounded rect with radius
        dx = max(abs(px - cx) - (w * 0.44 - radius), 0)
        dy = max(abs(py - cy) - (h * 0.44 - radius), 0)
        dist = math.hypot(dx, dy)
        return dist <= radius

    # Pre-render supersampled pixels
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            # Normalized coordinates (-1 to 1)
            nx = (x - cx) / (w * 0.5)
            ny = (y - cy) / (h * 0.5)

            # Check rounded rect
            dx = max(abs(x - cx) - (w * 0.44 - radius), 0)
            dy = max(abs(y - cy) - (h * 0.44 - radius), 0)
            corner_dist = math.hypot(dx, dy)
            
            # Anti-aliased boundary
            if corner_dist > radius + 1.0:
                continue

            alpha_bg = max(0.0, min(1.0, (radius + 1.0 - corner_dist)))

            # Gradient background from Indigo #4f46e5 to Deep Violet #3730a3
            t = (y / h)
            bg_r = int(79 * (1 - t) + 49 * t)
            bg_g = int(70 * (1 - t) + 46 * t)
            bg_b = int(229 * (1 - t) + 129 * t)

            # Draw emblem: Stylized Scales of Justice & Open Law Book
            # Center pole
            pole_w = 0.05
            is_pole = abs(nx) <= pole_w and -0.45 <= ny <= 0.35
            
            # Top beam
            beam_w = 0.52
            beam_h = 0.04
            is_beam = abs(nx) <= beam_w and abs(ny - (-0.28)) <= beam_h
            
            # Top finial / diamond
            is_finial = (abs(nx) + abs(ny - (-0.46))) <= 0.08

            # Left scale pan
            # strings
            is_left_str1 = abs((nx - (-0.42)) - (ny - (-0.28)) * 0.4) <= 0.025 and -0.28 <= ny <= 0.05
            is_left_str2 = abs((nx - (-0.42)) + (ny - (-0.28)) * 0.4) <= 0.025 and -0.28 <= ny <= 0.05
            # pan curve
            pan_left_x = nx - (-0.42)
            pan_left_y = ny - 0.05
            is_left_pan = abs(pan_left_x) <= 0.16 and 0.0 <= pan_left_y <= 0.07 and (pan_left_x**2 / (0.16**2) + pan_left_y / 0.07 <= 1.1)

            # Right scale pan
            pan_right_x = nx - (0.42)
            is_right_str1 = abs((nx - (0.42)) - (ny - (-0.28)) * 0.4) <= 0.025 and -0.28 <= ny <= 0.05
            is_right_str2 = abs((nx - (0.42)) + (ny - (-0.28)) * 0.4) <= 0.025 and -0.28 <= ny <= 0.05
            pan_right_y = ny - 0.05
            is_right_pan = abs(pan_right_x) <= 0.16 and 0.0 <= pan_right_y <= 0.07 and (pan_right_x**2 / (0.16**2) + pan_right_y / 0.07 <= 1.1)

            # Pedestal / Law Book at base
            is_base1 = abs(nx) <= 0.32 and 0.30 <= ny <= 0.38
            is_base2 = abs(nx) <= 0.44 and 0.38 <= ny <= 0.46

            is_emblem = (is_pole or is_beam or is_finial or 
                         is_left_str1 or is_left_str2 or is_left_pan or 
                         is_right_str1 or is_right_str2 or is_right_pan or 
                         is_base1 or is_base2)

            if is_emblem:
                # Crisp white with subtle warm gold highlight on pans & finial
                if is_left_pan or is_right_pan or is_finial:
                    fg_r, fg_g, fg_b = 254, 240, 138 # amber-200
                else:
                    fg_r, fg_g, fg_b = 255, 255, 255
                final_r = int(fg_r)
                final_g = int(fg_g)
                final_b = int(fg_b)
            else:
                final_r = bg_r
                final_g = bg_g
                final_b = bg_b

            buffer[idx] = final_r
            buffer[idx + 1] = final_g
            buffer[idx + 2] = final_b
            buffer[idx + 3] = int(255 * alpha_bg)

    # Downsample by 2x (box filter averaging)
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            r_sum = g_sum = b_sum = a_sum = 0
            for sy in range(2):
                for sx in range(2):
                    s_idx = ((y * 2 + sy) * w + (x * 2 + sx)) * 4
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
                out[out_idx + 3] = int(a_sum / 4)
            else:
                out[out_idx] = out[out_idx + 1] = out[out_idx + 2] = out[out_idx + 3] = 0

    return create_png(size, size, out)

os.makedirs('public/icons', exist_ok=True)
for s in [16, 32, 48, 128, 512]:
    png_bytes = render_icon(s)
    path = f'public/icons/icon-{s}.png'
    with open(path, 'wb') as f:
        f.write(png_bytes)
    print(f'Generated {path} ({s}x{s}, {len(png_bytes)} bytes)')
