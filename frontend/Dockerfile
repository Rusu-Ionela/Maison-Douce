FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_PRESTATOR_ID=default
ARG VITE_STRIPE_PK=
ARG VITE_MIN_LEAD_HOURS=24
ARG VITE_APP_VERSION=docker

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_PRESTATOR_ID=${VITE_PRESTATOR_ID}
ENV VITE_STRIPE_PK=${VITE_STRIPE_PK}
ENV VITE_MIN_LEAD_HOURS=${VITE_MIN_LEAD_HOURS}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
