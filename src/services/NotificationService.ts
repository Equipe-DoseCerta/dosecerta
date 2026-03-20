// ========================================
// 📱 REACT NATIVE - SERVIÇO DE NOTIFICAÇÕES FCM (COM NOTIFEE)
// ========================================

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

class NotificationService {
  
  private ALARM_CHANNEL_ID = 'medicamentos';
  private DEFAULT_CHANNEL_ID = 'novidades_channel';

  /**
   * 🚀 Inicializar serviço de notificações
   */
  async initialize() {
    try {
      await this.requestPermission();
      await this.createNotificationChannels();
      await this.subscribeToTopic('todos_usuarios'); 
      this.setupListeners();
      console.log('✅ Serviço de notificações inicializado (Notifee)');
    } catch (error) {
      console.error('❌ Erro ao inicializar NotificationService:', error);
    }
  }
  
  /**
   * 🔔 Solicitar permissão de notificações
   */
  async requestPermission() {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === 1 || authStatus === 2;

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
   * 📢 Inscrever no tópico
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
  async createNotificationChannels() {
    // 1. Canal para o alarme de medicamento
    await notifee.createChannel({
      id: this.ALARM_CHANNEL_ID,
      name: 'Lembretes de Medicamentos (Alarme)',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
    });
    
    // 2. Canal padrão para novidades
    await notifee.createChannel({
      id: this.DEFAULT_CHANNEL_ID,
      name: 'Novidades e Avisos',
      importance: AndroidImportance.DEFAULT,
      vibration: true,
    });

    console.log('✅ Canais de notificação criados via Notifee');
  }
  
  /**
   * 👂 Configurar listeners
   */
  setupListeners() {
    // FOREGROUND: app aberto
    messaging().onMessage(async (remoteMessage) => {
      console.log('📬 Notificação recebida (foreground):', remoteMessage);
      await this.showLocalNotification(remoteMessage);
    });
    
    // BACKGROUND: app minimizado
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📬 Notificação recebida (background):', remoteMessage);
    });
    
    // Tocar na notificação
    messaging().onNotificationOpenedApp((remoteMessage) => {
      this.handleNotificationPress(remoteMessage);
    });
    
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        this.handleNotificationPress(remoteMessage);
      }
    });
  }
  
  /**
   * 🔔 Mostrar notificação local (Substituído por Notifee)
   */
  async showLocalNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
    try {
      const { notification, data } = remoteMessage;
      const isAlarm = data?.tipo === 'alarme_medicamento';
      
      const channelId = isAlarm ? this.ALARM_CHANNEL_ID : this.DEFAULT_CHANNEL_ID;

      await notifee.displayNotification({
        title: notification?.title || 'DoseCerta Aviso',
        body: notification?.body || 'Você tem uma nova notificação.',
        data: data || {},
        android: {
          channelId: channelId,
          importance: isAlarm ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          pressAction: {
            id: 'default',
          },
          // Ícones devem estar em android/app/src/main/res/drawable
          smallIcon: 'ic_launcher', 
          color: '#0A7AB8',
        },
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
      } else if (data?.tipo === 'alarme_medicamento') {
        console.log('💊 Navegar para Tela de Alarme');
      }
    } catch (error) {
      console.error('❌ Erro ao processar clique:', error);
    }
  }

  async unsubscribeFromTopic(topic: string) {
    await messaging().unsubscribeFromTopic(topic);
  }

  async getFCMToken() {
    return await messaging().getToken();
  }
}

export default new NotificationService();