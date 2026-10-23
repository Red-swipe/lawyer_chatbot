@echo off

taskkill /F /IM python.exe /T 2>nul

start "Solon Backend" cmd /k "cd /d E:\A.G\lawyer_chatbot && python run.py"

timeout /t 3 /nobreak

start "Solon Frontend" cmd /k "cd /d E:\A.G\lawyer_chatbot\frontend && npx serve . -p 3000"

timeout /t 2 /nobreak

start "" "http://localhost:3000"

echo.
echo Solon is live.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Close the two terminal windows to shut Solon down.
