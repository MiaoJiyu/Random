' 静默启动网页版服务（无可见控制台窗口），并在 3 秒后打开浏览器。
' 双击本文件即可，无需 npm start，也不会有黑框常驻。
Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 切换到脚本所在目录（兼容从快捷方式启动）
cwd = fso.GetAbsolutePathName(".")
ws.CurrentDirectory = cwd

' 0 = 隐藏窗口；False = 不等待，后台常驻
ws.Run "node server/index.js", 0, False

' 等待服务起来再打开浏览器
WScript.Sleep 3000
ws.Run "http://localhost:3000", 1, False
