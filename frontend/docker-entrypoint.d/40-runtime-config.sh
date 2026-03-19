#!/bin/sh
set -eu

: "${VITE_API_URL:=/api}"
: "${VITE_PRESTATOR_ID:=}"
: "${VITE_STRIPE_PK:=}"
: "${VITE_MIN_LEAD_HOURS:=24}"

envsubst '${VITE_API_URL} ${VITE_PRESTATOR_ID} ${VITE_STRIPE_PK} ${VITE_MIN_LEAD_HOURS}' \
  < /opt/runtime-config/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js
