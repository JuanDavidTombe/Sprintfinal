@echo off
echo =======================================================
echo   MICROMASTER - RESTAURAR BASE DE DATOS EN ESTE PC
echo =======================================================
echo.
set MYSQL_BIN=d:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=c:\xampp\mysql\bin\mysql.exe
if not exist "%MYSQL_BIN%" set MYSQL_BIN=mysql

if not exist "backend\database\micromaster_dump.sql" (
    echo [ERROR] No se encontro el archivo backend\database\micromaster_dump.sql
    pause
    exit /b 1
)

echo Creando base de datos 'micromaster' si no existe...
"%MYSQL_BIN%" -u root -e "CREATE DATABASE IF NOT EXISTS micromaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo Importando datos completos...
"%MYSQL_BIN%" -u root micromaster < backend\database\micromaster_dump.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Base de datos 'micromaster' restaurada al 100%% sin descuadres.
) else (
    echo.
    echo [ERROR] Ocurrio un fallo al restaurar. Asegurate de que XAMPP este encendido.
)
echo.
pause
