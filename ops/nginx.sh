#!/bin/bash

docker run \
  -v $(pwd)/ops/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -v $(pwd)/public/uploads:/app/public/uploads \
  --add-host localnode:$(ifconfig en0 | grep inet | grep -v inet6 | awk '{print $2}') \
  -p 8080:8080 \
  --rm -it -d nginx
