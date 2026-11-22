#!/bin/bash
# מעלה בחינה מוכנה לאתר: מעתיק סרטונים, יוצר פתרון כתוב, מעדכן את האינדקס.
# שימוש: מתוך תיקיית הבחינה tools/video/exams/<מפתח>:  bash ../../publish.sh <מפתח> [גרסה]
set -e
K=$1; V=${2:-א}; ROOT=$(cd ../../../.. && pwd)
mkdir -p $ROOT/media/bagrut
for f in out/${K}_*.mp4; do cp "$f" $ROOT/media/bagrut/; done
if [ "$K" != "35471_2026_8" ]; then python3 ../../tosol.py $K $V; fi   # 35471_2026_8 נכתב ידנית
python3 $ROOT/tools/bagrut_index.py   # חובה אחרי כל הרצה של tosol.py (מוסיף את סימון הסרטונים mp4 לפתרון הכתוב)
python3 $ROOT/tools/seo_build.py      # דף לגוגל לכל מועד עם פתרון מלא + עדכון sitemap וקישורים
