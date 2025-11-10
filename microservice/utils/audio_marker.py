from pydub import AudioSegment
import os
import array

def text_to_bits(text):
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    chars = [bits[i:i+8] for i in range(0, len(bits), 8)]
    return ''.join(chr(int(c, 2)) for c in chars if len(c) == 8)

def embed_bits(samples, bits, start_pos=0):
    for i, bit in enumerate(bits):
        if start_pos + i < len(samples):
            samples[start_pos + i] = (samples[start_pos + i] & ~1) | int(bit)
    return samples

def extract_bits(samples, num_bits, start_pos=0):
    return ''.join(str(samples[i] & 1) for i in range(start_pos, min(start_pos + num_bits, len(samples))))

def embed_source_id(audio_path, creator_id, output_path):
    audio = AudioSegment.from_file(audio_path)
    samples = array.array('h', audio.raw_data)
    bits = text_to_bits(creator_id + '\0')
    samples = embed_bits(samples, bits)
    audio._data = samples.tobytes()
    audio.export(output_path, format='mp3')

def embed_forensic_id(audio_path, recipient_id, output_path):
    audio = AudioSegment.from_file(audio_path)
    samples = array.array('h', audio.raw_data)
    bits = text_to_bits(recipient_id + '\0')
    samples = embed_bits(samples, bits, start_pos=1000)
    audio._data = samples.tobytes()
    audio.export(output_path, format='mp3')

def extract_watermarks(audio_path):
    audio = AudioSegment.from_file(audio_path)
    samples = array.array('h', audio.raw_data)
    bits_creator = extract_bits(samples, 1000)
    creator_text = bits_to_text(bits_creator).split('\0')[0]
    bits_recipient = extract_bits(samples, 1000, start_pos=1000)
    recipient_text = bits_to_text(bits_recipient).split('\0')[0]
    return {'original_creator': creator_text, 'leaked_by_recipient': recipient_text}