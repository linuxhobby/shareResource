# ---- 依赖层 ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall 会执行 prisma generate，需要 schema 在场
COPY prisma ./prisma
RUN npm ci

# ---- 构建层 ----
FROM node:22-alpine AS build
WORKDIR /app
# prisma validate 需要 DATABASE_URL 可解析；构建期不连库，占位即可
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 容器内一律使用 PostgreSQL schema（仓库默认 sqlite 供本地零依赖开发）
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma \
 && npx prisma validate && npx prisma generate \
 && npm run build

# ---- 运行层 ----
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json /app/next.config.mjs /app/tsconfig.json ./
# prisma/seed.ts 运行时引用 ../lib/mock，需要一并带入
COPY --from=build /app/lib ./lib
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
