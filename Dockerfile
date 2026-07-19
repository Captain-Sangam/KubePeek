# Multi-stage build producing a Next.js standalone production server.
# (The old image ran `next dev` because the build was broken by a stray
# `'use server'` directive — that is fixed, so we ship a real production build.)

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# aws-cli is needed for EKS exec-auth (`aws eks get-token`). kubectl is no
# longer required — the kubectl-describe fallback was removed.
RUN apk add --no-cache aws-cli

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV KUBECONFIG=/root/.kube/config

RUN mkdir -p /root/.kube /root/.aws

# Standalone output bundles only the traced dependencies + a minimal server.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
