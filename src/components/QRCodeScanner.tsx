import React, { useState, useRef, useEffect } from 'react';

interface QRCodeScannerProps {
  onScan?: (data: string) => void;
}

interface CitizenData {
  id: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone?: string;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [citizenInfo, setCitizenInfo] = useState<CitizenData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mock QR code data parser (trong thực tế sẽ cần thư viện quét QR)
  const parseQRData = (data: string): CitizenData | null => {
    try {
      // Giả lập dữ liệu từ QR code căn cước
      // Trong thực tế, QR code sẽ chứa thông tin được mã hóa
      const mockData = {
        id: "123456789",
        fullName: "Nguyễn Văn A",
        dateOfBirth: "01/01/1990",
        address: "123 Đường ABC, Quận 1, TP.HCM",
        phone: "0123456789"
      };
      return mockData;
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return null;
    }
  };

  const startScanning = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment' // Sử dụng camera sau
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera.');
      console.error('Camera access error:', err);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const simulateQRScan = () => {
    // Giả lập quét QR code thành công
    const mockQRData = "MOCK_QR_DATA_FROM_CITIZEN_ID";
    handleQRScan(mockQRData);
  };

  const handleQRScan = async (data: string) => {
    setScannedData(data);
    stopScanning();
    
    const citizenData = parseQRData(data);
    if (citizenData) {
      setCitizenInfo(citizenData);
      
      // Gọi API để tạo số thứ tự
      try {
        const response = await fetch('/api/queue/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(citizenData),
        });
        
        if (response.ok) {
          const result = await response.json();
          setQueueNumber(result.queueNumber);
          onScan?.(data);
        } else {
          setError('Không thể tạo số thứ tự. Vui lòng thử lại.');
        }
      } catch (err) {
        console.error('Error adding to queue:', err);
        setError('Lỗi kết nối. Vui lòng thử lại.');
      }
    } else {
      setError('Không thể đọc thông tin từ QR code. Vui lòng thử lại.');
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setQueueNumber(null);
    setCitizenInfo(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Camera Preview */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-64 object-cover"
          style={{ display: isScanning ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-64 object-cover"
          style={{ display: 'none' }}
        />
        
        {!isScanning && !scannedData && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
              </svg>
              <p className="text-gray-600">Camera chưa được khởi động</p>
            </div>
          </div>
        )}
        
        {/* QR Code Overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-red-500 rounded-lg relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isScanning && !scannedData && (
          <button
            onClick={startScanning}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            Bắt đầu quét QR
          </button>
        )}
        
        {isScanning && (
          <button
            onClick={stopScanning}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Dừng quét
          </button>
        )}
        
        {/* Demo button for testing */}
        <button
          onClick={simulateQRScan}
          className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          Demo quét QR
        </button>
        
        {scannedData && (
          <button
            onClick={resetScanner}
            className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Quét lại
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Success Message */}
      {queueNumber && citizenInfo && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
            <div>
              <p className="font-medium">Quét QR thành công!</p>
              <p>Số thứ tự: <span className="font-bold text-lg">{queueNumber}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;