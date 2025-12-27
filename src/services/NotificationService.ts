// ========================================
// 📱 REACT NATIVE - SERVIÇO DE NOTIFICAÇÕES FCM (SEM AVISOS)
// ========================================

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import PushNotification, { Importance } from 'react-native-push-notification';

class NotificationService {
  
  // Define os IDs dos canais de notificação (CRÍTICO: Sincronia com Apps Script)
  private ALARM_CHANNEL_ID = 'medicamentos';
  private DEFAULT_CHANNEL_ID = 'novidades_channel';
  private ALARM_SOUND_NAME = 'default'; 

  /**
   * 🚀 Inicializar serviço de notificações
   */
  async initialize() {
    try {
      await this.requestPermission();
      this.createNotificationChannels();
      await this.subscribeToTopic('todos_usuarios'); 
      this.setupListeners();
      console.log('✅ Serviço de notificações inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar NotificationService:', error);
    }
  }
  
  /**
   * 🔔 Solicitar permissão de notificações
   * ✅ CORRIGIDO: Usando try-catch para evitar warnings
   */
  async requestPermission() {
    try {
      // ✅ A forma correta que evita o warning
      const authStatus = await messaging().requestPermission();
      
      const enabled =
        authStatus === 1 || // AUTHORIZED
        authStatus === 2;   // PROVISIONAL

      if (enabled) {
        console.log('✅ Permissão de notificação concedida');
      } else {
        console.log('⚠️ Permissão de notificação negada');
      }
    } catch (error) {
      console.error('❌ Erro ao solicitar permissão:', error);
    }
  }
  
  /**
   * 📢 Inscrever no tópico (para receber notificações gerais)
   */
  async subscribeToTopic(topic: string) {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`✅ Inscrito no tópico: ${topic}`);
    } catch (error) {
      console.error('❌ Erro ao inscrever no tópico:', error);
    }
  }
  
  /**
   * 🎯 Criar canais de notificação (Android)
   */
  createNotificationChannels() {
    // 1. Canal CRÍTICO para o alarme de medicamento (ID: medicamentos)
    PushNotification.createChannel(
      {
        channelId: this.ALARM_CHANNEL_ID,
        channelName: 'Lembretes de Medicamentos (Alarme)',
        channelDescription: 'Alarmes com som e vibração customizados.',
        playSound: true,
        soundName: this.ALARM_SOUND_NAME,
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => console.log(`Canal '${this.ALARM_CHANNEL_ID}' criado: ${created}`)
    );
    
    // 2. Canal padrão para novidades (ID: novidades_channel)
    PushNotification.createChannel(
      {
        channelId: this.DEFAULT_CHANNEL_ID,
        channelName: 'Novidades e Avisos',
        channelDescription: 'Notificações de novidades do app.',
        playSound: true,
        soundName: 'default',
        importance: Importance.DEFAULT,
        vibrate: true,
      },
      (created) => console.log(`Canal '${this.DEFAULT_CHANNEL_ID}' criado: ${created}`)
    );
  }
  
  /**
   * 👂 Configurar listeners de notificações
   */
  setupListeners() {
    // FOREGROUND: app aberto
    messaging().onMessage(async (remoteMessage) => {
      console.log('📬 Notificação recebida (foreground):', remoteMessage);
      this.showLocalNotification(remoteMessage);
    });
    
    // BACKGROUND: app minimizado (Firebase exibe automaticamente)
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📬 Notificação recebida (background):', remoteMessage);
    });
    
    // Quando usuário toca na notificação
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('👆 Usuário tocou na notificação:', remoteMessage);
      this.handleNotificationPress(remoteMessage);
    });
    
    // App aberto a partir de notificação (killed state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('🚀 App aberto por notificação:', remoteMessage);
          this.handleNotificationPress(remoteMessage);
        }
      })
      .catch((error) => {
        console.error('❌ Erro ao obter notificação inicial:', error);
      });
  }
  
  /**
   * 🔔 Mostrar notificação local (usado quando o app está em FOREGROUND)
   */
  showLocalNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
    try {
      const { notification, data } = remoteMessage;
      
      const isAlarm = data?.tipo === 'alarme_medicamento';
      
      const channelId = isAlarm ? this.ALARM_CHANNEL_ID : this.DEFAULT_CHANNEL_ID;
      const soundName = isAlarm ? this.ALARM_SOUND_NAME : 'default';

      PushNotification.localNotification({
        channelId: channelId, 
        title: notification?.title || 'DoseCerta Aviso',
        message: notification?.body || 'Você tem uma nova notificação.',
        playSound: true,
        soundName: soundName, 
        importance: isAlarm ? 'high' : 'default', 
        vibrate: true,
        priority: isAlarm ? 'high' : 'default',
        smallIcon: 'ic_notification', 
        largeIcon: 'ic_launcher', 
        userInfo: data, 
      });
    } catch (error) {
      console.error('❌ Erro ao mostrar notificação local:', error);
    }
  }
  
  /**
   * 👆 Tratar clique na notificação
   */
  handleNotificationPress(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
    try {
      const { data } = remoteMessage;
      
      if (data?.tipo === 'novidade') {
        console.log('📰 Navegar para Novidades');
        // TODO: Implementar navegação
      } else if (data?.tipo === 'alarme_medicamento') {
        console.log('💊 Navegar para Tela de Alarme de Medicamento');
        // TODO: Implementar navegação
      }
    } catch (error) {
      console.error('❌ Erro ao processar clique na notificação:', error);
    }
  }
  
  /**
   * 🔕 Cancelar inscrição no tópico
   */
  async unsubscribeFromTopic(topic: string) {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`🔕 Desinscrito do tópico: ${topic}`);
    } catch (error) {
      console.error('❌ Erro ao desinscrever do tópico:', error);
    }
  }
  
  /**
   * 🔑 Obter token FCM (útil para debug)
   */
  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      console.log('🔑 FCM Token:', token);
      return token;
    } catch (error) {
      console.error('❌ Erro ao obter token:', error);
      return null;
    }
  }
}

export default new NotificationService();