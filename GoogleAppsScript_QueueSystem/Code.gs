/**
 * Hệ thống xếp hàng tự động với quét QR code căn cước
 * Google Apps Script - Code.gs
 */

// Cấu hình Spreadsheet
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Thay bằng ID của Google Sheet

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
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    switch (data.action) {
      case 'processQRCode':
        return processQRCode(data.qrData, data.procedureType);
      case 'getQueueStatus':
        return getQueueStatus();
      case 'getDataFromSheet':
        return getDataFromSheet(data.sheetName, data.filters);
      case 'callNextNumber':
        return callNextNumber(data.banNumber);
      case 'updateStatus':
        return updateStatus(data.id, data.status, data.banNumber);
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
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
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
    
    // Lấy ID của dòng vừa thêm
    const lastRow = sheet.getLastRow();
    const newId = rowData[0]; // ID được tạo trong createRowData
    
    return createResponse({
      success: true,
      message: 'Đã xử lý QR code thành công',
      data: {
        id: newId,
        ...parsedData
      },
      sheetName: targetSheetConfig.name,
      rowNumber: lastRow
    });
    
  } catch (error) {
    console.error('Error processing QR code:', error);
    return createResponse({ error: 'Lỗi khi xử lý QR code: ' + error.message }, 500);
  }
}

/**
 * Parse QR code căn cước công dân
 * Format: 12 số CCCD + 9 số CMND + thông tin khác
 */
function parseCitizenIDQR(qrData) {
  try {
    // Loại bỏ khoảng trắng và ký tự đặc biệt
    const cleanData = qrData.replace(/[\s\-\.]/g, '');
    
    if (cleanData.length < 21) {
      throw new Error('QR code không đủ dài (cần ít nhất 21 ký tự)');
    }
    
    // Lấy 12 số đầu làm CCCD
    const cccd = cleanData.substring(0, 12);
    
    // Lấy 9 số tiếp theo làm CMND
    const cmnd = cleanData.substring(12, 21);
    
    // Phần còn lại chứa thông tin khác
    const remainingData = cleanData.substring(21);
    
    // Parse thông tin từ phần còn lại
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
  try {
    // Giả sử format có thể là pipe-separated hoặc fixed-width
    // Cần điều chỉnh theo format thực tế
    
    // Thử parse theo format pipe-separated trước
    if (data.includes('|')) {
      const parts = data.split('|');
      return {
        ho_va_ten: parts[0] || '',
        ngay_sinh: parts[1] || '',
        dia_chi: parts[2] || '',
        ngay_cap: parts[3] || ''
      };
    }
    
    // Nếu không có pipe, thử parse theo fixed-width
    // Giả sử: 30 ký tự họ tên, 8 ký tự ngày sinh, 50 ký tự địa chỉ, 8 ký tự ngày cấp
    if (data.length >= 96) {
      return {
        ho_va_ten: data.substring(0, 30).trim(),
        ngay_sinh: data.substring(30, 38).trim(),
        dia_chi: data.substring(38, 88).trim(),
        ngay_cap: data.substring(88, 96).trim()
      };
    }
    
    // Fallback: trả về dữ liệu thô
    return {
      ho_va_ten: data.substring(0, Math.min(30, data.length)).trim(),
      ngay_sinh: '',
      dia_chi: '',
      ngay_cap: ''
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
 * Lấy dữ liệu từ sheet
 */
function getDataFromSheet(sheetName, filters = {}) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
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
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    let totalInQueue = 0;
    let currentServing = 0;
    let waitingCount = 0;
    let servingCount = 0;
    let queueData = [];
    
    // Kiểm tra tất cả các sheet BAN
    const banSheets = [SHEET_CONFIG.BAN_1, SHEET_CONFIG.BAN_2, SHEET_CONFIG.BAN_3];
    
    for (const banConfig of banSheets) {
      const sheet = spreadsheet.getSheetByName(banConfig.name);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0];
          const thuTucIndex = headers.indexOf('thu_tuc');
          const hoVaTenIndex = headers.indexOf('ho_va_ten');
          const cccdIndex = headers.indexOf('cccd');
          const thoiGianIndex = headers.indexOf('thoi_gian');
          
          for (let i = 1; i < data.length; i++) {
            const thuTuc = data[i][thuTucIndex];
            if (thuTuc === 'queue' || thuTuc === 'serving') {
              totalInQueue++;
              if (thuTuc === 'queue') {
                waitingCount++;
              } else if (thuTuc === 'serving') {
                servingCount++;
                currentServing = i;
              }
              
              queueData.push({
                id: data[i][0],
                ho_va_ten: data[i][hoVaTenIndex],
                cccd: data[i][cccdIndex],
                thoi_gian: data[i][thoiGianIndex],
                status: thuTuc,
                ban: banConfig.name
              });
            }
          }
        }
      }
    }
    
    return createResponse({
      currentServing: currentServing,
      totalInQueue: totalInQueue,
      waitingCount: waitingCount,
      servingCount: servingCount,
      queueData: queueData
    });
    
  } catch (error) {
    console.error('Error getting queue status:', error);
    return createResponse({ error: 'Lỗi khi lấy trạng thái hàng đợi' }, 500);
  }
}

