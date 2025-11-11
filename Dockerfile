FROM node:18-bullseye
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/pnpm-lock.yaml backend/package.json ./backend/
COPY .env* ./backend/
RUN pnpm -C backend install --frozen-lockfile --prod

COPY frontend/pnpm-lock.yaml frontend/package.json ./frontend/
RUN pnpm -C frontend install --frozen-lockfile

COPY microservice/requirements.txt ./microservice/
RUN pip3 install --no-cache-dir -r microservice/requirements.txt

COPY . .
RUN pnpm -C frontend build
RUN mkdir -p backend/uploads/avatars microservice/media/master microservice/media/shared microservice/uploads
RUN npm install -g serve concurrently

EXPOSE 3001
ENV NODE_ENV=production
ENV MONGO_URI=${MONGO_URI}
ENV PORT=3001
CMD sh -c 'pnpm concurrently -n microservice,backend -c magenta,blue \
   "gunicorn --chdir microservice -w 2 -b 0.0.0.0:5000 app:app" \
   "node backend/index.js"'