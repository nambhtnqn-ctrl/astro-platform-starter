/**
 * Hệ thống xếp hàng tự động với QR code căn cước
 * Google Apps Script Backend
 */

// Cấu hình
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID', // Thay bằng ID của Google Sheet
  WEBHOOK_URL: 'YOUR_WEBHOOK_URL' // URL của Netlify site
};

// Định nghĩa các sheet và cấu trúc dữ liệu
const SHEET_CONFIG = {
  DATAQUET: {
    name: 'dataquet',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd_quet', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian']
  },
  HOSOMOI: {
    name: 'hosomoi',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd_hsm', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian', 'so_ban_hsm', 'thu_tuc_hsm']
  },
  HOSOBOSUNG: {
    name: 'hosobosung',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd_hsbs', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian', 'so_ban_hsbs', 'thu_tuc_hsbs']
  },
  THONGBAO: {
    name: 'thongbao',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd_tb', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian', 'so_ban_tb', 'thu_tuc_tb']
  },
  BAN_1: {
    name: 'BAN_1',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian', 'so_ban', 'thu_tuc']
  },
  BAN_2: {
    name: 'BAN_2',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian', 'so_ban', 'thu_tuc']
  },
  BAN_3: {
    name: 'BAN_3',
    headers: ['id', 'quet_qrcode_moi', 'ho_va_ten', 'ngay_sinh', 'cccd', 'ngay_cap', 'cmnd', 'dia_chi', 'thoi_gian', 'so_ban', 'thu_tuc']
  },
  DATATONG: {
    name: 'datatong',
    headers: ['ho_va_ten', 'gioi_tinh', 'ngay_sinh', 'cccd', 'so_bhxh', 'ngay_nop_hs', 'thang_huong', 'ngay_huong', 'het_han_huong', 'so_ban', 'tinh_trang']
  }
};

/**
 * Hàm chính để xử lý request từ web app
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    switch (data.action) {
      case 'processQRCode':
        return processQRCode(data.qrData, data.procedureType);
      case 'addToQueue':
        return addToQueue(data.data);
      case 'updateQueueStatus':
        return updateQueueStatus(data.entryId, data.status);
      case 'callNextNumber':
        return callNextNumber(data.queueNumber, data.citizenInfo);
      case 'getQueueStatus':
        return getQueueStatus();
      case 'getDataFromSheet':
        return getDataFromSheet(data.sheetName, data.filters);
      default:
        return createResponse({ error: 'Action không được hỗ trợ' }, 400);
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ error: 'Lỗi xử lý request' }, 500);
  }
}

/**
 * Xử lý QR code căn cước và lưu vào sheet tương ứng
 */
function processQRCode(qrData, procedureType = 'dataquet') {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Parse QR code căn cước
    const parsedData = parseCitizenIDQR(qrData);
    
    if (!parsedData) {
      return createResponse({ error: 'Không thể đọc QR code căn cước' }, 400);
    }
    
    // Xác định sheet đích dựa trên loại thủ tục
    const targetSheetConfig = getSheetConfigByProcedure(procedureType);
    if (!targetSheetConfig) {
      return createResponse({ error: 'Loại thủ tục không hợp lệ' }, 400);
    }
    
    // Lấy hoặc tạo sheet
    let sheet = spreadsheet.getSheetByName(targetSheetConfig.name);
    if (!sheet) {
      sheet = createSheetWithHeaders(spreadsheet, targetSheetConfig);
    }
    
    // Tạo dữ liệu để ghi
    const rowData = createRowData(parsedData, targetSheetConfig, procedureType);
    
    // Ghi vào sheet
    sheet.appendRow(rowData);
    
    // Gửi thông báo
    sendWebhookNotification({
      type: 'qr_processed',
      procedureType: procedureType,
      citizenName: parsedData.ho_va_ten,
      cccd: parsedData.cccd_quet
    });
    
    return createResponse({
      success: true,
      message: 'Đã xử lý QR code thành công',
      data: parsedData,
      sheetName: targetSheetConfig.name
    });
    
  } catch (error) {
    console.error('Error processing QR code:', error);
    return createResponse({ error: 'Lỗi khi xử lý QR code' }, 500);
  }
}

