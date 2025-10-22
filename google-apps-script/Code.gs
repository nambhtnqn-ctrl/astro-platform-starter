/**
 * Hệ thống xếp hàng tự động với QR code
 * Google Apps Script Backend
 */

// Cấu hình
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID', // Thay bằng ID của Google Sheet
  SHEET_NAME: 'QueueData',
  WEBHOOK_URL: 'YOUR_WEBHOOK_URL' // URL của Netlify site
};

/**
 * Hàm chính để xử lý request từ web app
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    switch (data.action) {
      case 'addToQueue':
        return addToQueue(data.data);
      case 'updateQueueStatus':
        return updateQueueStatus(data.entryId, data.status);
      case 'callNextNumber':
        return callNextNumber(data.queueNumber, data.citizenInfo);
      case 'getQueueStatus':
        return getQueueStatus();
      default:
        return createResponse({ error: 'Action không được hỗ trợ' }, 400);
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ error: 'Lỗi xử lý request' }, 500);
  }
}

/**
 * Thêm người vào hàng đợi
 */
function addToQueue(citizenData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    // Tạo sheet nếu chưa có
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      // Thêm header
      sheet.getRange(1, 1, 1, 8).setValues([[
        'ID', 'Queue Number', 'Full Name', 'Citizen ID', 'Date of Birth', 
        'Address', 'Phone', 'Status', 'Created At', 'Updated At'
      ]]);
    }
    
    // Lấy số thứ tự tiếp theo
    const lastRow = sheet.getLastRow();
    const queueNumber = lastRow; // Số thứ tự = số dòng
    
    // Thêm dữ liệu vào sheet
    const newRow = [
      Utilities.getUuid(),
      queueNumber,
      citizenData.fullName,
      citizenData.id,
      citizenData.dateOfBirth,
      citizenData.address,
      citizenData.phone || '',
      'waiting',
      new Date(),
      new Date()
    ];
    
    sheet.appendRow(newRow);
    
    // Gửi thông báo đến web app
    sendWebhookNotification({
      type: 'queue_added',
      queueNumber: queueNumber,
      citizenName: citizenData.fullName
    });
    
    return createResponse({
      success: true,
      queueNumber: queueNumber,
      message: 'Đã thêm vào hàng đợi thành công'
    });
    
  } catch (error) {
    console.error('Error adding to queue:', error);
    return createResponse({ error: 'Lỗi khi thêm vào hàng đợi' }, 500);
  }
}

/**
 * Cập nhật trạng thái hàng đợi
 */
function updateQueueStatus(entryId, newStatus) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return createResponse({ error: 'Sheet không tồn tại' }, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColumnIndex = headers.indexOf('ID');
    const statusColumnIndex = headers.indexOf('Status');
    const updatedAtColumnIndex = headers.indexOf('Updated At');
    
    // Tìm và cập nhật entry
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColumnIndex] === entryId) {
        sheet.getRange(i + 1, statusColumnIndex + 1).setValue(newStatus);
        sheet.getRange(i + 1, updatedAtColumnIndex + 1).setValue(new Date());
        
        // Gửi thông báo
        sendWebhookNotification({
          type: 'status_updated',
          entryId: entryId,
          status: newStatus
        });
        
        return createResponse({
          success: true,
          message: 'Cập nhật trạng thái thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy entry' }, 404);
    
  } catch (error) {
    console.error('Error updating queue status:', error);
    return createResponse({ error: 'Lỗi khi cập nhật trạng thái' }, 500);
  }
}

/**
 * Gọi số tiếp theo
 */
function callNextNumber(queueNumber, citizenInfo) {
  try {
    // Gửi thông báo đến web app
    sendWebhookNotification({
      type: 'number_called',
      queueNumber: queueNumber,
      citizenName: citizenInfo.fullName
    });
    
    // Có thể thêm logic gửi SMS hoặc email thông báo ở đây
    
    return createResponse({
      success: true,
      message: `Đã gọi số ${queueNumber}`,
      queueNumber: queueNumber
    });
    
  } catch (error) {
    console.error('Error calling next number:', error);
    return createResponse({ error: 'Lỗi khi gọi số' }, 500);
  }
}

/**
 * Lấy trạng thái hàng đợi
 */
function getQueueStatus() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return createResponse({
        currentServing: 0,
        totalInQueue: 0,
        waitingCount: 0,
        servingCount: 0
      });
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusColumnIndex = headers.indexOf('Status');
    const queueNumberColumnIndex = headers.indexOf('Queue Number');
    
    let currentServing = 0;
    let totalInQueue = 0;
    let waitingCount = 0;
    let servingCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const status = data[i][statusColumnIndex];
      const queueNumber = data[i][queueNumberColumnIndex];
      
      if (status === 'serving') {
        currentServing = queueNumber;
        servingCount++;
      } else if (status === 'waiting') {
        waitingCount++;
      }
      
      if (status !== 'completed') {
        totalInQueue++;
      }
    }
    
    return createResponse({
      currentServing: currentServing,
      totalInQueue: totalInQueue,
      waitingCount: waitingCount,
      servingCount: servingCount
    });
    
  } catch (error) {
    console.error('Error getting queue status:', error);
    return createResponse({ error: 'Lỗi khi lấy trạng thái hàng đợi' }, 500);
  }
}

/**
 * Gửi thông báo đến web app qua webhook
 */
function sendWebhookNotification(data) {
  try {
    if (!CONFIG.WEBHOOK_URL) return;
    
    const payload = {
      timestamp: new Date().toISOString(),
      data: data
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(CONFIG.WEBHOOK_URL + '/api/webhook/queue-update', options);
    
  } catch (error) {
    console.error('Error sending webhook notification:', error);
  }
}

/**
 * Tạo response chuẩn
 */
function createResponse(data, statusCode = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Hàm test để kiểm tra kết nối
 */
function testConnection() {
  return createResponse({
    success: true,
    message: 'Google Apps Script đang hoạt động bình thường',
    timestamp: new Date().toISOString()
  });
}

/**
 * Hàm setup ban đầu
 */
function setup() {
  try {
    // Tạo spreadsheet mới nếu chưa có
    const spreadsheet = SpreadsheetApp.create('Queue System Data');
    const sheet = spreadsheet.getActiveSheet();
    
    // Thêm header
    sheet.getRange(1, 1, 1, 10).setValues([[
      'ID', 'Queue Number', 'Full Name', 'Citizen ID', 'Date of Birth', 
      'Address', 'Phone', 'Status', 'Created At', 'Updated At'
    ]]);
    
    // Format header
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    sheet.getRange(1, 1, 1, 10).setBackground('#f0f0f0');
    
    console.log('Setup completed. Spreadsheet ID:', spreadsheet.getId());
    return createResponse({
      success: true,
      message: 'Setup hoàn tất',
      spreadsheetId: spreadsheet.getId()
    });
    
  } catch (error) {
    console.error('Error in setup:', error);
    return createResponse({ error: 'Lỗi trong quá trình setup' }, 500);
  }
}