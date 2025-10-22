import React, { useState, useEffect } from 'react';

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

const AdminQueueManager: React.FC = () => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueEntries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/queue/admin/list');
      if (response.ok) {
        const data = await response.json();
        setQueueEntries(data);
        setError(null);
      } else {
        setError('Không thể tải danh sách hàng đợi');
      }
    } catch (err) {
      setError('Lỗi kết nối khi tải dữ liệu');
      console.error('Error fetching queue entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQueueStatus = async (entryId: string, newStatus: 'waiting' | 'serving' | 'completed') => {
    try {
      const response = await fetch('/api/queue/admin/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          status: newStatus
        }),
      });

      if (response.ok) {
        // Update local state
        setQueueEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { ...entry, status: newStatus }
              : entry
          )
        );
      } else {
        setError('Không thể cập nhật trạng thái');
      }
    } catch (err) {
      setError('Lỗi khi cập nhật trạng thái');
      console.error('Error updating queue status:', err);
    }
  };

  const callNextNumber = async () => {
    try {
      const response = await fetch('/api/queue/admin/call-next', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchQueueEntries(); // Refresh the list
      } else {
        setError('Không thể gọi số tiếp theo');
      }
    } catch (err) {
      setError('Lỗi khi gọi số tiếp theo');
      console.error('Error calling next number:', err);
    }
  };

  useEffect(() => {
    fetchQueueEntries();
    
    // Set up polling to refresh data
    const interval = setInterval(fetchQueueEntries, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

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
        return 'Đang phục vụ';
      case 'completed':
        return 'Hoàn thành';
      default:
        return 'Không xác định';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
          </svg>
          {error}
        </div>
      </div>
    );
  }

  const waitingEntries = queueEntries.filter(entry => entry.status === 'waiting');
  const servingEntries = queueEntries.filter(entry => entry.status === 'serving');
  const completedEntries = queueEntries.filter(entry => entry.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={callNextNumber}
          disabled={waitingEntries.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          Gọi số tiếp theo
        </button>
        
        <button
          onClick={fetchQueueEntries}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Làm mới
        </button>
      </div>

      {/* Currently Serving */}
      {servingEntries.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3">Đang phục vụ</h3>
          <div className="space-y-3">
            {servingEntries.map(entry => (
              <div key={entry.id} className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-600 text-white text-xl font-bold rounded-full flex items-center justify-center">
                      {entry.queueNumber}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{entry.citizenInfo.fullName}</h4>
                      <p className="text-sm text-gray-600">CCCD: {entry.citizenInfo.id}</p>
                      <p className="text-sm text-gray-500">Thời gian: {formatTime(entry.timestamp)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateQueueStatus(entry.id, 'completed')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Hoàn thành
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting Queue */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">
          Hàng đợi ({waitingEntries.length} người)
        </h3>
        {waitingEntries.length === 0 ? (
          <p className="text-yellow-700 text-center py-4">Không có người trong hàng đợi</p>
        ) : (
          <div className="space-y-3">
            {waitingEntries.map(entry => (
              <div key={entry.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-yellow-600 text-white text-xl font-bold rounded-full flex items-center justify-center">
                      {entry.queueNumber}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{entry.citizenInfo.fullName}</h4>
                      <p className="text-sm text-gray-600">CCCD: {entry.citizenInfo.id}</p>
                      <p className="text-sm text-gray-500">Thời gian: {formatTime(entry.timestamp)}</p>
                      <p className="text-sm text-gray-500">Chờ ước tính: {entry.estimatedWaitTime} phút</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateQueueStatus(entry.id, 'serving')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Bắt đầu phục vụ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Entries (Recent) */}
      {completedEntries.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Đã hoàn thành (gần đây)
          </h3>
          <div className="space-y-2">
            {completedEntries.slice(0, 5).map(entry => (
              <div key={entry.id} className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                      {entry.queueNumber}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{entry.citizenInfo.fullName}</h4>
                      <p className="text-xs text-gray-500">Hoàn thành: {formatTime(entry.timestamp)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">Hoàn thành</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQueueManager;