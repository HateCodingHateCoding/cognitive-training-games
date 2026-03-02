@echo off
chcp 65001 >nul
:: 切换到 bat 文件所在目录（无论从哪里双击都正确）
cd /d "%~dp0"

echo.
echo  ========================================
echo     认知训练游戏平台  正在启动...
echo  ========================================
echo.
echo  工作目录: %CD%
echo.

:: 检查端口是否已被占用
netstat -ano | findstr ":8080 " >nul 2>&1
if %ERRORLEVEL%==0 (
    echo  [!] 端口 8080 已被占用，尝试使用 8081 端口
    set PORT=8081
) else (
    set PORT=8080
)

:: 使用 Python 3 启动
python -m http.server %PORT% --bind 127.0.0.1
if %ERRORLEVEL%==0 goto :end

echo  [!] python 启动失败，尝试 Node.js...
npx --yes serve -l %PORT% .
if %ERRORLEVEL%==0 goto :end

echo.
echo  [错误] 启动失败！
echo  Python 路径: %~dp0
echo  请手动运行: python -m http.server 8080
echo.

:end
pause
