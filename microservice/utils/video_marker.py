import cv2
import os
import numpy as np

def text_to_bits(text):
    """Convert text to binary string"""
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    """Convert binary string to text"""
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    return ''.join(chr(int(c, 2)) for c in chars if len(c) == 8 and int(c, 2) != 0)

def embed_bits_in_frame(frame, bits):
    """Embed bits into video frame using LSB steganography"""
    h, w, _ = frame.shape
    bit_idx = 0
    
    for i in range(h):
        for j in range(w):
            for k in range(3):  # RGB channels
                if bit_idx < len(bits):
                    frame[i, j, k] = (frame[i, j, k] & ~1) | int(bits[bit_idx])
                    bit_idx += 1
                else:
                    return frame
    return frame

def extract_bits_from_frame(frame, num_bits):
    """Extract bits from video frame using LSB steganography"""
    h, w, _ = frame.shape
    bits = ''
    bit_idx = 0
    
    for i in range(h):
        for j in range(w):
            for k in range(3): 
                if bit_idx < num_bits:
                    bits += str(frame[i, j, k] & 1)
                    bit_idx += 1
                else:
                    return bits
    return bits

def embed_media_id(video_path, media_id, output_path):
    """Embed media ID into video file using steganography"""
    cap = cv2.VideoCapture(video_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    bits = text_to_bits(media_id + '|END|')
    embedded = False
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if not embedded:
            frame = embed_bits_in_frame(frame, bits)
            embedded = True
        
        out.write(frame)
    
    cap.release()
    out.release()

def extract_media_id(video_path):
    """Extract embedded media ID from video file"""
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        return {'status': 'error', 'message': 'Could not read video file'}
    
    bits = extract_bits_from_frame(frame, 500 * 8) 
    extracted_text = bits_to_text(bits)
    
    if '|END|' in extracted_text:
        media_id = extracted_text.split('|END|')[0].strip()
        return {'status': 'success', 'media_id': media_id}
    else:
        return {'status': 'error', 'message': 'No media ID found'}