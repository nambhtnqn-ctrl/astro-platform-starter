import type { APIRoute } from 'astro';

interface UpdateRequest {
  entryId: string;
  status: 'waiting' | 'serving' | 'completed';
}

// Mock database - trong thực tế sẽ kết nối với Google Apps Script
let queueDatabase: any[] = [];

export const POST: APIRoute = async ({ request }) => {
  try {
    const { entryId, status }: UpdateRequest = await request.json();
    
    if (!entryId || !status) {
      return new Response(JSON.stringify({
        error: 'Thiếu thông tin bắt buộc'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate status
    if (!['waiting', 'serving', 'completed'].includes(status)) {
      return new Response(JSON.stringify({
        error: 'Trạng thái không hợp lệ'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Find and update the entry
    const entryIndex = queueDatabase.findIndex(entry => entry.id === entryId);
    
    if (entryIndex === -1) {
      return new Response(JSON.stringify({
        error: 'Không tìm thấy bản ghi'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Update the entry
    queueDatabase[entryIndex].status = status;
    queueDatabase[entryIndex].updatedAt = new Date().toISOString();

    // If setting to serving, make sure only one entry is serving at a time
    if (status === 'serving') {
      queueDatabase.forEach((entry, index) => {
        if (index !== entryIndex && entry.status === 'serving') {
          entry.status = 'waiting';
        }
      });
    }

    // In a real implementation, this would call Google Apps Script API
    await callGoogleAppsScript({
      action: 'updateQueueStatus',
      entryId,
      status
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Cập nhật trạng thái thành công'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error updating queue status:', error);
    return new Response(JSON.stringify({
      error: 'Lỗi server khi cập nhật trạng thái'
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