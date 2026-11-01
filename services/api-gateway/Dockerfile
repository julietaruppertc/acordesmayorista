FROM node:24-alpine

WORKDIR /app/services/api-gateway

COPY services/api-gateway/package*.json ./
RUN npm ci --omit=dev

COPY services/api-gateway/src ./src
COPY shared/keys/public.pem /app/shared/keys/public.pem

EXPOSE 4000

CMD ["npm", "start"]
