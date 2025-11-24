from flask import Flask, request, jsonify, send_from_directory
import os
import logging
import shutil
from werkzeug.utils import secure_filename
from utils.marker import embed_media_id as embed_media_id_util, extract_media_id as extract_media_id_util
import re

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

SERVICE_ROOT = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(SERVICE_ROOT, 'uploads')
MEDIA_ROOT = os.path.join(SERVICE_ROOT, 'media')
MASTER_FOLDER = os.path.join(MEDIA_ROOT, 'master')
SHARED_FOLDER = os.path.join(MEDIA_ROOT, 'shared')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(MASTER_FOLDER, exist_ok=True)
os.makedirs(SHARED_FOLDER, exist_ok=True)

@app.route('/media/<path:filename>')
def serve_media(filename):
    return send_from_directory(MEDIA_ROOT, filename)


@app.route('/internal/list_master', methods=['GET'])
def list_master_files():
    try:
        files = os.listdir(MASTER_FOLDER)
        return jsonify({'files': files})
    except Exception as e:
        logger.error(f"Error listing master files: {e}")
        return jsonify({'error': str(e)}), 500

def get_marker_functions(file_type):
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

        m = re.match(r'^(?:[a-fA-F0-9]{24}_)+(.+)$', filename)
        basename = m.group(1) if m else filename
        output_name = f'{media_id}_{basename}'
        output_path = os.path.join(MASTER_FOLDER, output_name)
        try:
            embed_media_id_util(upload_path, media_id, output_path)
            logger.info(f"Media ID embedding completed: {output_path}")
        except Exception:
            import traceback as _tb
            logger.error(f"Embedding exception traceback:\n{_tb.format_exc()}")
            try:
                shutil.copy(upload_path, output_path)
                logger.info(f"File copied as fallback: {output_path}")
            except Exception as copy_err:
                import traceback as _tb2
                logger.error(f"Fallback copy failed: {copy_err}. Traceback:\n{_tb2.format_exc()}")
                try:
                    os.remove(upload_path)
                except Exception:
                    pass
                return jsonify({'status': 'error', 'message': 'Failed to process media file'}), 500

        try:
            os.remove(upload_path)
        except Exception:
            logger.warning(f"Could not remove temporary upload: {upload_path}")

        abs_output = os.path.abspath(output_path)
        logger.info(f"Checking existence of output file: {abs_output}")
        if not os.path.exists(abs_output):
            logger.error(f"Expected output file does not exist: {abs_output}")
            return jsonify({'status': 'error', 'message': 'Output file not found on server', 'path': abs_output}), 500

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
def extract_media_id():
    try:
        logger.info(f"Extract media ID request received")
        file = request.files.get('file')
        if not file:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400

        filename = secure_filename(file.filename)
        upload_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(upload_path)
        logger.info(f"File saved for extraction: {filename}")

        try:
            result = extract_media_id_util(upload_path)
            logger.info(f"Extraction result: {result}")
        except Exception as ex:
            logger.error(f"Extraction failed: {ex}")
            result = {'status': 'error', 'message': 'Extraction failed'}

        try:
            os.remove(upload_path)
        except Exception:
            pass

        return jsonify(result)
    except Exception as e:
        import traceback
        logger.error(f"Error in extract_media_id: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', '0') == '1'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)