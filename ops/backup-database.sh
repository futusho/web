#!/bin/bash

# 1. Place this file inside ~/backup.sh and do not forget to fill out variables below
# 2. After that make sure to add it to crontab:
#    10 */1 * * * /var/www/futusho-web/backup.sh

DATE=$(date +"%Y%m%d")
TIME=$(date +"%H%M")

BACKUP_TO="/var/www/futusho-web/backups/${DATE}"

mkdir -p "${BACKUP_TO}"

cd ~/futusho-web || exit 1

POSTGRES_USER=""
POSTGRES_DB=""

docker compose exec db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" --no-owner | gzip -9  > "${BACKUP_TO}/database-${DATE}${TIME}.sql.gz"
