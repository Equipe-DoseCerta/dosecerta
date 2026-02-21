import { NativeModules, NativeEventEmitter, Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar tipo Medicamento do database
import type { Medicamento } from '../database/database';

const { AlarmModule } = NativeModules;

interface AlarmData {
  medicamentoId: number;
  medicamento: string;
  paciente: string;
  dosagem: string;
  horario: string;
  frequencia: string;
  dataInicio: string;
  duracao: string;
  notas: string;
  timestamp: number;
  som: boolean;
  tipoSom: string;
  vibracao: boolean;
  notificacaoVisual: boolean;
}

interface UserPreferences {
  som: boolean;
  tipoSom: '1' | '2' | '3' | '4';
  vibracao: boolean;
  notificacaoVisual: boolean;
}

class NativeAlarmService {
  private eventEmitter: NativeEventEmitter | null = null;
  private reagendarCallback: (() => Promise<void>) | null = null;

  constructor() {
    if (Platform.OS === 'android' && AlarmModule) {
      this.eventEmitter = new NativeEventEmitter(AlarmModule);
      this.setupBootReagendamentoListener();
    }
  }

  /**
   * 🔄 Configura listener para reagendamento após boot
   */
  private setupBootReagendamentoListener() {
    console.log('📡 Configurando listener de REAGENDAR_ALARMES...');
    
    DeviceEventEmitter.addListener('REAGENDAR_ALARMES', async () => {
      console.log('🔄 ========== EVENTO REAGENDAR_ALARMES RECEBIDO ==========');
      console.log('📱 Origem: MainActivity (após boot/reboot)');
      
      try {
        if (this.reagendarCallback) {
          console.log('✅ Executando callback de reagendamento...');
          await this.reagendarCallback();
        } else {
          console.warn('⚠️ Nenhum callback de reagendamento registrado!');
          console.log('💡 Dica: Use setReagendarCallback() na inicialização do app');
        }
      } catch (error) {
        console.error('❌ Erro ao processar reagendamento:', error);
      }
    });
    
    console.log('✅ Listener REAGENDAR_ALARMES configurado com sucesso!');
  }

  /**
   * 🎯 Define callback que será executado quando o dispositivo reiniciar
   */
  setReagendarCallback(callback: () => Promise<void>): void {
    console.log('📝 Callback de reagendamento registrado');
    this.reagendarCallback = callback;
  }

  isAvailable(): boolean {
    return Platform.OS === 'android' && AlarmModule !== null;
  }

  async loadUserPreferences(): Promise<UserPreferences> {
    try {
      const [som, tipoSom, vibracao, notificacaoVisual] = await Promise.all([
        AsyncStorage.getItem('alarme_som'),
        AsyncStorage.getItem('alarme_toque'),
        AsyncStorage.getItem('alarme_vibracao'),
        AsyncStorage.getItem('alarme_visual'),
      ]);

      return {
        som: som !== 'false',
        tipoSom: (['1', '2', '3', '4'].includes(tipoSom ?? '') ? tipoSom : '1') as '1' | '2' | '3' | '4',
        vibracao: vibracao !== 'false',
        notificacaoVisual: notificacaoVisual !== 'false',
      };
    } catch (error) {
      console.error('❌ Erro ao carregar preferências:', error);
      return {
        som: true,
        tipoSom: '1',
        vibracao: true,
        notificacaoVisual: true,
      };
    }
  }

  async checkPermissions(): Promise<{ canScheduleExactAlarms: boolean }> {
    if (!this.isAvailable()) {
      return { canScheduleExactAlarms: true };
    }

    try {
      return await AlarmModule.checkPermissions();
    } catch (error) {
      console.error('❌ Erro ao verificar permissões:', error);
      return { canScheduleExactAlarms: false };
    }
  }

  async openAlarmSettings(): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await AlarmModule.openAlarmSettings();
    } catch (error) {
      console.error('❌ Erro ao abrir configurações:', error);
    }
  }

  async scheduleAlarm(data: AlarmData): Promise<void> {
    if (!this.isAvailable()) {
      console.warn('AlarmModule não disponível');
      return;
    }

    try {
      await AlarmModule.scheduleAlarm(
        data.medicamentoId,
        data.medicamento,
        data.paciente,
        data.dosagem,
        data.horario,
        data.frequencia,
        data.dataInicio,
        data.duracao,
        data.notas,
        data.timestamp,
        data.som,
        data.tipoSom,
        data.vibracao,
        data.notificacaoVisual
      );

      console.log(`✅ Alarme agendado: ${data.medicamento} às ${data.horario}`);
    } catch (error) {
      console.error('❌ Erro ao agendar alarme:', error);
      throw error;
    }
  }

  async cancelAlarm(medicamentoId: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await AlarmModule.cancelAlarm(medicamentoId);
      console.log(`🗑️ Alarme cancelado: ID ${medicamentoId}`);
    } catch (error) {
      console.error('❌ Erro ao cancelar alarme:', error);
    }
  }

  async cancelAllAlarms(medicamentoId: number): Promise<void> {
    try {
      const key = `alarm_ids_${medicamentoId}`;
      const storedIds = await AsyncStorage.getItem(key);
      
      if (storedIds) {
        const ids: number[] = JSON.parse(storedIds);
        
        for (const id of ids) {
          await this.cancelAlarm(id);
        }
        
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('❌ Erro ao cancelar todos os alarmes:', error);
    }
  }

  async calcularDoses(medicamento: Medicamento, prefs: UserPreferences): Promise<AlarmData[]> {
    const doses: AlarmData[] = [];

    try {
      const [dia, mes, ano] = medicamento.dataInicio.split('/').map(Number);
      const [hora, minuto] = medicamento.horario_inicial.split(':').map(Number);
      
      const dataInicio = new Date(ano, mes - 1, dia, hora, minuto);
      const dataFim = new Date(dataInicio);
      dataFim.setDate(dataFim.getDate() + medicamento.duracaoTratamento);

      const agora = new Date();
      let dataDose = new Date(dataInicio);
      let contador = 0;

      const frequenciaTexto = `${medicamento.intervalo_horas}h`;
      const duracaoTexto = `${medicamento.duracaoTratamento} dias`;

      while (dataDose < dataFim && contador < 1000) {
        if (dataDose > agora) {
          const horario = `${dataDose.getHours().toString().padStart(2, '0')}:${dataDose.getMinutes().toString().padStart(2, '0')}`;
          
          doses.push({
            medicamentoId: medicamento.id! + contador,
            medicamento: medicamento.nome,
            paciente: medicamento.nomePaciente || '',
            dosagem: `${medicamento.dosagem} ${medicamento.unidade}`,
            horario,
            frequencia: frequenciaTexto,
            dataInicio: medicamento.dataInicio,
            duracao: duracaoTexto,
            notas: medicamento.notas || '',
            timestamp: dataDose.getTime(),
            som: prefs.som,
            tipoSom: prefs.tipoSom,
            vibracao: prefs.vibracao,
            notificacaoVisual: prefs.notificacaoVisual,
          });
        }

        dataDose = new Date(dataDose.getTime() + medicamento.intervalo_horas * 60 * 60 * 1000);
        contador++;
      }

      return doses;
    } catch (error) {
      console.error('❌ Erro ao calcular doses:', error);
      return [];
    }
  }

  async agendarTodosAlarmes(medicamento: Medicamento): Promise<void> {
    if (!medicamento.ativo) {
      console.log(`⏸️ Medicamento inativo: ${medicamento.nome}`);
      return;
    }

    try {
      await this.cancelAllAlarms(medicamento.id!);

      const prefs = await this.loadUserPreferences();
      const doses = await this.calcularDoses(medicamento, prefs);
      
      if (doses.length === 0) {
        console.log(`⚠️ Nenhuma dose futura para: ${medicamento.nome}`);
        return;
      }

      const alarmIds: number[] = [];

      for (const dose of doses) {
        await this.scheduleAlarm(dose);
        alarmIds.push(dose.medicamentoId);
      }

      const key = `alarm_ids_${medicamento.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(alarmIds));

      console.log(`✅ ${doses.length} alarmes agendados para: ${medicamento.nome}`);
    } catch (error) {
      console.error('❌ Erro ao agendar todos os alarmes:', error);
      throw error;
    }
  }

  async reagendarTodosMedicamentos(medicamentos: Medicamento[]): Promise<void> {
    console.log(`🔄 Reagendando alarmes para ${medicamentos.length} medicamentos...`);

    for (const med of medicamentos) {
      if (med.ativo) {
        await this.agendarTodosAlarmes(med);
      }
    }

    console.log('✅ Reagendamento completo!');
  }

  onDoseConfirmada(callback: (medicamentoId: number, horario: string) => void): () => void {
    if (!this.eventEmitter) return () => {};

    const subscription = this.eventEmitter.addListener(
      'onDoseConfirmada',
      (event: { medicamentoId: number; horario: string }) => {
        callback(event.medicamentoId, event.horario);
      }
    );

    return () => subscription.remove();
  }
}

// ✅ Exporta instância única (singleton)
export default new NativeAlarmService();