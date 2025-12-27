import { NativeModules, NativeEventEmitter, Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Medicamento } from '../database/database';

const { AlarmModule } = NativeModules;

// 🔇 CONSTANTES
const MEDICAMENTOS_SILENCIADOS_KEY = 'medicamentos_silenciados';
const ALARM_ID_MAPPING_KEY = 'alarm_id_mapping';

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

// 🆕 INTERFACE ATUALIZADA COM VOLUME
interface UserPreferences {
  som: boolean;
  tipoSom: '1' | '2' | '3' | '4';
  vibracao: boolean;
  notificacaoVisual: boolean;
  volumeAlarme: number; // 🆕 Volume 0-100
}

// 🆕 INTERFACE PARA updateGlobalPreferences
export interface GlobalPreferences {
  som: boolean;
  vibracao: boolean;
  notificacaoVisual: boolean;
  tipoSom: string;
  volumeAlarme: number; // 🆕 Volume 0-100
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
   * 🔇 Verifica se medicamento está silenciado
   */
  private async isMedicamentoSilenciado(medicamentoId: number): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(MEDICAMENTOS_SILENCIADOS_KEY);
      const silenciados: number[] = data ? JSON.parse(data) : [];
      const isSilenced = silenciados.includes(medicamentoId);
      
      console.log(`[NATIVE_ALARM] 🔍 Verificando ID ${medicamentoId}: ${isSilenced ? 'SILENCIADO' : 'ATIVO'}`);
      return isSilenced;
    } catch (error) {
      console.error('[NATIVE_ALARM] ❌ Erro ao verificar silenciamento:', error);
      return false;
    }
  }

  /**
   * 🆕 Salva mapeamento entre ID do alarme e ID base do medicamento
   */
  private async saveMedicamentoIdMapping(alarmId: number, medicamentoIdBase: number): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(ALARM_ID_MAPPING_KEY);
      const mapping: Record<number, number> = data ? JSON.parse(data) : {};
      
      mapping[alarmId] = medicamentoIdBase;
      
      await AsyncStorage.setItem(ALARM_ID_MAPPING_KEY, JSON.stringify(mapping));
      
      // 🔥 Sincroniza com SharedPreferences nativo (Kotlin)
      if (AlarmModule && AlarmModule.saveMedicamentoIdMapping) {
        await AlarmModule.saveMedicamentoIdMapping(alarmId, medicamentoIdBase);
      }
      
      console.log(`[NATIVE_ALARM] 🗺️ Mapeamento salvo: Alarme ${alarmId} → Med BASE ${medicamentoIdBase}`);
    } catch (error) {
      console.error('[NATIVE_ALARM] ❌ Erro ao salvar mapeamento:', error);
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
    console.log('🔌 Callback de reagendamento registrado');
    this.reagendarCallback = callback;
  }

  isAvailable(): boolean {
    return Platform.OS === 'android' && AlarmModule !== null;
  }

  /**
   * 🆕 FUNÇÃO ATUALIZADA: Carrega preferências incluindo volume
   */
  async loadUserPreferences(): Promise<UserPreferences> {
    try {
      const [som, tipoSom, vibracao, notificacaoVisual, volume] = await Promise.all([
        AsyncStorage.getItem('alarme_som'),
        AsyncStorage.getItem('alarme_toque'),
        AsyncStorage.getItem('alarme_vibracao'),
        AsyncStorage.getItem('alarme_visual'),
        AsyncStorage.getItem('alarme_volume'), // 🆕 Carregar volume
      ]);

      return {
        som: som !== 'false',
        tipoSom: (['1', '2', '3', '4'].includes(tipoSom ?? '') ? tipoSom : '1') as '1' | '2' | '3' | '4',
        vibracao: vibracao !== 'false',
        notificacaoVisual: notificacaoVisual !== 'false',
        volumeAlarme: volume ? parseInt(volume, 10) : 75, // 🆕 Padrão 75%
      };
    } catch (error) {
      console.error('❌ Erro ao carregar preferências:', error);
      return {
        som: true,
        tipoSom: '1',
        vibracao: true,
        notificacaoVisual: true,
        volumeAlarme: 75, // 🆕 Padrão 75%
      };
    }
  }

  /**
   * 🆕 FUNÇÃO ATUALIZADA: Atualiza preferências globais incluindo volume
   * Sincroniza as configurações com o SharedPreferences do Android
   */
  async updateGlobalPreferences(preferences: GlobalPreferences): Promise<boolean> {
    try {
      console.log('[NATIVE_ALARM] 🔧 Atualizando preferências globais:', preferences);

      // 1️⃣ Salva no AsyncStorage (React Native)
      await AsyncStorage.multiSet([
        ['alarme_som', preferences.som.toString()],
        ['alarme_vibracao', preferences.vibracao.toString()],
        ['alarme_visual', preferences.notificacaoVisual.toString()],
        ['alarme_toque', preferences.tipoSom],
        ['alarme_volume', preferences.volumeAlarme.toString()], // 🆕 Salvar volume
      ]);
      
      console.log('[NATIVE_ALARM] ✅ Preferências salvas no AsyncStorage');

      // 2️⃣ Sincroniza com o código nativo (Kotlin SharedPreferences)
      if (this.isAvailable() && AlarmModule.updateGlobalPreferences) {
        // 🆕 Passar todas as preferências incluindo volume
        await AlarmModule.updateGlobalPreferences({
          som: preferences.som,
          vibracao: preferences.vibracao,
          notificacaoVisual: preferences.notificacaoVisual,
          tipoSom: preferences.tipoSom,
          volumeAlarme: preferences.volumeAlarme, // 🆕 Volume
        });
        console.log('[NATIVE_ALARM] ✅ Preferências sincronizadas com código nativo');
      } else {
        console.warn('[NATIVE_ALARM] ⚠️ Método nativo updateGlobalPreferences não disponível');
      }

      return true;
    } catch (error) {
      console.error('[NATIVE_ALARM] ❌ Erro ao atualizar preferências globais:', error);
      throw error;
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

  /**
   * 🔥 CORREÇÃO CRÍTICA: Função calcularDoses com IDs únicos globais
   * 
   * Formato dos IDs:
   * - Medicamento 1: 100000, 100001, 100002...
   * - Medicamento 2: 200000, 200001, 200002...
   * - Medicamento 5: 500000, 500001, 500002...
   */
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
          
          // 🔥 CORREÇÃO: Gerar ID único globalmente
          // Fórmula: (MedicamentoID * 100000) + Contador
          // Exemplo: Med 2, dose 5 = 200005
          const alarmIdUnico = (medicamento.id! * 100000) + contador;
          
          doses.push({
            medicamentoId: alarmIdUnico, // ← ID ÚNICO GLOBAL
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
          
          console.log(`[NATIVE_ALARM] 🔢 Dose: Alarme ${alarmIdUnico} → Med ${medicamento.id} (${medicamento.nome})`);
        }

        dataDose = new Date(dataDose.getTime() + medicamento.intervalo_horas * 60 * 60 * 1000);
        contador++;
      }

      console.log(`[NATIVE_ALARM] ✅ ${doses.length} doses calculadas para ${medicamento.nome}`);
      return doses;
    } catch (error) {
      console.error('❌ Erro ao calcular doses:', error);
      return [];
    }
  }

  /**
   * 🔇 FUNÇÃO CORRIGIDA: Verifica silenciamento antes de agendar
   */
  async agendarTodosAlarmes(medicamento: Medicamento): Promise<void> {
    if (!medicamento.ativo) {
      console.log(`⏸️ Medicamento inativo: ${medicamento.nome}`);
      return;
    }

    // 🔇 VERIFICAR SE ESTÁ SILENCIADO
    const isSilenced = await this.isMedicamentoSilenciado(medicamento.id!);
    if (isSilenced) {
      console.log(`[NATIVE_ALARM] 🔇 Medicamento ${medicamento.id} (${medicamento.nome}) está SILENCIADO - pulando`);
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
        // 🆕 SALVA MAPEAMENTO: Alarme ID → Medicamento ID BASE
        await this.saveMedicamentoIdMapping(dose.medicamentoId, medicamento.id!);
        
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

  /**
   * 🔄 FUNÇÃO CORRIGIDA: Reagenda todos os medicamentos
   * Usado quando preferências mudam
   */
  async reagendarTodosMedicamentos(medicamentos: Medicamento[]): Promise<void> {
    console.log(`🔄 Reagendando alarmes para ${medicamentos.length} medicamentos...`);

    for (const med of medicamentos) {
      if (med.ativo) {
        const isSilenced = await this.isMedicamentoSilenciado(med.id!);
        if (!isSilenced) {
          await this.agendarTodosAlarmes(med);
        } else {
          console.log(`[NATIVE_ALARM] 🔇 Pulando medicamento silenciado: ${med.nome}`);
        }
      }
    }

    console.log('✅ Reagendamento completo!');
  }

  /**
   * 🆕 NOVA FUNÇÃO: Agenda alarmes de um medicamento específico (para reativação)
   */
  async agendarAlarmeUnico(medicamento: Medicamento): Promise<void> {
    console.log(`[NATIVE_ALARM] 🔔 Agendando alarmes para medicamento reativado: ${medicamento.nome}`);
    
    // Remove da lista de silenciados (se estiver)
    try {
      const data = await AsyncStorage.getItem(MEDICAMENTOS_SILENCIADOS_KEY);
      let silenciados: number[] = data ? JSON.parse(data) : [];
      silenciados = silenciados.filter(id => id !== medicamento.id);
      await AsyncStorage.setItem(MEDICAMENTOS_SILENCIADOS_KEY, JSON.stringify(silenciados));
      
      // 🆕 Sincroniza com o módulo nativo (Kotlin)
      if (AlarmModule && AlarmModule.unsilenceMedication) {
        await AlarmModule.unsilenceMedication(medicamento.id!);
      }
      
    } catch (error) {
      console.error('[NATIVE_ALARM] ⚠️ Erro ao remover silenciamento:', error);
    }
    
    // Agenda os alarmes
    await this.agendarTodosAlarmes(medicamento);
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

// ✅ Exporta tipos para TypeScript
export type { GlobalPreferences, UserPreferences, AlarmData };