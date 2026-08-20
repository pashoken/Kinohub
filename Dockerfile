FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci
COPY tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
COPY fixtures ./fixtures
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4100 APP_MODE=mock PUBLIC_APP_ORIGIN=http://127.0.0.1:4100
RUN addgroup -g 10001 kinohub && adduser -D -u 10001 -G kinohub kinohub
COPY --from=build --chown=10001:10001 /app/package.json /app/package-lock.json ./
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/apps/server/package.json ./apps/server/package.json
COPY --from=build --chown=10001:10001 /app/apps/server/dist ./apps/server/dist
COPY --from=build --chown=10001:10001 /app/apps/web/package.json ./apps/web/package.json
COPY --from=build --chown=10001:10001 /app/apps/web/dist ./apps/web/dist
COPY --from=build --chown=10001:10001 /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=10001:10001 /app/packages/contracts/dist ./packages/contracts/dist
USER 10001:10001
EXPOSE 4100
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 CMD ["node", "-e", "fetch('http://127.0.0.1:4100/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["node", "apps/server/dist/index.js"]
