from .image_marker import embed_media_id as _embed_image, extract_media_id as _extract_image
from .video_marker import embed_media_id as _embed_video, extract_media_id as _extract_video

def detect_file_type(filename):
    ext = filename.split('.')[-1].lower()
    if ext in ['mp4', 'avi', 'mov']:
        return 'video'
    elif ext in ['jpg', 'jpeg', 'png', 'gif']:
        return 'image'
    return 'unknown'

def embed_media_id(file_path, media_id, output_path):
    file_type = detect_file_type(file_path)
    if file_type == 'video':
        return _embed_video(file_path, media_id, output_path)
    elif file_type == 'image':
        return _embed_image(file_path, media_id, output_path)
    else:
        raise ValueError('Unsupported file type for embedding')

def extract_media_id(file_path):
    file_type = detect_file_type(file_path)
    if file_type == 'video':
        return _extract_video(file_path)
    elif file_type == 'image':
        return _extract_image(file_path)
    else:
        return {'status': 'error', 'message': 'Unsupported file type'}