/**
 * Gọi số tiếp theo
 */
function callNextNumber(banNumber) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const banConfig = banNumber === 1 ? SHEET_CONFIG.BAN_1 : 
                     banNumber === 2 ? SHEET_CONFIG.BAN_2 : SHEET_CONFIG.BAN_3;
    
    const sheet = spreadsheet.getSheetByName(banConfig.name);
    if (!sheet) {
      return createResponse({ error: 'Sheet không tồn tại' }, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createResponse({ error: 'Không có người trong hàng đợi' }, 404);
    }
    
    const headers = data[0];
    const thuTucIndex = headers.indexOf('thu_tuc');
    const hoVaTenIndex = headers.indexOf('ho_va_ten');
    const cccdIndex = headers.indexOf('cccd');
    
    // Tìm người tiếp theo trong hàng đợi
    for (let i = 1; i < data.length; i++) {
      if (data[i][thuTucIndex] === 'queue') {
        // Cập nhật trạng thái thành serving
        sheet.getRange(i + 1, thuTucIndex + 1).setValue('serving');
        
        return createResponse({
          success: true,
          message: `Đã gọi số tiếp theo - Bàn ${banNumber}`,
          data: {
            ho_va_ten: data[i][hoVaTenIndex],
            cccd: data[i][cccdIndex],
            ban: banNumber
          }
        });
      }
    }
    
    return createResponse({ error: 'Không có người nào trong hàng đợi' }, 404);
    
  } catch (error) {
    console.error('Error calling next number:', error);
    return createResponse({ error: 'Lỗi khi gọi số tiếp theo' }, 500);
  }
}

/**
 * Cập nhật trạng thái
 */
function updateStatus(id, status, banNumber) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const banConfig = banNumber === 1 ? SHEET_CONFIG.BAN_1 : 
                     banNumber === 2 ? SHEET_CONFIG.BAN_2 : SHEET_CONFIG.BAN_3;
    
    const sheet = spreadsheet.getSheetByName(banConfig.name);
    if (!sheet) {
      return createResponse({ error: 'Sheet không tồn tại' }, 404);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    const thuTucIndex = headers.indexOf('thu_tuc');
    
    // Tìm và cập nhật entry
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === id) {
        sheet.getRange(i + 1, thuTucIndex + 1).setValue(status);
        
        return createResponse({
          success: true,
          message: 'Cập nhật trạng thái thành công'
        });
      }
    }
    
    return createResponse({ error: 'Không tìm thấy bản ghi' }, 404);
    
  } catch (error) {
    console.error('Error updating status:', error);
    return createResponse({ error: 'Lỗi khi cập nhật trạng thái' }, 500);
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
    
    // Tạo tất cả các sheet cần thiết
    Object.values(SHEET_CONFIG).forEach(sheetConfig => {
      const sheet = spreadsheet.insertSheet(sheetConfig.name);
      sheet.getRange(1, 1, 1, sheetConfig.headers.length).setValues([sheetConfig.headers]);
      sheet.getRange(1, 1, 1, sheetConfig.headers.length)
        .setFontWeight('bold')
        .setBackground('#f0f0f0');
    });
    
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