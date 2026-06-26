#!/bin/bash
# اسکریپت بکاپ خودکار سامانه کی‌کاو آلتین
# این اسکریپت پایگاه داده و عکس‌های آپلودشده را بکاپ می‌گیرد و ۷ نسخه آخر را نگه می‌دارد.

set -e

BACKUP_DIR="/root/backups"
DB_NAME="kikavaltin"
DB_USER="postgres"
DB_PASSWORD="KikavAltin1404Secure"
UPLOADS_DIR="/root/kikav-altin-app/kikav-app/server/uploads"
DATE=$(date +%Y-%m-%d_%H-%M)
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

# بکاپ پایگاه داده
echo "در حال گرفتن بکاپ از پایگاه داده..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_DIR/db_${DATE}.dump"

# بکاپ پوشه عکس‌های آپلودشده (در صورت وجود)
if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A $UPLOADS_DIR 2>/dev/null)" ]; then
  echo "در حال گرفتن بکاپ از عکس‌های آپلودشده..."
  tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C "$UPLOADS_DIR" .
fi

# حذف بکاپ‌های قدیمی‌تر از ۷ روز
echo "حذف بکاپ‌های قدیمی‌تر از ${KEEP_DAYS} روز..."
find "$BACKUP_DIR" -name "db_*.dump" -mtime +${KEEP_DAYS} -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +${KEEP_DAYS} -delete

echo "بکاپ با موفقیت در $BACKUP_DIR ذخیره شد: ${DATE}"
