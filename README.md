# ChatPerMedia

A secure, real-time chat and video-sharing platform with end-to-end encryption and forensic watermarking.

## Features

- Real-time chat with Diffie-Hellman key exchange and AES encryption
- Video and image sharing with robust and forensic watermarking to track leaks and identify sources

## Architecture

- **Frontend**: React + Vite + Shadcn/ui + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO + MongoDB
- **Microservice**: Python + Flask for media processing

## Setup

### Local Development

#### Backend Setup

1. Navigate to `backend/`
2. Install dependencies: `pnpm install`
3. Start MongoDB locally
4. Run: `pnpm start`

#### Frontend Setup

1. Navigate to `frontend/`
2. Install dependencies: `pnpm install`
3. Run: `pnpm run dev`

#### Microservice Setup

1. Navigate to `microservice/`
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python app.py`

### Usage

1. Register/Login in the frontend
2. Start chatting and sharing media
3. Media is watermarked for security

## Security

- Messages are encrypted end-to-end
- Media has source and forensic watermarks
- UI prevents right-click and drag for anti-leak measures