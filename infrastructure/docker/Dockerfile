FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache protobuf

COPY package*.json ./
COPY packages/proto-pack/package.json ./packages/proto-pack/
COPY packages/event-contracts/package.json ./packages/event-contracts/
COPY packages/kafka-client/package.json ./packages/kafka-client/
COPY packages/logger/package.json ./packages/logger/
COPY apps/web-client/package.json ./apps/web-client/

RUN npm ci

COPY . .
RUN npx prisma generate --schema=apps/api-gateway/prisma/schema.prisma
RUN npx prisma generate --schema=apps/order-service/prisma/schema.prisma

RUN npm run proto:gen
RUN npx tsc -b
RUN npm run build --workspace=apps/web-client

EXPOSE 4000

CMD ["npm", "run", "start:prod"]