FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p data
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/data/events.db
EXPOSE 3000
CMD ["npm", "start"]
