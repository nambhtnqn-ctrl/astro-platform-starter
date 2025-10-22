import type { APIRoute } from 'astro';

interface CitizenData {
  id: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone?: string;
}

interface QueueEntry {
  id: string;
  queueNumber: number;
  citizenInfo: CitizenData;
  timestamp: string;
  status: 'waiting' | 'serving' | 'completed';
  estimatedWaitTime: number;
}

// Mock database - trong thực tế sẽ kết nối với Google Apps Script
let queueDatabase: QueueEntry[] = [];
let nextQueueNumber = 1;

export const POST: APIRoute = async ({ request }) => {
  try {
    const citizenData: CitizenData = await request.json();
    
    // Validate required fields
    if (!citizenData.id || !citizenData.fullName || !citizenData.dateOfBirth) {
      return new Response(JSON.stringify({
        error: 'Thiếu thông tin bắt buộc'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if citizen already in queue
    const existingEntry = queueDatabase.find(entry => 
      entry.citizenInfo.id === citizenData.id && 
      entry.status !== 'completed'
    );

    if (existingEntry) {
      return new Response(JSON.stringify({
        error: 'Bạn đã có trong hàng đợi',
        queueNumber: existingEntry.queueNumber,
        status: existingEntry.status
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Create new queue entry
    const queueEntry: QueueEntry = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      queueNumber: nextQueueNumber++,
      citizenInfo: citizenData,
      timestamp: new Date().toISOString(),
      status: 'waiting',
      estimatedWaitTime: calculateEstimatedWaitTime(queueDatabase.length)
    };

    // Add to queue
    queueDatabase.push(queueEntry);

    // In a real implementation, this would call Google Apps Script API
    await callGoogleAppsScript(queueEntry);

    return new Response(JSON.stringify({
      success: true,
      queueNumber: queueEntry.queueNumber,
      estimatedWaitTime: queueEntry.estimatedWaitTime,
      totalInQueue: queueDatabase.filter(entry => entry.status !== 'completed').length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error adding to queue:', error);
    return new Response(JSON.stringify({
      error: 'Lỗi server khi thêm vào hàng đợi'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

function calculateEstimatedWaitTime(queueLength: number): number {
  // Estimate 5 minutes per person
  return queueLength * 5;
}

async function callGoogleAppsScript(queueEntry: QueueEntry): Promise<void> {
  try {
    // This would be replaced with actual Google Apps Script API call
    // For now, we'll just log the data
    console.log('Sending to Google Apps Script:', {
      scriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL,
      data: queueEntry
    });

    // Example of how to call Google Apps Script:
    /*
    const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'addToQueue',
        data: queueEntry
      })
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