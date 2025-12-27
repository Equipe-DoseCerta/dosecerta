import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const { AlarmModule } = NativeModules;

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
const ALARM_TO_MED_MAPPING_KEY = 'alarm_to_med_mapping';

/**
 * 🆕 Busca o ID base do medicamento a partir do ID do alarme
 */
export async function getMedicamentoIdFromAlarm(alarmId: number): Promise<number> {
  try {
    const mappingData = await AsyncStorage.getItem(ALARM_TO_MED_MAPPING_KEY);
    if (!mappingData) {
      console.warn(`[ALARME] ⚠️ Nenhum mapeamento encontrado, usando ID ${alarmId} como base`);
      return alarmId;
    }
    
    const mapping: Record<number, number> = JSON.parse(mappingData);
    const medId = mapping[alarmId];
    
    if (medId !== undefined) {
      console.log(`[ALARME] 🔍 Alarme ${alarmId} → Medicamento BASE ${medId}`);
      return medId;
    }
    
    console.warn(`[ALARME] ⚠️ ID ${alarmId} não encontrado no mapeamento, usando como base`);
    return alarmId;
  } catch (error) {
    console.error('[ALARME] ❌ Erro ao buscar mapeamento:', error);
    return alarmId;
  }
}

/**
 * 🔇 Marca medicamento como silenciado E CANCELA ALARMES IMEDIATAMENTE
 */
export async function silenciarMedicamento(medicamentoId: number): Promise<void> {
  try {
    console.log(`[ALARME] 🔇 Silenciando medicamento BASE ${medicamentoId}...`);
    
    const silenciadosData = await AsyncStorage.getItem(MEDICAMENTOS_SILENCIADOS_KEY);
    const silenciados: number[] = silenciadosData ? JSON.parse(silenciadosData) : [];
    
    if (!silenciados.includes(medicamentoId)) {
      silenciados.push(medicamentoId);
      await AsyncStorage.setItem(MEDICAMENTOS_SILENCIADOS_KEY, JSON.stringify(silenciados));
      console.log(`[ALARME] ✅ Medicamento ${medicamentoId} marcado como silenciado no AsyncStorage`);
    }
    
    try {
      if (AlarmModule && AlarmModule.silenceMedication) {
        await AlarmModule.silenceMedication(medicamentoId);
        console.log(`[ALARME] ✅ Medicamento ${medicamentoId} silenciado no módulo nativo`);
      } else {
        console.warn('[ALARME] ⚠️ AlarmModule.silenceMedication não disponível');
      }
    } catch (nativeError) {
      console.error('[ALARME] ⚠️ Erro ao silenciar no módulo nativo:', nativeError);
    }
    
    console.log(`[ALARME] 🗑️ Cancelando alarmes nativos do medicamento ${medicamentoId}...`);
    await cancelarAlarmesMedicamento(medicamentoId);
    
  } catch (error) {
    console.error('[ALARME] ❌ Erro ao silenciar medicamento:', error);
    throw error;
  }
}

/**
 * 🔔 Remove medicamento da lista de silenciados
 */
export async function reativarMedicamento(medicamentoId: number): Promise<void> {
  try {
    console.log(`[ALARME] 🔔 Reativando medicamento BASE ${medicamentoId}...`);
    
    const silenciadosData = await AsyncStorage.getItem(MEDICAMENTOS_SILENCIADOS_KEY);
    if (silenciadosData) {
      const silenciados: number[] = JSON.parse(silenciadosData);
      const novaLista = silenciados.filter(id => id !== medicamentoId);
      await AsyncStorage.setItem(MEDICAMENTOS_SILENCIADOS_KEY, JSON.stringify(novaLista));
      console.log(`[ALARME] ✅ Medicamento ${medicamentoId} removido da lista de silenciados no AsyncStorage`);
    }
    
    try {
      if (AlarmModule && AlarmModule.unsilenceMedication) {
        await AlarmModule.unsilenceMedication(medicamentoId);
        console.log(`[ALARME] ✅ Medicamento ${medicamentoId} reativado no módulo nativo`);
      } else {
        console.warn('[ALARME] ⚠️ AlarmModule.unsilenceMedication não disponível');
      }
    } catch (nativeError) {
      console.error('[ALARME] ⚠️ Erro ao reativar no módulo nativo:', nativeError);
    }
  } catch (error) {
    console.error('[ALARME] ❌ Erro ao reativar medicamento:', error);
    throw error;
  }
}

