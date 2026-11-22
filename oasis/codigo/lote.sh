#!/bin/bash
# uso: ./lote.sh escena1 escena2 ...  -> renderiza con y sin logo (300 frames = 10 s a 30 fps)
for e in "$@"; do
  node render.mjs $e 0 300 ../out/Oasis_$e 2>&1 | grep -E 'done|ERROR| [0-9]+s$' | tail -3
  node render.mjs $e 1 300 ../out/Oasis_${e}_LOGO 2>&1 | grep -E 'done|ERROR| [0-9]+s$' | tail -3
done
