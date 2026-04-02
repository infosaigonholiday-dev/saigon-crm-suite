

# Thay logo công ty vào Login và Sidebar

## Thay đổi

### 1. Copy logo vào project
- Copy `user-uploads://268601c897dc318268cd5.jpg` → `src/assets/logo.jpg`

### 2. Trang Login (`src/pages/Login.tsx`)
- Thay khối `<div>SH</div>` bằng `<img>` hiển thị logo, kích thước ~64x64px, bo góc

### 3. Sidebar (`src/components/AppSidebar.tsx`)
- Thay khối `<div>SH</div>` bằng `<img>` hiển thị logo, kích thước ~32x32px (khớp với kích thước hiện tại), bo góc

### Files thay đổi
1. `src/assets/logo.jpg` (mới)
2. `src/pages/Login.tsx`
3. `src/components/AppSidebar.tsx`

