from PIL import Image
import os

def text_to_bits(text):
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    return ''.join(chr(int(c, 2)) for c in chars if len(c) == 8)

def embed_bits(img, bits, start_pos=0):
    pixels = list(img.getdata())
    bit_idx = 0
    pixel_idx = start_pos
    new_pixels = []
    for pixel in pixels:
        if isinstance(pixel, int):
            new_pixel = (pixel & ~1) | int(bits[bit_idx]) if pixel_idx >= start_pos and bit_idx < len(bits) else pixel
            if pixel_idx >= start_pos and bit_idx < len(bits):
                bit_idx += 1
            new_pixels.append(new_pixel)
        else:
            r, g, b, a = (*pixel, None, None, None, None)[:4] if len(pixel) == 4 else (*pixel, None)
            new_r, new_g, new_b = r, g, b
            if pixel_idx >= start_pos and bit_idx < len(bits):
                new_r = (r & ~1) | int(bits[bit_idx])
                bit_idx += 1
            if pixel_idx >= start_pos and bit_idx < len(bits):
                new_g = (g & ~1) | int(bits[bit_idx])
                bit_idx += 1
            if pixel_idx >= start_pos and bit_idx < len(bits):
                new_b = (b & ~1) | int(bits[bit_idx])
                bit_idx += 1
            new_pixels.append((new_r, new_g, new_b, a) if a is not None else (new_r, new_g, new_b))
        pixel_idx += 1
    img.putdata(new_pixels)
    return img

def extract_bits(img, num_bits, start_pos=0):
    pixels = list(img.getdata())
    bits = ''
    bit_idx = 0
    pixel_idx = 0
    for pixel in pixels:
        if pixel_idx >= start_pos and bit_idx < num_bits:
            if isinstance(pixel, int):
                bits += str(pixel & 1)
                bit_idx += 1
            else:
                if len(pixel) == 4:
                    r, g, b, a = pixel
                else:
                    r, g, b = pixel
                bits += str(r & 1)
                bit_idx += 1
                if bit_idx < num_bits:
                    bits += str(g & 1)
                    bit_idx += 1
                if bit_idx < num_bits:
                    bits += str(b & 1)
                    bit_idx += 1
        pixel_idx += 1
        if bit_idx >= num_bits:
            break
    return bits

def embed_source_id(image_path, creator_id, output_path):
    img = Image.open(image_path)
    bits = text_to_bits(creator_id + '\0')
    img = embed_bits(img, bits)
    img.save(output_path)

def embed_forensic_id(image_path, recipient_id, output_path):
    img = Image.open(image_path)
    bits = text_to_bits(recipient_id + '\0')
    img = embed_bits(img, bits, start_pos=1000)
    img.save(output_path)

def extract_watermarks(image_path):
    img = Image.open(image_path)
    bits_creator = extract_bits(img, 1000)
    creator_text = bits_to_text(bits_creator).split('\0')[0]
    bits_recipient = extract_bits(img, 1000, start_pos=1000)
    recipient_text = bits_to_text(bits_recipient).split('\0')[0]
    return {'original_creator': creator_text, 'leaked_by_recipient': recipient_text}