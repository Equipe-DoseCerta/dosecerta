import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Alerta {
  snoozeCount: number;
  id: string;
  medicamentoId: number;
  medicamento: string;
  paciente: string;
  horario: string;
  data: Date;
  dosagem: string;
  tipo: string;
  intervalo_horas: number;
  duracaoTratamento: number;
  dataInicio: Date;
  ativo: boolean;
  estoqueBaixo: boolean;
  notificationId?: string;
  isAlarm?: boolean;
  dataDose?: string;
  isSnooze?: boolean;
}

// Constantes para AsyncStorage
const MEDICAMENTOS_SILENCIADOS_KEY = 'medicamentos_silenciados';
const HORARIOS_SILENCIADOS_PREFIX = 'horarios_silenciados_';
const NOTIFICATIONS_PREFIX = 'notifications_';
const DOSE_TOMADA_KEY = 'doses_tomadas';

/** Verifica se o alerta deve ser silenciado */
export async function isAlertaSilenciado(medicamentoId: number, horario: string): Promise<boolean> {
  try {
    if (await isMedicamentoSilenciado(medicamentoId)) return true;
    if (await isHorarioSilenciado(medicamentoId, horario)) return true;
    return false;
  } catch (error) {
    console.error('Erro ao verificar alerta silenciado:', error);
    return false;
  }
}

export async function isMedicamentoSilenciado(medicamentoId: number): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(MEDICAMENTOS_SILENCIADOS_KEY);
    return data ? JSON.parse(data).includes(medicamentoId) : false;
  } catch (error) {
    console.error('Erro ao verificar medicamento silenciado:', error);
    return false;
  }
}

