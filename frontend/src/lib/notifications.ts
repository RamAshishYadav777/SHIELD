import api from './api';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const subscribeToNotifications = async () => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported by this browser');
      return;
    }

    if (!window.isSecureContext) {
      console.warn('SHIELD Notification Service: Subscriptions require a secure context (HTTPS/localhost). Skipping.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');

    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BAAIVOFOib2mt9ccFyS9leSG2Heyya9qXY8eCAGWTEP87Fhf_8jM8dMbg4XWc2WQHm_EpeK5XAQ7xzm13Dv7bZU';
    
    if (Notification.permission === 'denied') {
      console.warn('Push notification permission was denied by the user. Subscriptions skipped.');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    }

    await api.post('/notifications/subscribe', subscription);
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
  }
};