/**
 * Parse QR code căn cước công dân
 */
function parseCitizenIDQR(qrData) {
  try {
    // QR code căn cước có format: 12 số CCCD + 9 số CMND + thông tin khác
    const cleanData = qrData.replace(/\s+/g, ''); // Loại bỏ khoảng trắng
    
    if (cleanData.length < 21) {
      throw new Error('QR code không đủ dài');
    }
    
    // Lấy 12 số đầu làm CCCD
    const cccd = cleanData.substring(0, 12);
    
    // Lấy 9 số tiếp theo làm CMND
    const cmnd = cleanData.substring(12, 21);
    
    // Phần còn lại chứa thông tin khác (có thể cần parse thêm tùy format)
    const remainingData = cleanData.substring(21);
    
    // Parse thông tin từ phần còn lại (cần điều chỉnh theo format thực tế)
    const parsedInfo = parseAdditionalInfo(remainingData);
    
    return {
      cccd_quet: cccd,
      cmnd: cmnd,
      ho_va_ten: parsedInfo.ho_va_ten || 'Chưa xác định',
      ngay_sinh: parsedInfo.ngay_sinh || '',
      ngay_cap: parsedInfo.ngay_cap || '',
      dia_chi: parsedInfo.dia_chi || '',
      quet_qrcode_moi: qrData,
      thoi_gian: new Date()
    };
    
  } catch (error) {
    console.error('Error parsing QR code:', error);
    return null;
  }
}

/**
 * Parse thông tin bổ sung từ QR code
 * Cần điều chỉnh theo format thực tế của QR code căn cước
 */
function parseAdditionalInfo(data) {
  // Đây là phần cần điều chỉnh theo format thực tế
  // Ví dụ format có thể là: HOVATEN|NGAYSINH|DIACHI|...
  
  try {
    // Giả sử format là pipe-separated
    const parts = data.split('|');
    
    return {
      ho_va_ten: parts[0] || '',
      ngay_sinh: parts[1] || '',
      dia_chi: parts[2] || '',
      ngay_cap: parts[3] || ''
    };
  } catch (error) {
    console.error('Error parsing additional info:', error);
    return {
      ho_va_ten: '',
      ngay_sinh: '',
      dia_chi: '',
      ngay_cap: ''
    };
  }
}

/**
 * Lấy cấu hình sheet theo loại thủ tục
 */
function getSheetConfigByProcedure(procedureType) {
  const procedureMap = {
    'dataquet': SHEET_CONFIG.DATAQUET,
    'hosomoi': SHEET_CONFIG.HOSOMOI,
    'hosobosung': SHEET_CONFIG.HOSOBOSUNG,
    'thongbao': SHEET_CONFIG.THONGBAO,
    'ban1': SHEET_CONFIG.BAN_1,
    'ban2': SHEET_CONFIG.BAN_2,
    'ban3': SHEET_CONFIG.BAN_3
  };
  
  return procedureMap[procedureType] || SHEET_CONFIG.DATAQUET;
}

/**
 * Tạo sheet với headers
 */
function createSheetWithHeaders(spreadsheet, sheetConfig) {
  const sheet = spreadsheet.insertSheet(sheetConfig.name);
  
  // Thêm headers
  sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
  
  // Format headers
  sheet.getRange(1, 1, 1, sheetConfig.headers.length)
    .setFontWeight('bold')
    .setBackground('#f0f0f0');
  
  return sheet;
}

/**
 * Tạo dữ liệu dòng dựa trên sheet config
 */
