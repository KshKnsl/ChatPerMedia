from flask import Flask, request, jsonify, send_from_directory
import os
import logging
from werkzeug.utils import secure_filename
from utils.video_marker import embed_media_id as video_embed, extract_media_id as extract_video
from utils.image_marker import embed_media_id as image_embed, extract_media_id as extract_image

app = Flask(__name__)

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

@app.before_request
def log_request():
    logger.info(f"{request.method} {request.path} - {request.remote_addr}")

@app.after_request
def log_response(response):
    logger.info(f"{request.method} {request.path} - Status: {response.status_code}")
    return response

UPLOAD_FOLDER = 'uploads'
MASTER_FOLDER = 'media/master'
SHARED_FOLDER = 'media/shared'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MASTER_FOLDER, exist_ok=True)
os.makedirs(SHARED_FOLDER, exist_ok=True)

@app.route('/media/<path:filename>')
def serve_media(filename):
    return send_from_directory('media', filename)

def get_marker_functions(file_type):
    """Get embedding and extraction functions based on file type"""
    if file_type.startswith('video'):
        return video_embed, extract_video
    elif file_type.startswith('image'):
        return image_embed, extract_image
    else:
        raise ValueError('Unsupported file type')

def detect_file_type(filename):
    ext = filename.split('.')[-1].lower()
    if ext in ['mp4', 'avi', 'mov']:
        return 'video'
    elif ext in ['jpg', 'jpeg', 'png', 'gif']:
        return 'image'
    else:
        return 'unknown'

@app.route('/api/v1/embed_media_id', methods=['POST'])
def embed_media_id():
    """Embed media ID into uploaded file using steganography"""
    try:
        logger.info(f"Embed media ID request received")
        file = request.files['file']
        media_id = request.form['media_id']
        filename = secure_filename(file.filename)
        upload_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(upload_path)
        logger.info(f"File saved: {filename}, media ID: {media_id}")

        file_type = detect_file_type(filename)
        if file_type == 'unknown':
            logger.error(f"Unsupported file type: {filename}")
            return jsonify({'status': 'error', 'message': 'Unsupported file type'})

        embed_func, _ = get_marker_functions(file_type)

        # Create output path with media ID embedded
        output_path = os.path.join(MASTER_FOLDER, f'{media_id}_{filename}')
        logger.info(f"Embedding media ID: {output_path}")
        embed_func(upload_path, media_id, output_path)

        os.remove(upload_path)
        logger.info(f"Media ID embedding completed: {output_path}")

        return jsonify({
            'status': 'success', 
            'filePath': output_path,
            'url': f'/media/master/{os.path.basename(output_path)}'
        })
    except Exception as e:
        import traceback
        logger.error(f"Error in embed_media_id: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/v1/extract_media_id', methods=['POST'])
def extract_media_id_endpoint():
    """Extract media ID from file using steganography"""
    try:
        data = request.json
        logger.info(f"Extract media ID request: {data}")
        file_path = data['file_path']
        
        # Handle relative paths
        if not file_path.startswith('/'):
            file_path = os.path.join(os.getcwd(), file_path)
        
        filename = os.path.basename(file_path)
        file_type = detect_file_type(filename)
        if file_type == 'unknown':
            logger.error(f"Unsupported file type for extraction: {filename}")
            return jsonify({'status': 'error', 'message': 'Unsupported file type'})

        _, extract_func = get_marker_functions(file_type)
        logger.info(f"Extracting media ID from: {file_path}")
        result = extract_func(file_path)
        logger.info(f"Extraction result: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in extract_media_id: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)