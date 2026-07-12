#!/bin/sh
set -eu

prompt_file=$1
timeout_seconds=$2
skills=${3:-}
toolsets=${4:-}

case "$timeout_seconds" in
  ''|*[!0-9]*) exit 64 ;;
esac

prompt=$(cat -- "$prompt_file")
set -- -z "$prompt"
[ -z "$skills" ] || set -- "$@" --skills "$skills"
[ -z "$toolsets" ] || set -- "$@" --toolsets "$toolsets"

exec timeout --signal=TERM --kill-after=5s "${timeout_seconds}s" /root/.local/bin/hermes "$@"
