FROM node:24-alpine

WORKDIR /app/services/auth-service

COPY services/auth-service/package*.json ./
RUN npm ci --omit=dev

COPY services/auth-service/src ./src
COPY shared/keys/public.pem /app/shared/keys/public.pem

EXPOSE 4001

CMD ["npm", "start"]
