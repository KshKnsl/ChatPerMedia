FROM node:18-bullseye
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/pnpm-lock.yaml backend/package.json backend/.env ./backend/
RUN pnpm -C backend install --frozen-lockfile --prod

COPY frontend/pnpm-lock.yaml frontend/package.json ./frontend/
RUN pnpm -C frontend install --frozen-lockfile \
 && pnpm -C frontend build

 COPY microservice/requirements.txt ./microservice/
RUN pip3 install --no-cache-dir -r microservice/requirements.txt

COPY . .
RUN mkdir -p backend/uploads/avatars microservice/media/master microservice/media/shared microservice/uploads
RUN pnpm add -w serve concurrently

EXPOSE 3001 5000 4173
ENV NODE_ENV=production
ENV MONGO_URI=${MONGO_URI}
CMD sh -c 'pnpm concurrently -n backend,frontend,microservice -c blue,green,magenta \
	"node backend/index.js" \
	"serve -s frontend/dist -l 4173" \
	"python3 -u microservice/app.py"'