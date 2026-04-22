FROM node:18-alpine

RUN apk add --no-cache curl ffmpeg python3 py3-pip

RUN pip3 install yt-dlp --break-system-packages

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
