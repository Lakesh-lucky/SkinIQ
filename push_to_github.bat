@echo off
title Push SkinIQ to GitHub
echo ==============================================================================
echo SkinIQ Medical AI Platform - Pushing to GitHub
echo Repository: https://github.com/Lakesh-lucky/SkinIQ.git
echo ==============================================================================
echo.

set "GIT_PATH=C:\Users\reddy\AppData\Local\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe"

if exist "%GIT_PATH%" (
    echo [INFO] Using Git with Git LFS support from GitHub Desktop...
    "%GIT_PATH%" push -u origin main
) else (
    echo [INFO] Using system git...
    git push -u origin main
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Code and Git LFS models successfully pushed to GitHub!
    echo Next: Deploy on Render and Vercel using the instructions in DEPLOYMENT.md.
) else (
    echo [ERROR] Push failed or was canceled. If prompted for GitHub authentication,
    echo please sign in to authorize access for Lakesh-lucky.
)

echo.
echo ==============================================================================
pause
