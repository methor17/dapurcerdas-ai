Set-Location $PSScriptRoot
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Write-Host 'DapurCerdas v6 - Membuka http://127.0.0.1:3000'
Write-Host 'Pastikan Ollama aktif dan model sudah diunduh: ollama pull qwen3.5:9b'
node server.mjs
