import type { APIRoute } from 'astro';

interface QueueEntry {
  id: string;
  queueNumber: number;
  citizenInfo: {
    id: string;
    fullName: string;
    dateOfBirth: string;
    address: string;
    phone?: string;
  };
  timestamp: string;
  status: 'waiting' | 'serving' | 'completed';
  estimatedWaitTime: number;
}

// Mock database - trong thực tế sẽ kết nối với Google Apps Script
let queueDatabase: QueueEntry[] = [];

export const GET: APIRoute = async ({ url }) => {
  try {
    const queueNumber = url.searchParams.get('queueNumber');
    
    // If specific queue number requested
    if (queueNumber) {
      const entry = queueDatabase.find(entry => entry.queueNumber === parseInt(queueNumber));
      
      if (!entry) {
        return new Response(JSON.stringify({
          error: 'Không tìm thấy số thứ tự'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      return new Response(JSON.stringify({
        queueNumber: entry.queueNumber,
        citizenInfo: entry.citizenInfo,
        estimatedWaitTime: entry.estimatedWaitTime,
        currentServing: getCurrentServingNumber(),
        totalInQueue: getTotalInQueue(),
        status: entry.status
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Return general queue status
    const waitingEntries = queueDatabase.filter(entry => entry.status === 'waiting');
    const servingEntries = queueDatabase.filter(entry => entry.status === 'serving');
    
    return new Response(JSON.stringify({
      currentServing: getCurrentServingNumber(),
      totalInQueue: getTotalInQueue(),
      waitingCount: waitingEntries.length,
      servingCount: servingEntries.length,
      averageWaitTime: calculateAverageWaitTime(waitingEntries)
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error fetching queue status:', error);
    return new Response(JSON.stringify({
      error: 'Lỗi server khi lấy thông tin hàng đợi'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

function getCurrentServingNumber(): number {
  const servingEntry = queueDatabase.find(entry => entry.status === 'serving');
  return servingEntry ? servingEntry.queueNumber : 0;
}

function getTotalInQueue(): number {
  return queueDatabase.filter(entry => entry.status !== 'completed').length;
}

function calculateAverageWaitTime(waitingEntries: QueueEntry[]): number {
  if (waitingEntries.length === 0) return 0;
  
  const totalWaitTime = waitingEntries.reduce((sum, entry) => sum + entry.estimatedWaitTime, 0);
  return Math.round(totalWaitTime / waitingEntries.length);
}

// Mock data for demonstration
queueDatabase = [
  {
    id: 'queue_1',
    queueNumber: 1,
    citizenInfo: {
      id: '123456789',
      fullName: 'Nguyễn Văn A',
      dateOfBirth: '01/01/1990',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      phone: '0123456789'
    },
    timestamp: new Date().toISOString(),
    status: 'serving',
    estimatedWaitTime: 0
  },
  {
    id: 'queue_2',
    queueNumber: 2,
    citizenInfo: {
      id: '987654321',
      fullName: 'Trần Thị B',
      dateOfBirth: '15/05/1985',
      address: '456 Đường XYZ, Quận 2, TP.HCM',
      phone: '0987654321'
    },
    timestamp: new Date().toISOString(),
    status: 'waiting',
    estimatedWaitTime: 5
  }
];