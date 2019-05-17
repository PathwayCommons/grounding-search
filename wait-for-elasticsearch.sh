#!/bin/sh
# wait-for-elasticsearch.sh

set -e

host="$1"
shift
cmd="$@"

until curl http://$host/_cat/health; do
  >&2 echo "Elasticsearch is unavailable - sleeping"
  sleep 10
done

>&2 echo "Elasticsearch is up - executing command"
exec $cmd