function createRowData(parsedData, sheetConfig, procedureType) {
  const rowData = [];
  
  // Tạo ID duy nhất
  const id = Utilities.getUuid();
  
  // Mapping dữ liệu theo từng sheet
  for (const header of sheetConfig.headers) {
    switch (header) {
      case 'id':
        rowData.push(id);
        break;
      case 'quet_qrcode_moi':
        rowData.push(parsedData.quet_qrcode_moi);
        break;
      case 'ho_va_ten':
        rowData.push(parsedData.ho_va_ten);
        break;
      case 'ngay_sinh':
        rowData.push(parsedData.ngay_sinh);
        break;
      case 'cccd_quet':
      case 'cccd_hsm':
      case 'cccd_hsbs':
      case 'cccd_tb':
      case 'cccd':
        rowData.push(parsedData.cccd_quet);
        break;
      case 'ngay_cap':
        rowData.push(parsedData.ngay_cap);
        break;
      case 'cmnd':
        rowData.push(parsedData.cmnd);
        break;
      case 'dia_chi':
        rowData.push(parsedData.dia_chi);
        break;
      case 'thoi_gian':
        rowData.push(parsedData.thoi_gian);
        break;
      case 'so_ban_hsm':
      case 'so_ban_hsbs':
      case 'so_ban_tb':
      case 'so_ban':
        rowData.push(''); // Cần điền thông tin bổ sung
        break;
      case 'thu_tuc_hsm':
      case 'thu_tuc_hsbs':
      case 'thu_tuc_tb':
      case 'thu_tuc':
        rowData.push(procedureType); // Loại thủ tục
        break;
      default:
        rowData.push('');
    }
  }
  
  return rowData;
}

/**
 * Thêm người vào hàng đợi (giữ nguyên cho tương thích)
 */
function addToQueue(citizenData) {
  try {
    // Sử dụng sheet BAN_1 làm hàng đợi mặc định
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_CONFIG.BAN_1.name);
    
    if (!sheet) {
      sheet = createSheetWithHeaders(spreadsheet, SHEET_CONFIG.BAN_1);
    }
    
    // Tạo dữ liệu hàng đợi
    const rowData = [
      Utilities.getUuid(),
      '', // quet_qrcode_moi
      citizenData.fullName,
      citizenData.dateOfBirth,
      citizenData.id,
      '', // ngay_cap
      '', // cmnd
      citizenData.address,
      new Date(),
      '', // so_ban
      'queue' // thu_tuc
    ];
    
    sheet.appendRow(rowData);
    
    // Gửi thông báo
    sendWebhookNotification({
      type: 'queue_added',
      citizenName: citizenData.fullName
    });
    
    return createResponse({
      success: true,
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
 * Lấy dữ liệu từ sheet
 */
function getDataFromSheet(sheetName, filters = {}) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      return createResponse({ error: 'Sheet không tồn tại' }, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Lọc dữ liệu nếu có filters
    let filteredRows = rows;
    if (Object.keys(filters).length > 0) {
      filteredRows = rows.filter(row => {
        return Object.entries(filters).every(([key, value]) => {
          const columnIndex = headers.indexOf(key);
          return columnIndex !== -1 && row[columnIndex] === value;
        });
      });
    }
    
    // Chuyển đổi thành object
    const result = filteredRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return createResponse({
      success: true,
      data: result,
      total: result.length
    });
    
  } catch (error) {
    console.error('Error getting data from sheet:', error);
    return createResponse({ error: 'Lỗi khi lấy dữ liệu từ sheet' }, 500);
  }
}

/**
 * Lấy trạng thái hàng đợi từ các sheet BAN
 */
function getQueueStatus() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    let totalInQueue = 0;
    let currentServing = 0;
    let waitingCount = 0;
    let servingCount = 0;
    
    // Kiểm tra tất cả các sheet BAN
    const banSheets = [SHEET_CONFIG.BAN_1, SHEET_CONFIG.BAN_2, SHEET_CONFIG.BAN_3];
    
    for (const banConfig of banSheets) {
      const sheet = spreadsheet.getSheetByName(banConfig.name);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0];
          const thuTucIndex = headers.indexOf('thu_tuc');
          
          for (let i = 1; i < data.length; i++) {
            const thuTuc = data[i][thuTucIndex];
            if (thuTuc === 'queue') {
              totalInQueue++;
              waitingCount++;
            } else if (thuTuc === 'serving') {
              totalInQueue++;
              servingCount++;
              currentServing = i; // Số thứ tự đang phục vụ
            }
          }
        }
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