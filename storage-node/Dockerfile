
FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node server.js ./server.js

RUN npm init -y \
    && npm install --omit=dev express

ENV NODE_ENV=production
ENV PORT=7000
ENV STORAGE_DIR=/data

RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 7000

CMD ["node", "server.js"]
