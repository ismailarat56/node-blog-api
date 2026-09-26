FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

RUN mkdir -p /app/uploads/covers \
  && chown -R node:node /app/uploads

USER node

EXPOSE 3000

CMD ["node", "server.js"]
