from PIL import Image

def text_to_bits(text):
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    return ''.join(chr(int(c, 2)) for c in chars if len(c) == 8 and int(c, 2) != 0)

def embed_bits_in_pixels(img, bits):
    pixels = list(img.getdata())
    new_pixels = []
    bit_idx = 0
    
    for pixel in pixels:
        if isinstance(pixel, int):
            if bit_idx < len(bits):
                new_pixel = (pixel & ~1) | int(bits[bit_idx])
                bit_idx += 1
            else:
                new_pixel = pixel
            new_pixels.append(new_pixel)
        else:
            r, g, b = pixel[:3]
            a = pixel[3] if len(pixel) == 4 else None
            
            if bit_idx < len(bits):
                r = (r & ~1) | int(bits[bit_idx])
                bit_idx += 1
            if bit_idx < len(bits):
                g = (g & ~1) | int(bits[bit_idx])
                bit_idx += 1
            if bit_idx < len(bits):
                b = (b & ~1) | int(bits[bit_idx])
                bit_idx += 1
            
            new_pixels.append((r, g, b, a) if a is not None else (r, g, b))
    
    img.putdata(new_pixels)
    return img

def extract_bits_from_pixels(img, num_bits, start_bit=0):
    pixels = list(img.getdata())
    bits = ''
    bit_idx = 0
    target_end = start_bit + num_bits

    for pixel in pixels:
        if bit_idx >= target_end:
            break

        if isinstance(pixel, int):
            if bit_idx >= start_bit and bit_idx < target_end:
                bits += str(pixel & 1)
            bit_idx += 1
        else:
            r, g, b = pixel[:3]

            if bit_idx >= start_bit and bit_idx < target_end:
                bits += str(r & 1)
            bit_idx += 1
            if bit_idx >= target_end:
                break

            if bit_idx >= start_bit and bit_idx < target_end:
                bits += str(g & 1)
            bit_idx += 1
            if bit_idx >= target_end:
                break

            if bit_idx >= start_bit and bit_idx < target_end:
                bits += str(b & 1)
            bit_idx += 1

    return bits

extract_bits_from_pixels_with_offset = extract_bits_from_pixels

def embed_media_id(image_path, media_id, output_path):
    img = Image.open(image_path)
    media_bytes = media_id
    length = len(media_bytes)
    header_bits = format(length, '032b')
    bits = header_bits + text_to_bits(media_bytes)
    img = embed_bits_in_pixels(img, bits)
    img.save(output_path)

def extract_media_id(image_path):
    img = Image.open(image_path)
    header_bits = extract_bits_from_pixels_with_offset(img, 32, 0)
    if len(header_bits) >= 32:
        try:
            length = int(header_bits, 2)
            if 0 < length <= 1000:
                id_bits = extract_bits_from_pixels_with_offset(img, length * 8, 32)
                if len(id_bits) >= length * 8:
                    extracted_text = bits_to_text(id_bits)
                    return {'status': 'success', 'media_id': extracted_text}
        except Exception:
            pass

    bits = extract_bits_from_pixels(img, 500 * 8)
    extracted_text = bits_to_text(bits)
    if '|END|' in extracted_text:
        media_id = extracted_text.split('|END|')[0].strip()
        return {'status': 'success', 'media_id': media_id}
    return {'status': 'error', 'message': 'No media ID found'}