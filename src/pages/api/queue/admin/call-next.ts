import type { APIRoute } from 'astro';

// Mock database - trong thực tế sẽ kết nối với Google Apps Script
let queueDatabase: any[] = [];

export const POST: APIRoute = async () => {
  try {
    // Find the next waiting entry
    const nextEntry = queueDatabase.find(entry => entry.status === 'waiting');
    
    if (!nextEntry) {
      return new Response(JSON.stringify({
        error: 'Không có người nào trong hàng đợi'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Set all serving entries back to waiting
    queueDatabase.forEach(entry => {
      if (entry.status === 'serving') {
        entry.status = 'waiting';
      }
    });

    // Set the next entry to serving
    nextEntry.status = 'serving';
    nextEntry.servedAt = new Date().toISOString();

    // In a real implementation, this would call Google Apps Script API
    await callGoogleAppsScript({
      action: 'callNextNumber',
      queueNumber: nextEntry.queueNumber,
      citizenInfo: nextEntry.citizenInfo
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Đã gọi số ${nextEntry.queueNumber}`,
      queueNumber: nextEntry.queueNumber,
      citizenName: nextEntry.citizenInfo.fullName
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error calling next number:', error);
    return new Response(JSON.stringify({
      error: 'Lỗi server khi gọi số tiếp theo'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

async function callGoogleAppsScript(data: any): Promise<void> {
  try {
    // This would be replaced with actual Google Apps Script API call
    console.log('Sending to Google Apps Script:', {
      scriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
      data
    });

    // Example of how to call Google Apps Script:
    /*
    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to call Google Apps Script');
    }
    */
  } catch (error) {
    console.error('Error calling Google Apps Script:', error);
    // Don't throw error here to avoid breaking the main flow
  }
}