/**
 * 🗑️ Cancela TODOS os alarmes de um medicamento
 */
export async function cancelarAlarmesMedicamento(medicamentoId: number): Promise<number> {
  try {
    console.log(`[ALARME] 🗑️ Iniciando cancelamento de alarmes: Med BASE ${medicamentoId}`);

    const key = `${NOTIFICATIONS_PREFIX}${medicamentoId}`;
    const storedIds = await AsyncStorage.getItem(key);
    
    let cancelados = 0;
    
    if (storedIds) {
      const ids: string[] = JSON.parse(storedIds);
      console.log(`[ALARME] 📋 ${ids.length} alarmes encontrados no AsyncStorage`);

      for (const notificationId of ids) {
        try {
          PushNotification.cancelLocalNotification(notificationId);
          cancelados++;
        } catch (error) {
          console.warn(`[ALARME] ⚠️ Erro ao cancelar notificação ${notificationId}:`, error);
        }
      }
      
      await AsyncStorage.removeItem(key);
      console.log('[ALARME] 🧹 AsyncStorage limpo');
    } else {
      console.log('[ALARME] ℹ️ Nenhum alarme encontrado no AsyncStorage');
    }

    try {
      if (AlarmModule && AlarmModule.cancelAlarm) {
        await AlarmModule.cancelAlarm(medicamentoId);
        console.log('[ALARME] ✅ Alarme nativo cancelado via Kotlin');
      } else {
        console.warn('[ALARME] ⚠️ AlarmModule.cancelAlarm não disponível');
      }
    } catch (nativeError) {
      console.error('[ALARME] ❌ Erro ao cancelar alarme nativo:', nativeError);
    }

    try {
      const horariosSilenciadosKey = `${HORARIOS_SILENCIADOS_PREFIX}${medicamentoId}`;
      await AsyncStorage.removeItem(horariosSilenciadosKey);
    } catch (cleanupError) {
      console.warn('[ALARME] ⚠️ Erro na limpeza de horários silenciados:', cleanupError);
    }

    console.log(`[ALARME] ✅ ${cancelados} alarmes cancelados com sucesso`);
    return cancelados;
  } catch (error) {
    console.error('[ALARME] ❌ Erro crítico ao cancelar alarmes:', error);
    return 0;
  }
}

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
      ongoing: true,
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

