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
let queueDatabase: QueueEntry[] = [
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
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
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
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    status: 'waiting',
    estimatedWaitTime: 5
  },
  {
    id: 'queue_3',
    queueNumber: 3,
    citizenInfo: {
      id: '456789123',
      fullName: 'Lê Văn C',
      dateOfBirth: '20/08/1992',
      address: '789 Đường DEF, Quận 3, TP.HCM',
      phone: '0456789123'
    },
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    status: 'waiting',
    estimatedWaitTime: 10
  },
  {
    id: 'queue_4',
    queueNumber: 4,
    citizenInfo: {
      id: '789123456',
      fullName: 'Phạm Thị D',
      dateOfBirth: '10/12/1988',
      address: '321 Đường GHI, Quận 4, TP.HCM',
      phone: '0789123456'
    },
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    status: 'completed',
    estimatedWaitTime: 0
  }
];

export const GET: APIRoute = async () => {
  try {
    // Sort by queue number
    const sortedEntries = queueDatabase.sort((a, b) => a.queueNumber - b.queueNumber);
    
    return new Response(JSON.stringify(sortedEntries), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error fetching queue entries:', error);
    return new Response(JSON.stringify({
      error: 'Lỗi server khi lấy danh sách hàng đợi'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};