export async function isHorarioSilenciado(medicamentoId: number, horario: string): Promise<boolean> {
  try {
    const key = `${HORARIOS_SILENCIADOS_PREFIX}${medicamentoId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data).includes(horario) : false;
  } catch (error) {
    console.error('Erro ao verificar horário silenciado:', error);
    return false;
  }
}

/** Calcula todas as doses de um medicamento */
export async function calcularTodasDoses(
  horarioInicial: string,
  intervaloHoras: number,
  duracaoDias: number,
  dataInicio: Date
): Promise<{ horario: string; data: Date }[]> {
  const doses: { horario: string; data: Date }[] = [];

  if (!/^[0-2]\d:[0-5]\d$/.test(horarioInicial)) return doses;

  const [horaStr, minutoStr] = horarioInicial.split(':');
  const horaInicial = parseInt(horaStr, 10);
  const minutoInicial = parseInt(minutoStr, 10);

  const dataHoraInicio = new Date(dataInicio);
  dataHoraInicio.setHours(horaInicial, minutoInicial, 0, 0);

  const dataFim = new Date(dataHoraInicio);
  dataFim.setDate(dataFim.getDate() + duracaoDias);

  let dataDoseAtual = new Date(dataHoraInicio);

  while (dataDoseAtual < dataFim) {
    const horas = dataDoseAtual.getHours().toString().padStart(2, '0');
    const minutos = dataDoseAtual.getMinutes().toString().padStart(2, '0');
    doses.push({ horario: `${horas}:${minutos}`, data: new Date(dataDoseAtual) });
    dataDoseAtual = new Date(dataDoseAtual.getTime() + intervaloHoras * 60 * 60 * 1000);
  }

  return doses;
}

/** Cancela notificações existentes */
async function cancelExistingNotifications(medicamentoId: number): Promise<void> {
  try {
    const key = `${NOTIFICATIONS_PREFIX}${medicamentoId}`;
    const existingIds = await AsyncStorage.getItem(key);
    if (existingIds) {
      const ids: string[] = JSON.parse(existingIds);
      ids.forEach(id => PushNotification.cancelLocalNotification(id));
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Erro ao cancelar notificações existentes:', error);
  }
}

/** Verifica se a dose já foi tomada */
async function isDoseTomada(medicamentoId: number, data: Date, horario: string): Promise<boolean> {
  try {
    const dateKey = data.toISOString().split('T')[0];
    const doseKey = `${medicamentoId}_${dateKey}_${horario}`;
    const dosesTomadas = await AsyncStorage.getItem(DOSE_TOMADA_KEY);
    return dosesTomadas ? JSON.parse(dosesTomadas).includes(doseKey) : false;
  } catch (error) {
    console.error('Erro ao verificar dose tomada:', error);
    return false;
  }
}

/** Agenda notificação de dose usando PushNotification */
async function scheduleDoseNotification(med: Alerta, dose: { horario: string; data: Date }): Promise<string | null> {
  try {
    if (await isDoseTomada(med.medicamentoId, dose.data, dose.horario)) return null;
    if (dose.data <= new Date()) return null;

    const notificationId = `${med.medicamentoId}_${dose.data.getTime()}`;

    PushNotification.localNotificationSchedule({
      id: notificationId,
      channelId: 'medicamentos',
      title: 'DoseCerta',
      message: `Hora de tomar ${med.medicamento} (${med.dosagem})`,
      playSound: true,
      soundName: 'toque1.mp3',
      vibrate: true,
      vibration: 300,
      date: dose.data,
      allowWhileIdle: true,
      ongoing: true, // Mantém visível
      invokeApp: true,
      importance: 'max',
      priority: 'max',
    });

    return notificationId;
  } catch (error) {
    console.error('Erro ao agendar notificação:', error);
    return null;
  }
}

/** Agenda todos os alarmes de uma lista de medicamentos */
export async function agendarTodosAlarmes(medicamentos: Alerta[]): Promise<void> {
  try {
    await configurarCanalNotificacao();

    for (const med of medicamentos) {
      if (!med.ativo) continue;
      await cancelExistingNotifications(med.medicamentoId);
      if (await isMedicamentoSilenciado(med.medicamentoId)) continue;

      const doses = await calcularTodasDoses(med.horario, med.intervalo_horas, med.duracaoTratamento, med.dataInicio);
      const notificationIds: string[] = [];

      for (const dose of doses) {
        if (await isHorarioSilenciado(med.medicamentoId, dose.horario)) continue;
        const notificationId = await scheduleDoseNotification(med, dose);
        if (notificationId) notificationIds.push(notificationId);
      }

      if (notificationIds.length > 0) {
        const key = `${NOTIFICATIONS_PREFIX}${med.medicamentoId}`;
        await AsyncStorage.setItem(key, JSON.stringify(notificationIds));
      }
    }
  } catch (error) {
    console.error('Erro crítico ao agendar alarmes:', error);
  }
}

/** Marca dose como tomada */
export async function marcarDoseTomada(medicamentoId: number, data: Date, horario: string): Promise<void> {
  try {
    const dateKey = data.toISOString().split('T')[0];
    const doseKey = `${medicamentoId}_${dateKey}_${horario}`;
    const existingData = await AsyncStorage.getItem(DOSE_TOMADA_KEY);
    const dosesTomadas = existingData ? JSON.parse(existingData) : [];
    if (!dosesTomadas.includes(doseKey)) {
      dosesTomadas.push(doseKey);
      await AsyncStorage.setItem(DOSE_TOMADA_KEY, JSON.stringify(dosesTomadas));
    }
  } catch (error) {
    console.error('Erro ao marcar dose como tomada:', error);
  }
}

/** Configura canal de notificações (Android) */
export async function configurarCanalNotificacao(): Promise<void> {
  PushNotification.createChannel(
    {
      channelId: 'medicamentos',
      channelName: 'Lembretes de Medicamentos',
      playSound: true,
      soundName: 'toque1.mp3',
      importance: 4, // HIGH
      vibrate: true,
    },
    (created: any) => console.log(`Canal ${created ? 'criado' : 'existente'}`)
  );
}

/** Inicializa o sistema de alarmes */
export async function inicializarAlarmes(): Promise<void> {
  console.log('🚀 Inicializando sistema de alarmes');
  await configurarCanalNotificacao();
}

/** Inicia o sistema de alarmes */
export async function iniciarSistemaAlarmes(): Promise<() => void> {
  console.log('⚡ Sistema de alarmes iniciado');
  return () => console.log('🛑 Sistema de alarmes finalizado');
}
