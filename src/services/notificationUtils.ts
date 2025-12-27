// src/services/notificationUtils.ts
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medicamento } from '../database/database';

/**
 * 🔔 Configura canal de notificação Android para MEDICAMENTOS
 */
export const configurarCanalNotificacao = () => {
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'medicamentos',
        channelName: 'Lembretes de Medicamentos',
        channelDescription: 'Canal para alarmes de medicamentos',
        playSound: true,
        soundName: 'toque1.mp3',
        importance: 4, // MAX
        vibrate: true,
      },
      (created: boolean) => console.log('✅ Canal de notificação criado:', created)
    );
  }
};

/**
 * 🆕 Configura canal de notificação Android para NOVIDADES
 */
export const configurarCanalNovidades = () => {
  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'novidades_channel',
        channelName: 'Novidades do Sistema',
        channelDescription: 'Avisos, vídeos, áudios e mensagens diretas',
        playSound: true,
        soundName: 'default',
        importance: 4, // HIGH
        vibrate: true,
      },
      (created: boolean) => console.log('✅ Canal de novidades criado:', created)
    );
  }
};

/**
 * 💊 Calcula todas as doses a partir da data inicial
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
 * 🔔 Agendar notificações para um único medicamento (RN puro)
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

    const agora = new Date();

    for (const dose of doses) {
      if (dose.data > agora) {
        const uniqueId = `${med.id}_${dose.data.getTime()}`;

        PushNotification.localNotificationSchedule({
          /* iOS e Android compatível */
          id: uniqueId,
          channelId: 'medicamentos',
          title: `Hora do medicamento: ${med.nome}`,
          message: `Dose: ${med.dosagem}`,
          date: dose.data,
          allowWhileIdle: true,
          playSound: true,
          soundName: Platform.OS === 'android' ? 'toque1.mp3' : 'default',
          vibrate: true,
        });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao agendar notificações:', error);
  }
};

/**
 * 📌 Agenda todos os alarmes de uma lista de medicamentos
 */
export const agendarTodosAlarmes = async (medicamentos: Medicamento[]) => {
  for (const med of medicamentos) {
    await agendarNotificacoesParaMedicamento(med);
  }
};

/**
 * 🔄 Conversor de tipo para unidade
 */
export const getUnidadePorTipo = (tipo: string): string => {
  const unidadesPorTipo: Record<string, string> = {
    comprimido: 'un',
    cápsula: 'un',
    líquido: 'ml',
    pomada: 'g',
    injeção: 'ml',
    spray: 'jato',
    gotas: 'gotas',
    supositório: 'un',
  };
  return unidadesPorTipo[tipo.toLowerCase()] || 'un';
};

/**
 * 📌 AsyncStorage para notificações lidas
 */
export const getLidas = async (tipo: 'diretas' | 'avisos' | 'videos' | 'audios' | 'saudeDiaria') => {
  try {
    const lidas = await AsyncStorage.getItem(`notificacoesLidas_${tipo}`);
    return lidas ? JSON.parse(lidas) : [];
  } catch (error) {
    console.error(`❌ Erro ao buscar lidas (${tipo}):`, error);
    return [];
  }
};

export const marcarComoLida = async (
  tipo: 'diretas' | 'avisos' | 'videos' | 'audios' | 'saudeDiaria',
  ids: number[]
) => {
  try {
    await AsyncStorage.setItem(`notificacoesLidas_${tipo}`, JSON.stringify(ids));
  } catch (error) {
    console.error(`❌ Erro ao marcar como lida (${tipo}):`, error);
  }
};

/**
 * 🔔 Inicializa notificações do app
 */
export const inicializarNotificacoes = async (medicamentos: Medicamento[]) => {
  configurarCanalNotificacao();
  configurarCanalNovidades(); // 🆕 Canal de novidades
  
  if (medicamentos?.length > 0) {
    await agendarTodosAlarmes(medicamentos);
  }
};