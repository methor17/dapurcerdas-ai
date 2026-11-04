#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
printf '%s\n' 'Pastikan Ollama aktif: ollama pull qwen3.5:9b'
exec node server.mjs
