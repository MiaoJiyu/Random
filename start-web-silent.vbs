' 静默启动网页版服务（无可见控制台窗口），并在后台常驻。
' 服务启动成功后会自动打开默认浏览器（由 server/index.js 负责），无需此处再打开。
Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 切换到脚本所在目录（兼容从快捷方式启动）
cwd = fso.GetAbsolutePathName(".")
ws.CurrentDirectory = cwd

' 0 = 隐藏窗口；False = 不等待，后台常驻
ws.Run "node server/index.js", 0, False
