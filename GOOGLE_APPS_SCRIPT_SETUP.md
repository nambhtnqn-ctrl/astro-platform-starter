# Hướng dẫn setup Google Apps Script cho hệ thống xếp hàng tự động

## Bước 1: Tạo Google Apps Script Project

1. Truy cập [Google Apps Script](https://script.google.com/)
2. Nhấn "New Project"
3. Xóa code mặc định và copy toàn bộ nội dung từ file `google-apps-script/Code.gs`
4. Lưu project với tên "Queue System Backend"

## Bước 2: Tạo Google Spreadsheet

1. Truy cập [Google Sheets](https://sheets.google.com/)
2. Tạo một spreadsheet mới với tên "Queue System Data"
3. Copy ID của spreadsheet từ URL (phần sau `/d/` và trước `/edit`)
4. Cập nhật `SPREADSHEET_ID` trong file Code.gs

## Bước 3: Cấu hình Webhook URL

1. Deploy ứng dụng Astro lên Netlify
2. Copy URL của site (ví dụ: `https://your-site.netlify.app`)
3. Cập nhật `WEBHOOK_URL` trong file Code.gs

## Bước 4: Deploy Google Apps Script

1. Trong Google Apps Script editor, nhấn "Deploy" > "New deployment"
2. Chọn type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Nhấn "Deploy"
6. Copy URL được tạo ra

## Bước 5: Cấu hình Environment Variables

Trong Netlify dashboard:

1. Vào Site settings > Environment variables
2. Thêm biến môi trường:
   - `GOOGLE_APPS_SCRIPT_URL`: URL của Google Apps Script web app

## Bước 6: Test kết nối

1. Chạy hàm `testConnection()` trong Google Apps Script
2. Kiểm tra log để đảm bảo không có lỗi
3. Test quét QR code trên web app

## Cấu trúc dữ liệu trong Google Sheet

| ID | Queue Number | Full Name | Citizen ID | Date of Birth | Address | Phone | Status | Created At | Updated At |
|----|--------------|-----------|------------|---------------|---------|-------|--------|------------|------------|
| uuid | 1 | Nguyễn Văn A | 123456789 | 01/01/1990 | 123 Đường ABC | 0123456789 | waiting | 2024-01-01 | 2024-01-01 |

## Các API Endpoints

### Google Apps Script
- `POST /exec` - Endpoint chính để xử lý tất cả requests
- Actions hỗ trợ:
  - `addToQueue` - Thêm người vào hàng đợi
  - `updateQueueStatus` - Cập nhật trạng thái
  - `callNextNumber` - Gọi số tiếp theo
  - `getQueueStatus` - Lấy trạng thái hàng đợi

### Web App APIs
- `POST /api/queue/add` - Thêm vào hàng đợi
- `GET /api/queue/status` - Lấy trạng thái hàng đợi
- `GET /api/queue/admin/list` - Lấy danh sách cho admin
- `POST /api/queue/admin/update` - Cập nhật trạng thái (admin)
- `POST /api/queue/admin/call-next` - Gọi số tiếp theo (admin)
- `POST /api/webhook/queue-update` - Webhook nhận thông báo

## Troubleshooting

### Lỗi thường gặp:

1. **"Spreadsheet not found"**
   - Kiểm tra lại SPREADSHEET_ID
   - Đảm bảo spreadsheet được share với Google Apps Script

2. **"Webhook failed"**
   - Kiểm tra WEBHOOK_URL
   - Đảm bảo Netlify site đã được deploy

3. **"Permission denied"**
   - Chạy lại hàm `setup()` để cấp quyền
   - Kiểm tra quyền truy cập spreadsheet

### Debug:

1. Sử dụng `console.log()` trong Google Apps Script
2. Kiểm tra Execution transcript trong Apps Script dashboard
3. Kiểm tra Netlify function logs

## Mở rộng tính năng

### Gửi thông báo SMS:
```javascript
function sendSMS(phoneNumber, message) {
  // Tích hợp với dịch vụ SMS như Twilio
}
```

### Gửi email thông báo:
```javascript
function sendEmail(email, subject, body) {
  MailApp.sendEmail(email, subject, body);
}
```

### Tích hợp với hệ thống âm thanh:
```javascript
function playNotificationSound() {
  // Tích hợp với Web Audio API
}
```

### Lưu trữ dữ liệu lâu dài:
```javascript
function archiveCompletedEntries() {
  // Di chuyển các entry đã hoàn thành sang sheet khác
}
```