export async function agendarTodosAlarmes(medicamentos: Alerta[]): Promise<void> {
  try {
    await configurarCanalNotificacao();

    for (const med of medicamentos) {
      if (!med.ativo) continue;
      await cancelExistingNotifications(med.medicamentoId);
      
      if (await isMedicamentoSilenciado(med.medicamentoId)) {
        console.log(`[ALARME] 🔇 Medicamento ${med.medicamentoId} está silenciado - pulando agendamento`);
        continue;
      }

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

// ============================================================================
// 🆕 NOVAS FUNÇÕES ADICIONADAS PARA O HISTORICOSCREEN.TSX
// ============================================================================

/**
 * Conta quantos alarmes/notificações futuras existem para um medicamento
 */
export async function contarAlarmesAtivos(medicamentoId: number): Promise<number> {
  try {
    const key = `${NOTIFICATIONS_PREFIX}${medicamentoId}`;
    const storedIds = await AsyncStorage.getItem(key);
    
    if (!storedIds) return 0;
    
    const ids: string[] = JSON.parse(storedIds);
    
    // Opcional: Filtrar apenas IDs que representam datas futuras
    // O formato do ID é `${medicamentoId}_${timestamp}`
    const futuros = ids.filter(id => {
      const parts = id.split('_');
      if (parts.length === 2) {
        const timestamp = parseInt(parts[1], 10);
        return !isNaN(timestamp) && timestamp > Date.now();
      }
      return false;
    });

    return futuros.length;
  } catch (error) {
    console.error('[ALARME] Erro ao contar alarmes ativos:', error);
    return 0;
  }
}

/**
 * Retorna uma lista formatada dos próximos horários de alarme
 */
export async function listarProximosAlarmes(medicamentoId: number): Promise<string[]> {
  try {
    const key = `${NOTIFICATIONS_PREFIX}${medicamentoId}`;
    const storedIds = await AsyncStorage.getItem(key);
    
    if (!storedIds) return [];
    
    const ids: string[] = JSON.parse(storedIds);
    const datas: Date[] = [];
    
    ids.forEach(id => {
      // O ID é gerado como `${medicamentoId}_${timestamp}` na função scheduleDoseNotification
      const parts = id.split('_');
      if (parts.length === 2) {
        const timestamp = parseInt(parts[1], 10);
        if (!isNaN(timestamp)) {
          const data = new Date(timestamp);
          // Apenas datas futuras
          if (data.getTime() > Date.now()) {
            datas.push(data);
          }
        }
      }
    });
    
    // Ordenar cronologicamente e pegar os 5 primeiros
    const proximas = datas.sort((a, b) => a.getTime() - b.getTime()).slice(0, 5);
    
    // Formatar para string legível
    return proximas.map(d => {
      const dia = d.getDate().toString().padStart(2, '0');
      const mes = (d.getMonth() + 1).toString().padStart(2, '0');
      const hora = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return `${dia}/${mes} às ${hora}:${min}`;
    });
  } catch (error) {
    console.error('[ALARME] Erro ao listar próximos alarmes:', error);
    return [];
  }
}

// ============================================================================

export async function configurarCanalNotificacao(): Promise<void> {
  PushNotification.createChannel(
    {
      channelId: 'medicamentos',
      channelName: 'Lembretes de Medicamentos',
      playSound: true,
      soundName: 'toque1.mp3',
      importance: 4,
      vibrate: true,
    },
    (created: any) => console.log(`Canal ${created ? 'criado' : 'existente'}`)
  );
}

export async function inicializarAlarmes(): Promise<void> {
  console.log('🚀 ========== INICIALIZANDO SISTEMA DE ALARMES ==========');
  await configurarCanalNotificacao();
  
  try {
    const silenciadosData = await AsyncStorage.getItem(MEDICAMENTOS_SILENCIADOS_KEY);
    const silenciados: number[] = silenciadosData ? JSON.parse(silenciadosData) : [];
    
    console.log('[ALARME] 📋 Medicamentos silenciados no AsyncStorage:', silenciados);
    
    if (AlarmModule && AlarmModule.syncSilencedMedications) {
      await AlarmModule.syncSilencedMedications(silenciados);
      console.log(`[ALARME] ✅ ${silenciados.length} medicamentos sincronizados com módulo nativo`);
      
      await new Promise(resolve => setTimeout(() => resolve(null), 500));
      
      for (const medId of silenciados) {
        try {
          const isSilenced = await AlarmModule.isMedicationSilenced(medId);
          console.log(`[ALARME] 🔍 Verificação: Med ${medId} = ${isSilenced ? 'SILENCIADO' : 'ATIVO'}`);
          
          if (!isSilenced) {
            console.error(`[ALARME] ❌ ERRO: Med ${medId} NÃO está marcado como silenciado no nativo!`);
            await AlarmModule.silenceMedication(medId);
          }
        } catch (error) {
          console.error(`[ALARME] ❌ Erro ao verificar medicamento ${medId}:`, error);
        }
      }
      
      console.log('[ALARME] ✅ Sincronização e verificação concluídas com sucesso');
    } else {
      console.warn('[ALARME] ⚠️ AlarmModule.syncSilencedMedications não disponível');
    }
  } catch (error) {
    console.error('[ALARME] ❌ ERRO CRÍTICO ao sincronizar medicamentos silenciados:', error);
  }
  
  console.log('✅ ========== SISTEMA DE ALARMES INICIALIZADO ==========');
}

export async function iniciarSistemaAlarmes(): Promise<() => void> {
  console.log('⚡ Sistema de alarmes iniciado');
  return () => console.log('🛑 Sistema de alarmes finalizado');
}