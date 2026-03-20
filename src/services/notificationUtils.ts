// src/services/notificationUtils.ts
import notifee, { 
  AndroidImportance, 
  TriggerType, 
  TimestampTrigger 
} from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicamento } from '../database/database';

/**
 * 🔔 Configura canal de notificação Android para MEDICAMENTOS
 */
export const configurarCanalNotificacao = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'medicamentos',
      name: 'Lembretes de Medicamentos',
      importance: AndroidImportance.HIGH,
      sound: 'default', 
      vibration: true,
    });
    console.log('✅ Canal de medicamentos configurado');
  }
};

/**
 * 🆕 Configura canal de notificação Android para NOVIDADES
 */
export const configurarCanalNovidades = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'novidades_channel',
      name: 'Novidades do Sistema',
      importance: AndroidImportance.HIGH,
      vibration: true,
    });
    console.log('✅ Canal de novidades configurado');
  }
};

/**
 * 💊 Calcula todas as doses a partir da data inicial (Lógica mantida)
 */
function calcularTodasDoses(
  horarioInicial: string,
  intervaloHoras: number,
  duracaoDias: number,
  dataInicio: Date
): { horario: string; data: Date }[] {
  if (!horarioInicial.match(/^[0-2]\d:[0-5]\d$/)) return [];
  if (isNaN(dataInicio.getTime())) return [];

  const [horaStr, minutoStr] = horarioInicial.split(':');
  const horaInicial = parseInt(horaStr, 10);
  const minutoInicial = parseInt(minutoStr, 10);

  const doses: { horario: string; data: Date }[] = [];
  const dataHoraInicio = new Date(dataInicio);
  dataHoraInicio.setHours(horaInicial, minutoInicial, 0, 0);

  const dataFim = new Date(dataHoraInicio);
  dataFim.setDate(dataFim.getDate() + duracaoDias);

  const intervaloMs = intervaloHoras * 60 * 60 * 1000;
  let dataDoseAtual = new Date(dataHoraInicio);

  const maxDoses = Math.ceil((24 * duracaoDias) / intervaloHoras) + 1;

  for (let i = 0; i < maxDoses; i++) {
    if (dataDoseAtual > dataFim) break;
    const horas = dataDoseAtual.getHours().toString().padStart(2, '0');
    const minutos = dataDoseAtual.getMinutes().toString().padStart(2, '0');
    doses.push({ horario: `${horas}:${minutos}`, data: new Date(dataDoseAtual) });
    dataDoseAtual = new Date(dataDoseAtual.getTime() + intervaloMs);
  }
  return doses;
}

/**
 * 🔔 Agendar notificações via Notifee Triggers
 */
export const agendarNotificacoesParaMedicamento = async (med: Medicamento) => {
  try {
    const [dia, mes, ano] = med.dataInicio.split('/').map(Number);
    const [hora, minuto] = med.horario_inicial.split(':').map(Number);
    const dataInicial = new Date(ano, mes - 1, dia, hora, minuto);

    if (isNaN(dataInicial.getTime())) return;

    const doses = calcularTodasDoses(
      med.horario_inicial,
      med.intervalo_horas,
      med.duracaoTratamento,
      dataInicial
    );

    const agora = new Date().getTime();

    for (const dose of doses) {
      const timestampDose = dose.data.getTime();
      
      if (timestampDose > agora) {
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: timestampDose,
          alarmManager: { allowWhileIdle: true },
        };

        await notifee.createTriggerNotification(
          {
            id: `${med.id}_${timestampDose}`,
            title: `Hora do medicamento: ${med.nome}`,
            body: `Dose: ${med.dosagem}`,
            android: {
              channelId: 'medicamentos',
              importance: AndroidImportance.HIGH,
              pressAction: { id: 'default' },
              color: '#0A7AB8',
              smallIcon: 'ic_launcher',
            },
          },
          trigger,
        );
      }
    }
  } catch (error) {
    console.error('❌ Erro ao agendar notificações:', error);
  }
};

export const agendarTodosAlarmes = async (medicamentos: Medicamento[]) => {
  for (const med of medicamentos) {
    await agendarNotificacoesParaMedicamento(med);
  }
};

export const getUnidadePorTipo = (tipo: string): string => {
  const unidadesPorTipo: Record<string, string> = {
    comprimido: 'un', cápsula: 'un', líquido: 'ml', pomada: 'g',
    injeção: 'ml', spray: 'jato', gotas: 'gotas', supositório: 'un',
  };
  return unidadesPorTipo[tipo.toLowerCase()] || 'un';
};

export const getLidas = async (tipo: 'diretas' | 'avisos' | 'videos' | 'audios' | 'saudeDiaria') => {
  try {
    const lidas = await AsyncStorage.getItem(`notificacoesLidas_${tipo}`);
    return lidas ? JSON.parse(lidas) : [];
  } catch {
    // Variável 'error' removida pois não era usada
    return [];
  }
};

export const marcarComoLida = async (tipo: 'diretas' | 'avisos' | 'videos' | 'audios' | 'saudeDiaria', ids: number[]) => {
  try {
    await AsyncStorage.setItem(`notificacoesLidas_${tipo}`, JSON.stringify(ids));
  } catch {
    // Variável 'error' removida pois não era usada
  }
};

/**
 * 🔔 Inicializa notificações
 */
export const inicializarNotificacoes = async (medicamentos: Medicamento[]) => {
  await configurarCanalNotificacao();
  await configurarCanalNovidades();
  
  if (medicamentos?.length > 0) {
    await agendarTodosAlarmes(medicamentos);
  }
};