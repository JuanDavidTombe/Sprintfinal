@echo off
title MicroMaster - Exportar Base de Datos para Git
echo =======================================================
echo   MICROMASTER - EXPORTAR BASE DE DATOS ACTUAL A GIT
echo =======================================================
echo.

set MYSQLDUMP_BIN=mysql\bin\mysqldump.exe
if exist "C:\xampp\mysql\bin\mysqldump.exe" set MYSQLDUMP_BIN="C:\xampp\mysql\bin\mysqldump.exe"
if exist "D:\xampp\mysql\bin\mysqldump.exe" set MYSQLDUMP_BIN="D:\xampp\mysql\bin\mysqldump.exe"

%MYSQLDUMP_BIN% -u root --routines --triggers --single-transaction --add-drop-table micromaster > "backend\database\micromaster_dump.tmp.sql"

if %ERRORLEVEL% EQU 0 (
    move /Y "backend\database\micromaster_dump.tmp.sql" "backend\database\micromaster_dump.sql" > NUL
    echo [EXITO] La base de datos se ha guardado en:
    echo         backend\database\micromaster_dump.sql
    echo.
    echo Ahora puedes hacer git add, git commit y git push sin perder nada.
) else (
    if exist "backend\database\micromaster_dump.tmp.sql" del /Q "backend\database\micromaster_dump.tmp.sql"
    echo [ERROR] No se pudo exportar la base de datos.
    echo Asegurate de que XAMPP MySQL este encendido. El archivo anterior fue protegido.
)

echo.
pause
