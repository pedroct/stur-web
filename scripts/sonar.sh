#!/usr/bin/env bash
# Roda o scanner do Sonar (@sonar/scan) localmente contra o SonarQube configurado no .env.
#
# Uso: scripts/sonar.sh [--somente-scan] [--tentativas N]
#   --somente-scan   pula os testes e reaproveita o coverage/lcov.info existente
#   --tentativas N   tentativas do scan, de 1 a 5 (padrão 3)
#
# Host, chave do projeto, fontes e caminho da cobertura estão em sonar-project.properties.
# SONAR_TOKEN (e SONAR_HOST_URL, se existir) vêm do ambiente ou do primeiro .env que os
# tiver, subindo a partir desta pasta. O token nunca é impresso nem vai na linha de comando.
set -euo pipefail

somente_scan=0
tentativas=3
while [[ $# -gt 0 ]]; do
  case "$1" in
    --somente-scan) somente_scan=1; shift ;;
    --tentativas)
      [[ $# -ge 2 && "$2" =~ ^[1-5]$ ]] || { echo "--tentativas aceita de 1 a 5." >&2; exit 2; }
      tentativas="$2"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Argumento desconhecido: $1 (use --help)" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."

# Lê VAR de um .env sem executá-lo (valores podem ter caracteres especiais).
ler_env() {
  local var="$1" dir="$PWD" valor
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.env" ]] && grep -qE "^${var}=." "$dir/.env"; then
      valor="$(grep -E "^${var}=" "$dir/.env" | head -1 | cut -d= -f2-)"
      valor="${valor%\"}"; valor="${valor#\"}"; valor="${valor%\'}"; valor="${valor#\'}"
      printf '%s' "$valor"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  SONAR_TOKEN="$(ler_env SONAR_TOKEN || true)"
fi
if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "SONAR_TOKEN não encontrado (defina no ambiente ou em um .env)." >&2
  exit 1
fi
export SONAR_TOKEN

# O host já está no sonar-project.properties; um SONAR_HOST_URL do ambiente/.env prevalece.
if [[ -z "${SONAR_HOST_URL:-}" ]]; then
  SONAR_HOST_URL="$(ler_env SONAR_HOST_URL || true)"
fi
[[ -n "${SONAR_HOST_URL:-}" ]] && export SONAR_HOST_URL

# Regenera o coverage/lcov.info logo antes do scan. Sem isso o Sonar lê um relatório ausente
# ou velho e reporta cobertura errada. O relatório antigo não é apagado: se os testes forem
# interrompidos, a última cobertura concluída continua lá; se falharem de verdade, o scan aborta.
# `pnpm test:cobertura` já roda com TZ=UTC, o mesmo fuso do CI (padrão §5.5, regra 8).
if [[ "$somente_scan" -eq 0 ]]; then
  if ! pnpm test:cobertura; then
    echo "Os testes falharam; scan do Sonar abortado." >&2
    exit 1
  fi
elif [[ ! -f coverage/lcov.info ]]; then
  echo "coverage/lcov.info não existe. Rode o script sem --somente-scan." >&2
  exit 1
fi

if [[ ! -f coverage/lcov.info ]]; then
  echo "coverage/lcov.info não foi gerado; scan do Sonar abortado." >&2
  exit 1
fi

saida="$(mktemp)"
trap 'rm -f "$saida"' EXIT

codigo=1
for ((tentativa = 1; tentativa <= tentativas; tentativa++)); do
  echo "Executando o scan do Sonar (tentativa $tentativa de $tentativas)..."
  set +e
  # -Dsonar.qualitygate.wait=true: espera o servidor e faz o scan falhar se o gate reprovar
  pnpm dlx @sonar/scan@5.1.0 -Dsonar.qualitygate.wait=true 2>&1 | tee "$saida"
  codigo="${PIPESTATUS[0]}"
  set -e

  if [[ "$codigo" -eq 0 ]]; then
    exit 0
  fi
  if grep -q 'QUALITY GATE STATUS: FAILED' "$saida"; then
    echo "Quality Gate reprovado; corrija as ocorrências novas antes de repetir o scan." >&2
    exit "$codigo"
  fi
  if [[ "$tentativa" -lt "$tentativas" ]]; then
    echo "Scan falhou (exit $codigo). Tentando de novo em 10 segundos." >&2
    sleep 10
  fi
done

echo "Scan do Sonar falhou depois de $tentativas tentativa(s) (exit $codigo)." >&2
exit "$codigo"
