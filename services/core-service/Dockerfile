FROM node:26-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds
COPY scripts ./scripts

EXPOSE 4002

CMD ["npm", "start"]
