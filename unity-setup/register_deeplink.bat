@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM register_deeplink.bat
REM
REM Enregistre le protocole personnalisé "gamedash://" dans le registre Windows.
REM À exécuter UNE SEULE FOIS en tant qu'administrateur, APRÈS avoir buildé Unity.
REM
REM Usage :
REM   1. Ouvre ce fichier avec un éditeur texte
REM   2. Remplace le chemin ci-dessous par le chemin réel de ton .exe Unity
REM   3. Clic droit sur le .bat → "Exécuter en tant qu'administrateur"
REM ─────────────────────────────────────────────────────────────────────────────

REM ⚠️ MODIFIER CE CHEMIN ⚠️
set EXE_PATH=C:\gamedash\gamedash-project\unity-client\GameDash\Build2\GameDash.exe
echo Enregistrement du protocole gamedash:// ...

REG ADD "HKEY_CLASSES_ROOT\gamedash" /ve /d "URL:GameDash Protocol" /f
REG ADD "HKEY_CLASSES_ROOT\gamedash" /v "URL Protocol" /d "" /f
REG ADD "HKEY_CLASSES_ROOT\gamedash\shell" /f
REG ADD "HKEY_CLASSES_ROOT\gamedash\shell\open" /f
REG ADD "HKEY_CLASSES_ROOT\gamedash\shell\open\command" /ve /d "\"%EXE_PATH%\" \"%%1\"" /f

echo.
echo Protocole gamedash:// enregistre avec succes !
echo Chemin : %EXE_PATH%
echo.
echo Test : ouvre un navigateur et tape gamedash://testmap?map_id=1^&token=test
pause
