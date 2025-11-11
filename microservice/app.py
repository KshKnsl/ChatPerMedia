from flask import Flask, request, jsonify, send_from_directory
import os
import logging
from werkzeug.utils import secure_filename
from utils.video_marker import embed_source_id as video_source, embed_forensic_id as video_forensic, extract_watermarks as extract_video
from utils.image_marker import embed_source_id as image_source, embed_forensic_id as image_forensic, extract_watermarks as extract_image
from utils.audio_marker import embed_source_id as audio_source, embed_forensic_id as audio_forensic, extract_watermarks as extract_audio

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
    if file_type.startswith('video'):
        return video_source, video_forensic, extract_video
    elif file_type.startswith('image'):
        return image_source, image_forensic, extract_image
    elif file_type.startswith('audio'):
        return audio_source, audio_forensic, extract_audio
    else:
        raise ValueError('Unsupported file type')

def detect_file_type(filename):
    ext = filename.split('.')[-1].lower()
    if ext in ['mp4', 'avi', 'mov']:
        return 'video'
    elif ext in ['jpg', 'jpeg', 'png', 'gif']:
        return 'image'
    elif ext in ['mp3', 'wav']:
        return 'audio'
    else:
        return 'unknown'

@app.route('/api/v1/watermark_source', methods=['POST'])
def watermark_source():
    try:
        logger.info(f"Watermark source request received")
        file = request.files['file']
        creator_id = request.form['creator_id']
        filename = secure_filename(file.filename)
        upload_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(upload_path)
        logger.info(f"File saved: {filename}, creator: {creator_id}")

        file_type = detect_file_type(filename)
        if file_type == 'unknown':
            logger.error(f"Unsupported file type: {filename}")
            return jsonify({'status': 'error', 'message': 'Unsupported file type'})

        funcs = get_marker_functions(file_type)
        source_embed_func = funcs[0]

        master_path = os.path.join(MASTER_FOLDER, f'master_{filename}')
        logger.info(f"Embedding source watermark: {master_path}")
        source_embed_func(upload_path, creator_id, master_path)

        os.remove(upload_path)
        logger.info(f"Source watermark completed: {master_path}")

        return jsonify({'status': 'success', 'masterFilePath': master_path})
    except Exception as e:
        import traceback
        logger.error(f"Error in watermark_source: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/v1/watermark_forensic', methods=['POST'])
def watermark_forensic():
    try:
        data = request.json
        logger.info(f"Forensic watermark request: {data}")
        master_path = data['masterFilePath']
        recipient_id = data['recipient_id']

        filename = os.path.basename(master_path)
        file_type = detect_file_type(filename)
        if file_type == 'unknown':
            logger.error(f"Unsupported file type for forensic: {filename}")
            return jsonify({'status': 'error', 'message': 'Unsupported file type'})

        shared_path = os.path.join(SHARED_FOLDER, f'shared_{recipient_id}_{filename}')

        _, forensic_embed, _ = get_marker_functions(file_type)

        logger.info(f"Embedding forensic watermark for recipient: {recipient_id}")
        forensic_embed(master_path, recipient_id, shared_path)
        logger.info(f"Forensic watermark completed: {shared_path}")

        return jsonify({'status': 'success', 'recipientFilePath': f'/media/shared/{os.path.basename(shared_path)}'})
    except Exception as e:
        logger.error(f"Error in watermark_forensic: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/v1/watermark_extract', methods=['POST'])
def watermark_extract():
    try:
        data = request.json
        logger.info(f"Extract watermark request: {data}")
        file_path = data['file_path']
        filename = os.path.basename(file_path)
        file_type = detect_file_type(filename)
        if file_type == 'unknown':
            logger.error(f"Unsupported file type for extraction: {filename}")
            return jsonify({'status': 'error', 'message': 'Unsupported file type'})

        _, _, extract_func = get_marker_functions(file_type)
        logger.info(f"Extracting watermarks from: {file_path}")
        result = extract_func(file_path)
        logger.info(f"Extraction result: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in watermark_extract: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)