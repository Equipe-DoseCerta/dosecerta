// src/hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import PushNotification from 'react-native-push-notification';

export default function useNotifications(onNotificationReceived: (data: any) => void) {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      console.log('📱 Estado do app mudou para:', nextAppState);
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    PushNotification.configure({
      onNotification: function (notification: any) {
        // notification.userInteraction indica se foi clicada pelo usuário
        onNotificationReceived(notification.data);
        notification.finish?.('NoData');
      },
      requestPermissions: true,
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [onNotificationReceived]);

  return { appState };
}
