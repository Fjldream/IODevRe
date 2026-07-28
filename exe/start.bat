@echo off

set cutDir=%~dp0

%cutDir%node.exe --experimental-worker %cutDir%index.js

pause