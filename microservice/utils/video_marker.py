import cv2
import os
import numpy as np

def text_to_bits(text):
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    return ''.join(chr(int(c, 2)) for c in chars if len(c) == 8)

def embed_bits(frame, bits, start_pos=0):
    h, w, _ = frame.shape
    bit_idx = 0
    pixel_count = 0
    for i in range(h):
        for j in range(w):
            for k in range(3):
                if pixel_count >= start_pos and bit_idx < len(bits):
                    frame[i, j, k] = (frame[i, j, k] & ~1) | int(bits[bit_idx])
                    bit_idx += 1
                pixel_count += 1
                if bit_idx >= len(bits):
                    return
    return frame

def extract_bits(frame, num_bits, start_pos=0):
    h, w, _ = frame.shape
    bits = ''
    bit_idx = 0
    pixel_count = 0
    for i in range(h):
        for j in range(w):
            for k in range(3):
                if pixel_count >= start_pos and bit_idx < num_bits:
                    bits += str(frame[i, j, k] & 1)
                    bit_idx += 1
                pixel_count += 1
                if bit_idx >= num_bits:
                    return bits
    return bits

def embed_source_id(video_path, creator_id, output_path):
    cap = cv2.VideoCapture(video_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    bits = text_to_bits(creator_id + '\0')
    embedded = False
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if not embedded:
            embed_bits(frame, bits)
            embedded = True
        out.write(frame)
    cap.release()
    out.release()

def embed_forensic_id(video_path, recipient_id, output_path):
    cap = cv2.VideoCapture(video_path)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    bits = text_to_bits(recipient_id + '\0')
    embedded = False
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if not embedded:
            embed_bits(frame, bits, start_pos=1000)
            embedded = True
        out.write(frame)
    cap.release()
    out.release()

def extract_watermarks(video_path):
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    if not ret:
        return {'original_creator': 'unknown', 'leaked_by_recipient': 'unknown'}
    bits_creator = extract_bits(frame, 1000)
    creator_text = bits_to_text(bits_creator).split('\0')[0]
    bits_recipient = extract_bits(frame, 1000, start_pos=1000)
    recipient_text = bits_to_text(bits_recipient).split('\0')[0]
    cap.release()
    return {'original_creator': creator_text, 'leaked_by_recipient': recipient_text}