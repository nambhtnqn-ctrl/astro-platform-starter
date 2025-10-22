import React, { useState, useEffect } from 'react';

interface QueueInfo {
  queueNumber: number;
  citizenInfo: {
    id: string;
    fullName: string;
    dateOfBirth: string;
    address: string;
    phone?: string;
  };
  estimatedWaitTime: number;
  currentServing: number;
  totalInQueue: number;
  status: 'waiting' | 'serving' | 'completed';
}

const QueueDisplay: React.FC = () => {
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch queue information
  const fetchQueueInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/queue/status');
      if (response.ok) {
        const data = await response.json();
        setQueueInfo(data);
      }
    } catch (error) {
      console.error('Error fetching queue info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchQueueInfo();
    
    // Set up polling to update queue status
    const interval = setInterval(fetchQueueInfo, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!queueInfo) {
    return (
      <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có thông tin</h3>
        <p className="text-gray-600">Vui lòng quét QR code để lấy số thứ tự</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'serving':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Đang chờ';
      case 'serving':
        return 'Đang được phục vụ';
      case 'completed':
        return 'Hoàn thành';
      default:
        return 'Không xác định';
    }
  };

  return (
    <div className="space-y-6">
      {/* Queue Number Display */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-600 text-white text-3xl font-bold rounded-full mb-4">
          {queueInfo.queueNumber}
        </div>
        <h3 className="text-xl font-semibold text-gray-900">Số thứ tự của bạn</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(queueInfo.status)}`}>
          {getStatusText(queueInfo.status)}
        </div>
      </div>

      {/* Citizen Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Thông tin cá nhân</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Họ tên:</span>
            <span className="font-medium">{queueInfo.citizenInfo.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">CCCD:</span>
            <span className="font-medium">{queueInfo.citizenInfo.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ngày sinh:</span>
            <span className="font-medium">{queueInfo.citizenInfo.dateOfBirth}</span>
          </div>
          {queueInfo.citizenInfo.phone && (
            <div className="flex justify-between">
              <span className="text-gray-600">SĐT:</span>
              <span className="font-medium">{queueInfo.citizenInfo.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{queueInfo.currentServing}</div>
          <div className="text-sm text-blue-800">Đang phục vụ</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{queueInfo.totalInQueue}</div>
          <div className="text-sm text-orange-800">Tổng trong hàng</div>
        </div>
      </div>

      {/* Estimated Wait Time */}
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <div className="font-medium text-green-900">Thời gian chờ ước tính</div>
            <div className="text-lg font-bold text-green-700">{queueInfo.estimatedWaitTime} phút</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <div>
            <h4 className="font-medium text-yellow-900 mb-1">Hướng dẫn</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Vui lòng chờ đến lượt của bạn</li>
              <li>• Số thứ tự sẽ được gọi qua loa</li>
              <li>• Có thể theo dõi tiến trình tại đây</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchQueueInfo}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Cập nhật thông tin
      </button>
    </div>
  );
};

export default QueueDisplay;