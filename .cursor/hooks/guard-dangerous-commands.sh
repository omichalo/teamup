#!/usr/bin/env bash
set -u

input="$(cat)"
command="$(printf '%s' "$input" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.stdout.write(JSON.parse(s).command||"")}catch{process.stdout.write("")}})')"

reason=""

if printf '%s' "$command" | grep -Eiq '(^|[;&|[:space:]])git[[:space:]]+push([^;&|]*[[:space:]])(main|master|staging)([[:space:]]|$)'; then
  reason="Push direct vers une branche protégée interdit : utilise une branche dédiée et une PR."
elif printf '%s' "$command" | grep -Eiq 'npm[[:space:]]+run[[:space:]]+(deploy:.*prod|functions:deploy:prod|deploy:firestore:prod)([[:space:]]|$)'; then
  reason="Déploiement production direct interdit depuis un agent : passe par le workflow de release."
elif printf '%s' "$command" | grep -Eiq 'firebase[[:space:]]+deploy([^;&|]*--project[=[:space:]]+sqyping-teamup)([[:space:]]|$)'; then
  reason="firebase deploy direct vers sqyping-teamup est interdit : passe par le workflow de release."
fi

if [ -n "$reason" ]; then
  node -e 'console.log(JSON.stringify({permission:"deny",user_message:process.argv[1],agent_message:process.argv[1]}))' "$reason"
  exit 0
fi

printf '%s\n' '{"permission":"allow"}'
