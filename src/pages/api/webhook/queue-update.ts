import type { APIRoute } from 'astro';

interface WebhookPayload {
  timestamp: string;
  data: {
    type: 'queue_added' | 'status_updated' | 'number_called';
    queueNumber?: number;
    citizenName?: string;
    entryId?: string;
    status?: string;
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload: WebhookPayload = await request.json();
    
    console.log('Received webhook:', payload);
    
    // Xử lý các loại thông báo khác nhau
    switch (payload.data.type) {
      case 'queue_added':
        console.log(`New person added to queue: ${payload.data.citizenName} - Number: ${payload.data.queueNumber}`);
        // Có thể gửi thông báo real-time ở đây
        break;
        
      case 'status_updated':
        console.log(`Status updated for entry ${payload.data.entryId}: ${payload.data.status}`);
        // Có thể cập nhật real-time status ở đây
        break;
        
      case 'number_called':
        console.log(`Number called: ${payload.data.queueNumber} - ${payload.data.citizenName}`);
        // Có thể gửi thông báo âm thanh hoặc hiển thị ở đây
        break;
        
      default:
        console.log('Unknown webhook type:', payload.data.type);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({
      error: 'Error processing webhook'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};