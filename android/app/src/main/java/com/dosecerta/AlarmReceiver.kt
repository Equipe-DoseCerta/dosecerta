package com.dosecerta

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log

/**
 * 📡 BROADCAST RECEIVER - RECEBE ALARMES DO ALARMMANAGER
 * 
 * Funciona mesmo quando:
 * ✅ App fechado
 * ✅ Tela desligada
 * ✅ Economia de bateria
 * 
 * 🆕 IMPLEMENTAÇÕES:
 * 1. IDs únicos com mapeamento (Alarme ID → Medicamento BASE ID)
 * 2. Leitura de preferências globais (som, vibração, toque)
 * 3. 🆕 Tratamento de checagem de novidades (CHECK_NOVIDADES)
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "AlarmReceiver"
        private const val PREFS_NAME = "alarm_id_mapping"
        private const val KEY_MAPPING = "id_mapping"
        private const val PREFS_GLOBAL = "alarm_preferences"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        Thread {
            val wakeLock = acquireWakeLock(context)
            try {
                Log.d(TAG, "📢 ========== ALARME RECEBIDO ==========")
                Log.d(TAG, "📱 Context: ${context.javaClass.simpleName}")
                Log.d(TAG, "📦 Action: ${intent.action}")

                // ========================================
                // 🆕 CHECAGEM DE NOVIDADES EM BACKGROUND
                // ========================================
                if (intent.action == "com.dosecerta.CHECK_NOVIDADES") {
                    Log.d(TAG, "🔍 ========== CHECAGEM DE NOVIDADES INICIADA ==========")
                    
                    try {
                        val serviceIntent = Intent(context, NovidadesCheckService::class.java)
                        
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent)
                            Log.d(TAG, "✅ NovidadesCheckService iniciado em Foreground (Android 8+)")
                        } else {
                            context.startService(serviceIntent)
                            Log.d(TAG, "✅ NovidadesCheckService iniciado (Android < 8)")
                        }
                        
                        Log.d(TAG, "🎉 Checagem de novidades delegada ao Service")
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Erro ao iniciar NovidadesCheckService: ${e.message}", e)
                    }
                    
                    return@Thread
                }

                // ========================================
                // 🔄 REAGENDAMENTO APÓS BOOT
                // ========================================
                if (intent.action == "com.dosecerta.REAGENDAR_ALARMES") {
                    Log.d(TAG, "🔄 Recebido Broadcast de REAGENDAR_ALARMES")
                    val rnIntent = Intent("REAGENDAR_ALARMES")
                    context.sendBroadcast(rnIntent)
                    Log.d(TAG, "✅ Evento REAGENDAR_ALARMES enviado para RN")
                    return@Thread
                }

                // ========================================
                // ✅ VERIFICAÇÃO DE PERMISSÃO (Android 12+)
                // ========================================
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                    if (!alarmManager.canScheduleExactAlarms()) {
                        Log.w(TAG, "⚠️ Sem permissão para SCHEDULE_EXACT_ALARM!")
                    }
                }

                // ========================================
                // 🔍 VALIDAR ID DO ALARME
                // ========================================
                val alarmId = intent.getIntExtra("medicamentoId", -1)
                if (alarmId == -1) {
                    Log.e(TAG, "❌ ID de alarme inválido! Abortando...")
                    return@Thread
                }

                // ========================================
                // 🔥 BUSCAR ID BASE DO MEDICAMENTO
                // ========================================
                Log.d(TAG, "🔍 ========== VERIFICANDO SILENCIAMENTO ==========")
                Log.d(TAG, "🔍 Alarme ID (recebido): $alarmId")
                
                val medicamentoIdBase = getMedicamentoIdBase(context, alarmId)
                Log.d(TAG, "🔍 ID BASE do medicamento: $medicamentoIdBase")
                
                // ========================================
                // 🔇 VERIFICAR SILENCIAMENTO
                // ========================================
                SilencedMedicationsManager.reloadCache(context)
                val todosOsSilenciados = SilencedMedicationsManager.getAllSilencedIds(context)
                Log.d(TAG, "📋 Todos os IDs silenciados: $todosOsSilenciados")
                
                val isSilenced = SilencedMedicationsManager.isMedicationSilenced(context, medicamentoIdBase)
                Log.d(TAG, "🔍 Verificação ID BASE $medicamentoIdBase: ${if (isSilenced) "🔇 SILENCIADO" else "✅ ATIVO"}")
                
                if (isSilenced) {
                    Log.w(TAG, "🔇 ========== ALARME BLOQUEADO ==========")
                    Log.w(TAG, "🔇 Medicamento BASE $medicamentoIdBase está SILENCIADO")
                    Log.w(TAG, "🔇 Alarme $alarmId NÃO será disparado!")
                    Log.w(TAG, "🔇 =======================================")
                    return@Thread
                }
                
                Log.d(TAG, "✅ Medicamento BASE $medicamentoIdBase está ATIVO - prosseguindo...")

                // ========================================
                // 🔕 VERIFICAR SE SOM ESTÁ DESATIVADO
                // (alarme dispara normalmente, mas sem áudio)
                // ========================================
                val somDesativado = try {
                    val prefssom = context.getSharedPreferences("medicamentos_som_desativado", Context.MODE_PRIVATE)
                    val ids = prefssom.getStringSet("som_desativado_ids", emptySet()) ?: emptySet()
                    val resultado = ids.contains(medicamentoIdBase.toString())
                    Log.d(TAG, "🔕 Som desativado para med $medicamentoIdBase: $resultado (ids=$ids)")
                    resultado
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Erro ao verificar som desativado: ${e.message}", e)
                    false
                }

                // ========================================
                // 📋 EXTRAIR DADOS BÁSICOS
                // ========================================
                val medicamento = intent.getStringExtra("medicamento") ?: "Medicamento"
                val paciente = intent.getStringExtra("paciente") ?: ""
                val dosagem = intent.getStringExtra("dosagem") ?: "Dose"
                val horario = intent.getStringExtra("horario") ?: "Horário"
                val frequencia = intent.getStringExtra("frequencia") ?: ""
                val dataInicio = intent.getStringExtra("dataInicio") ?: ""
                val duracao = intent.getStringExtra("duracao") ?: ""
                val notas = intent.getStringExtra("notas") ?: ""

                // ========================================
                // 🆕 LEITURA DE PREFERÊNCIAS (COM FALLBACK)
                // ========================================
                var som = intent.getBooleanExtra("som", true)
                var tipoSom = intent.getStringExtra("tipoSom") ?: "1"
                var vibracao = intent.getBooleanExtra("vibracao", true)
                var notificacaoVisual = intent.getBooleanExtra("notificacaoVisual", true)

                try {
                    val prefGlobal = context.getSharedPreferences(PREFS_GLOBAL, Context.MODE_PRIVATE)
                    
                    if (prefGlobal.contains("som")) {
                        som = prefGlobal.getBoolean("som", som)
                        Log.d(TAG, "🔧 Preferência global 'som' aplicada: $som")
                    }
                    
                    if (prefGlobal.contains("tipoSom")) {
                        tipoSom = prefGlobal.getString("tipoSom", tipoSom) ?: tipoSom
                        Log.d(TAG, "🔧 Preferência global 'tipoSom' aplicada: $tipoSom")
                    }
                    
                    if (prefGlobal.contains("vibracao")) {
                        vibracao = prefGlobal.getBoolean("vibracao", vibracao)
                        Log.d(TAG, "🔧 Preferência global 'vibracao' aplicada: $vibracao")
                    }
                    
                    if (prefGlobal.contains("notificacaoVisual")) {
                        notificacaoVisual = prefGlobal.getBoolean("notificacaoVisual", notificacaoVisual)
                        Log.d(TAG, "🔧 Preferência global 'notificacaoVisual' aplicada: $notificacaoVisual")
                    }
                    
                    Log.d(TAG, "✅ Preferências aplicadas: Som=$som, Toque=$tipoSom, Vibração=$vibracao, Visual=$notificacaoVisual")
                    
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Erro ao ler preferências globais: ${e.message}", e)
                    Log.d(TAG, "⚠️ Usando valores da Intent como fallback")
                }

                // ========================================
                // 📋 LOG DE INFORMAÇÕES
                // ========================================
                Log.d(TAG, "📋 Dados do alarme recebidos com sucesso.")
                Log.d(TAG, "💊 Medicamento: $medicamento")
                Log.d(TAG, "⏰ Horário: $horario")
                Log.d(TAG, "📊 Configurações: Som=$som | Toque=$tipoSom | Vibração=$vibracao | Visual=$notificacaoVisual")

                // ========================================
                // 🚀 INICIAR SERVIÇO DE ALARME
                // ========================================
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    Log.d(TAG, "📱 Android 14+ detectado: iniciando serviço com contexto seguro")
                }

                // 🔕 Se som desativado via botão na tela, sobrescreve o parâmetro som→false
                val somFinal = if (somDesativado) {
                    Log.d(TAG, "🔕 Som desativado pelo usuário — disparando alarme SEM SOM")
                    false
                } else {
                    som
                }

                AlarmService.startAlarmService(
                    context = context,
                    medicamentoId = alarmId,
                    medicamento = medicamento,
                    paciente = paciente,
                    dosagem = dosagem,
                    horario = horario,
                    frequencia = frequencia,
                    dataInicio = dataInicio,
                    duracao = duracao,
                    notas = notas,
                    som = somFinal,
                    tipoSom = tipoSom,
                    vibracao = vibracao,
                    notificacaoVisual = notificacaoVisual
                )

                Log.d(TAG, "✅ ========== PROCESSAMENTO COMPLETO ==========")

            } catch (e: Exception) {
                Log.e(TAG, "❌ ERRO CRÍTICO no receiver: ${e.message}", e)
                e.printStackTrace()
            } finally {
                releaseWakeLock(wakeLock)
                pendingResult.finish()
            }
        }.start()
    }

    /**
     * 🆕 FUNÇÃO CRÍTICA: Busca o ID BASE do medicamento
     */
    private fun getMedicamentoIdBase(context: Context, alarmId: Int): Int {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val mappingJson = prefs.getString(KEY_MAPPING, "{}")
            
            if (mappingJson.isNullOrEmpty() || mappingJson == "{}") {
                Log.w(TAG, "⚠️ Nenhum mapeamento encontrado")
                return if (alarmId >= 100000) {
                    (alarmId / 100000)
                } else {
                    alarmId
                }
            }
            
            val mapping = org.json.JSONObject(mappingJson)
            
            if (mapping.has(alarmId.toString())) {
                val baseId = mapping.getInt(alarmId.toString())
                Log.d(TAG, "🔍 Mapeamento encontrado: Alarme $alarmId → Medicamento BASE $baseId")
                return baseId
            }
            
            Log.w(TAG, "⚠️ ID $alarmId não encontrado no mapeamento")
            return if (alarmId >= 100000) {
                val calculado = (alarmId / 100000)
                Log.d(TAG, "🔢 ID BASE calculado: $calculado (de $alarmId)")
                calculado
            } else {
                Log.w(TAG, "⚠️ Usando $alarmId como ID base")
                alarmId
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao buscar mapeamento: ${e.message}", e)
            return if (alarmId >= 100000) (alarmId / 100000) else alarmId
        }
    }

    /**
     * 🔋 Adquire Wake Lock temporário
     */
    private fun acquireWakeLock(context: Context): PowerManager.WakeLock? {
        return try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DoseCerta::AlarmReceiverWakeLock"
            )
            wakeLock.acquire(3 * 60 * 1000L)
            Log.d(TAG, "🔋 Wake Lock adquirido (3 min)")
            wakeLock
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao adquirir Wake Lock: ${e.message}", e)
            null
        }
    }

    /**
     * 🔓 Libera Wake Lock
     */
    private fun releaseWakeLock(wakeLock: PowerManager.WakeLock?) {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "🔓 Wake Lock liberado")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao liberar Wake Lock: ${e.message}", e)
        }
    }
}