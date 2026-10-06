#!/bin/zsh
# Dobbeltklikk for å spille IRONCLASH ARENA lokalt (åpner nettleseren automatisk).
cd "$(dirname "$0")"
export PATH="$HOME/.local/node/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null; then
  echo "Fant ikke Node.js. Installer fra https://nodejs.org og prøv igjen."; read; exit 1
fi
[ -d node_modules ] || npm install
[ -f dist/index.html ] || npm run build
echo "Starter spillet på http://localhost:4173 – lukk dette vinduet for å avslutte."
(sleep 2 && open "http://localhost:4173") &
npx vite preview --port 4173
