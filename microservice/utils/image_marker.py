from PIL import Image
import os

def text_to_bits(text):
    """Convert text to binary string"""
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    """Convert binary string to text"""
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    return ''.join(chr(int(c, 2)) for c in chars if len(c) == 8 and int(c, 2) != 0)

def embed_bits_in_pixels(img, bits):
    """Embed bits into image pixels using LSB steganography"""
    pixels = list(img.getdata())
    new_pixels = []
    bit_idx = 0
    
    for pixel in pixels:
        if isinstance(pixel, int):  # Grayscale
            if bit_idx < len(bits):
                new_pixel = (pixel & ~1) | int(bits[bit_idx])
                bit_idx += 1
            else:
                new_pixel = pixel
            new_pixels.append(new_pixel)
        else:  # RGB or RGBA
            r, g, b = pixel[:3]
            a = pixel[3] if len(pixel) == 4 else None
            
            # Embed in R channel
            if bit_idx < len(bits):
                r = (r & ~1) | int(bits[bit_idx])
                bit_idx += 1
            # Embed in G channel
            if bit_idx < len(bits):
                g = (g & ~1) | int(bits[bit_idx])
                bit_idx += 1
            # Embed in B channel
            if bit_idx < len(bits):
                b = (b & ~1) | int(bits[bit_idx])
                bit_idx += 1
            
            new_pixels.append((r, g, b, a) if a is not None else (r, g, b))
    
    img.putdata(new_pixels)
    return img

def extract_bits_from_pixels(img, num_bits):
    """Extract bits from image pixels using LSB steganography"""
    pixels = list(img.getdata())
    bits = ''
    bit_idx = 0
    
    for pixel in pixels:
        if bit_idx >= num_bits:
            break
        
        if isinstance(pixel, int):  # Grayscale
            bits += str(pixel & 1)
            bit_idx += 1
        else:  # RGB or RGBA
            r, g, b = pixel[:3]
            
            if bit_idx < num_bits:
                bits += str(r & 1)
                bit_idx += 1
            if bit_idx < num_bits:
                bits += str(g & 1)
                bit_idx += 1
            if bit_idx < num_bits:
                bits += str(b & 1)
                bit_idx += 1
    
    return bits

def embed_media_id(image_path, media_id, output_path):
    """Embed media ID into image file using steganography"""
    img = Image.open(image_path)
    
    # Add delimiter to mark end of media ID
    bits = text_to_bits(media_id + '|END|')
    img = embed_bits_in_pixels(img, bits)
    img.save(output_path)

def extract_media_id(image_path):
    """Extract embedded media ID from image file"""
    img = Image.open(image_path)
    
    # Extract enough bits for media ID (MongoDB ObjectId is 24 chars + delimiter)
    bits = extract_bits_from_pixels(img, 500 * 8)  # 500 chars max
    extracted_text = bits_to_text(bits)
    
    # Find media ID (before delimiter)
    if '|END|' in extracted_text:
        media_id = extracted_text.split('|END|')[0].strip()
        return {'status': 'success', 'media_id': media_id}
    else:
        return {'status': 'error', 'message': 'No media ID found'}