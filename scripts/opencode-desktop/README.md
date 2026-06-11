# OpenCode Desktop (Antigravity-style shell)

Native desktop shell around `opencode web` — cửa sổ riêng, icon riêng, tự khởi động
session, lịch sử lưu tự động vào `~/.local/share/opencode/opencode.db`.

## Cách dùng

### Nhanh nhất — double click shortcut
Sau khi tạo shortcut (xem bên dưới), chỉ cần double click icon **OpenCode** trên Desktop.

### Từ dòng lệnh
```powershell
# Mặc định: mở CRM suite hiện tại
.\scripts\opencode-desktop\opencode-desktop.bat

# Mở project khác
.\scripts\opencode-desktop\opencode-desktop.bat "C:\path\to\other-project"

# Hoặc từ bên trong thư mục
cd "C:\path\to\other-project"
& "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-desktop\opencode-desktop.bat" .
```

### Tạo Desktop shortcut (chỉ cần 1 lần)
```powershell
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\OpenCode.lnk")
$lnk.TargetPath = "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-desktop\opencode-desktop.bat"
$lnk.WorkingDirectory = "C:\Users\Yoga\saigon-crm-suite"
$lnk.IconLocation = "C:\Users\Yoga\saigon-crm-suite\scripts\opencode-desktop\assets\icon.png"
$lnk.Description = "OpenCode — Antigravity-style shell"
$lnk.Save()
```

## Cấu trúc
```
opencode-desktop/
├── package.json              # electron 33.x
├── opencode-desktop.bat      # launcher
├── README.md
├── assets/
│   ├── icon.png              # 256x256 logo
│   └── icon@2x.png           # 512x512
└── src/
    └── main.js               # spawn opencode web + create window
```

## Cơ chế hoạt động

1. Launcher `.bat` kiểm tra `opencode` có trong PATH không, `npm install` nếu chưa có electron
2. `main.js` spawn `opencode web --port 0 --hostname 127.0.0.1` (auto-pick port, loopback only), đọc log để lấy port
3. Tạo BrowserWindow 1440x900, tải `http://127.0.0.1:<port>/`
4. Inject custom titlebar (gradient + nút Back/Reload) qua `executeJavaScript`
5. Khi đóng cửa sổ → kill cả process tree của `opencode` (`taskkill /T /F` trên Windows)
6. Nếu `opencode web` chết giữa session, tự restart tối đa 3 lần (exponential backoff 1s → 30s)

## Flags

- `--dev` — mở DevTools khi window sẵn sàng
- `--port N` — bind opencode web vào port cố định (mặc định 0 = auto)
- `--no-serve` — không spawn opencode, kết nối port 4096 (dùng khi đã chạy `opencode web` riêng)

## Lịch sử & Resume

Lưu tự động trong `~/.local/share/opencode/opencode.db` (SQLite).
- Mỗi lần launch tạo session mới
- Dùng `.\scripts\opencode.ps1 continue` trong terminal để resume session gần nhất
- Dùng `.\scripts\opencode.ps1 sessions` để xem danh sách

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Sửa |
|---|---|---|
| `'opencode' not found` | Chưa cài CLI | `npm install -g opencode-ai` |
| `EADDRINUSE` | Port opencode bị chiếm bởi process zombie | Mở Task Manager → kill `node.exe` / `opencode.exe` cũ. Hoặc dùng flag `--port 7777` |
| Màn hình trắng / treo | Chưa có `~/.local/share/opencode` | Chạy `opencode --version` 1 lần để khởi tạo |
| `Electron failed to install correctly` | npm install electron corrupt | Xóa `node_modules/electron` rồi `npm install` lại |
| Mở lên bị "auto-restart" 3 lần rồi đóng | opencode web crash liên tục (OOM, model provider fail) | Xem log PowerShell. Có thể chạy `opencode web` thủ công ở terminal riêng rồi dùng `--no-serve` |

## Tùy biến

- Đổi kích thước cửa sổ: sửa `width/height` trong `src/main.js`
- Đổi port mặc định: truyền `--port 7777` khi gọi electron
- Đổi icon: thay `assets/icon.png` (256x256) và `assets/icon@2x.png` (512x512)
