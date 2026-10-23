@echo off
echo Starting Solon backend...
start cmd /k "cd /d E:\A.G\lawyer_chatbot && python run.py"
timeout /t 3
echo Opening Solon frontend...
start "" "E:\A.G\lawyer_chatbot\frontend\index.html"
echo Solon is running. Backend on http://localhost:8000
