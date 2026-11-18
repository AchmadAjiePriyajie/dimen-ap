FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
# Auto-migration (prisma db push) + auto-seed (idempotent) lalu start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node prisma/seed.js && npm start"]
