package com.dosecerta

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MODULE_NAME = "AlarmModule"
        private const val TAG = "AlarmModule"
        private const val PENDING_INTENT_NOVIDADES_ID = 200000
        private const val PREFS_GLOBAL = "alarm_preferences" // 🆕 Nome consistente
        private var moduleInstance: AlarmModule? = null

        fun sendDoseConfirmada(medicamentoId: Int, horario: String) {
            moduleInstance?.let { module ->
                val params = Arguments.createMap().apply {
                    putInt("medicamentoId", medicamentoId)
                    putString("horario", horario)
                }

                module.reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onDoseConfirmada", params)
            }
        }

        fun scheduleSnooze(
            context: Context,
            medicamentoId: Int,
            medicamento: String,
            paciente: String,
            dosagem: String,
            horario: String,
            frequencia: String,
            dataInicio: String,
            duracao: String,
            notas: String,
            som: Boolean,
            tipoSom: String,
            vibracao: Boolean,
            notificacaoVisual: Boolean
        ) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("medicamentoId", medicamentoId)
                putExtra("medicamento", medicamento)
                putExtra("paciente", paciente)
                putExtra("dosagem", dosagem)
                putExtra("horario", horario)
                putExtra("frequencia", frequencia)
                putExtra("dataInicio", dataInicio)
                putExtra("duracao", duracao)
                putExtra("notas", notas)
                putExtra("som", som)
                putExtra("tipoSom", tipoSom)
                putExtra("vibracao", vibracao)
                putExtra("notificacaoVisual", notificacaoVisual)
            }

            val requestCode = medicamentoId + 10000
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val snoozeTime = System.currentTimeMillis() + (5 * 60 * 1000)

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            snoozeTime,
                            pendingIntent
                        )
                        Log.d(TAG, "✅ Snooze agendado com sucesso para daqui a 5 minutos")
                    } else {
                        Log.w(TAG, "⚠️ Permissão SCHEDULE_EXACT_ALARM negada")
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        snoozeTime,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Snooze agendado (Android < 12)")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Erro ao agendar snooze: ${e.message}", e)
            }
        }
    }

    init {
        moduleInstance = this
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            var canSchedule = true
            var canPostNotifications = true
            var canDrawOverlays = true
            var isBatteryOptimizationDisabled = false
            var canUseFullScreenIntent = true

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                canSchedule = alarmManager.canScheduleExactAlarms()
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                canPostNotifications = reactApplicationContext.checkSelfPermission(
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                canDrawOverlays = Settings.canDrawOverlays(reactApplicationContext)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                isBatteryOptimizationDisabled = pm.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                canUseFullScreenIntent = notificationManager.canUseFullScreenIntent()
                Log.d(TAG, "🔔 Full-Screen Intent permitido: $canUseFullScreenIntent")
            }

            val result = Arguments.createMap().apply {
                putBoolean("canScheduleExactAlarms", canSchedule)
                putBoolean("canPostNotifications", canPostNotifications)
                putBoolean("canDrawOverlays", canDrawOverlays)
                putBoolean("isBatteryOptimizationDisabled", isBatteryOptimizationDisabled)
                putBoolean("canUseFullScreenIntent", canUseFullScreenIntent)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao verificar permissões: ${e.message}", e)
            promise.reject("ERROR", "Erro ao verificar permissões: ${e.message}")
        }
    }

    @ReactMethod
    fun openAlarmSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao abrir configurações de alarme: ${e.message}", e)
            promise.reject("ERROR", "Erro ao abrir configurações: ${e.message}")
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                )
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao solicitar permissão de overlay: ${e.message}", e)
            promise.reject("ERROR", "Erro ao solicitar permissão: ${e.message}")
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                intent.data = Uri.parse("package:${reactApplicationContext.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao solicitar exclusão de otimização de bateria: ${e.message}", e)
            promise.reject("ERROR", "Erro ao solicitar exclusão: ${e.message}")
        }
    }

    @ReactMethod
    fun requestFullScreenIntentPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
                intent.data = Uri.parse("package:${reactApplicationContext.packageName}")
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                Log.d(TAG, "🔔 Abrindo configurações de Full-Screen Intent")
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao solicitar permissão de Full-Screen Intent: ${e.message}", e)
            promise.reject("ERROR", "Erro ao solicitar permissão: ${e.message}")
        }
    }

    @ReactMethod
    fun scheduleAlarm(
        medicamentoId: Int,
        medicamento: String,
        paciente: String,
        dosagem: String,
        horario: String,
        frequencia: String,
        dataInicio: String,
        duracao: String,
        notas: String,
        timestamp: Double,
        som: Boolean,
        tipoSom: String,
        vibracao: Boolean,
        notificacaoVisual: Boolean,
        promise: Promise
    ) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(reactApplicationContext, AlarmReceiver::class.java).apply {
                putExtra("medicamentoId", medicamentoId)
                putExtra("medicamento", medicamento)
                putExtra("paciente", paciente)
                putExtra("dosagem", dosagem)
                putExtra("horario", horario)
                putExtra("frequencia", frequencia)
                putExtra("dataInicio", dataInicio)
                putExtra("duracao", duracao)
                putExtra("notas", notas)
                putExtra("som", som)
                putExtra("tipoSom", tipoSom)
                putExtra("vibracao", vibracao)
                putExtra("notificacaoVisual", notificacaoVisual)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                medicamentoId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerTime = timestamp.toLong()

            if (triggerTime <= System.currentTimeMillis()) {
                promise.reject("ERROR", "Horário do alarme deve ser no futuro")
                return
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerTime,
                            pendingIntent
                        )
                        Log.d(TAG, "✅ Alarme exato agendado: ID=$medicamentoId")
                        promise.resolve(true)
                    } else {
                        Log.w(TAG, "⚠️ Usando setAndAllowWhileIdle (sem exatidão)")
                        alarmManager.setAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            triggerTime,
                            pendingIntent
                        )
                        promise.resolve(true)
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    )
                    Log.d(TAG, "✅ Alarme agendado (Android < 12): ID=$medicamentoId")
                    promise.resolve(true)
                }
            } catch (e: SecurityException) {
                Log.e(TAG, "❌ SecurityException ao agendar: ${e.message}", e)
                promise.reject("PERMISSION_DENIED", "Permissão SCHEDULE_EXACT_ALARM negada")
            }

        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao agendar alarme: ${e.message}", e)
            promise.reject("ERROR", "Erro ao agendar alarme: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelAlarm(medicamentoId: Int, promise: Promise) {
        try {
            Log.d(TAG, "🗑️ ========== CANCELANDO TODOS OS ALARMES DO MEDICAMENTO $medicamentoId ==========")
            
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val key = "alarm_ids_$medicamentoId"
            val storedIdsJson = reactApplicationContext
                .getSharedPreferences("alarm_storage", Context.MODE_PRIVATE)
                .getString(key, null)
            
            var cancelados = 0
            
            if (storedIdsJson != null) {
                try {
                    val storedIds = JSONArray(storedIdsJson)
                    Log.d(TAG, "📋 Encontrados ${storedIds.length()} alarmes para cancelar")
                    
                    for (i in 0 until storedIds.length()) {
                        val alarmId = storedIds.getInt(i)
                        
                        val intent = Intent(reactApplicationContext, AlarmReceiver::class.java)
                        val pendingIntent = PendingIntent.getBroadcast(
                            reactApplicationContext,
                            alarmId,
                            intent,
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        
                        alarmManager.cancel(pendingIntent)
                        pendingIntent.cancel()
                        cancelados++
                        
                        Log.d(TAG, "✅ Alarme $alarmId cancelado")
                    }
                    
                    reactApplicationContext
                        .getSharedPreferences("alarm_storage", Context.MODE_PRIVATE)
                        .edit()
                        .remove(key)
                        .commit()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "❌ Erro ao processar IDs: ${e.message}", e)
                }
            } else {
                Log.d(TAG, "ℹ️ Nenhum ID armazenado, cancelando pelo ID base")
            }
            
            val intent = Intent(reactApplicationContext, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                medicamentoId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()

            // ✅ CANCELAMENTO POR FORÇA BRUTA
            // Os alarmes reais são agendados com IDs derivados: (medicamentoId * 100000) + índice
            // Ex: medicamento 3 → alarmes 300000, 300001, 300002...
            // Isso garante o cancelamento mesmo que o AsyncStorage tenha perdido o rastro dos IDs
            Log.d(TAG, "🔨 Iniciando cancelamento por força bruta (IDs derivados)...")
            var canceladosBruta = 0
            val baseId = medicamentoId * 100000
            for (i in 0 until 1000) {
                val derivedId = baseId + i
                try {
                    val bruteIntent = Intent(reactApplicationContext, AlarmReceiver::class.java)
                    val brutePendingIntent = PendingIntent.getBroadcast(
                        reactApplicationContext,
                        derivedId,
                        bruteIntent,
                        PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                    )
                    if (brutePendingIntent != null) {
                        alarmManager.cancel(brutePendingIntent)
                        brutePendingIntent.cancel()
                        canceladosBruta++
                        Log.d(TAG, "✅ Alarme derivado $derivedId cancelado")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "⚠️ Erro ao cancelar ID $derivedId: ${e.message}")
                }
            }
            
            // Também cancela o ID de snooze (medicamentoId + 10000)
            try {
                val snoozeIntent = Intent(reactApplicationContext, AlarmReceiver::class.java)
                val snoozePendingIntent = PendingIntent.getBroadcast(
                    reactApplicationContext,
                    medicamentoId + 10000,
                    snoozeIntent,
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                )
                if (snoozePendingIntent != null) {
                    alarmManager.cancel(snoozePendingIntent)
                    snoozePendingIntent.cancel()
                    Log.d(TAG, "✅ Alarme de snooze cancelado (ID: ${medicamentoId + 10000})")
                }
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Erro ao cancelar snooze: ${e.message}")
            }

            // Limpa mapeamento de IDs do SharedPreferences
            try {
                val mappingPrefs = reactApplicationContext
                    .getSharedPreferences("alarm_id_mapping", Context.MODE_PRIVATE)
                val mappingJson = mappingPrefs.getString("id_mapping", null)
                if (mappingJson != null) {
                    val mapping = org.json.JSONObject(mappingJson)
                    val keysToRemove = mutableListOf<String>()
                    val keys = mapping.keys()
                    while (keys.hasNext()) {
                        val k = keys.next()
                        if (mapping.optInt(k, -1) == medicamentoId) {
                            keysToRemove.add(k)
                        }
                    }
                    keysToRemove.forEach { mapping.remove(it) }
                    mappingPrefs.edit().putString("id_mapping", mapping.toString()).commit()
                    Log.d(TAG, "🧹 Mapeamento limpo: ${keysToRemove.size} entradas removidas")
                }
            } catch (e: Exception) {
                Log.w(TAG, "⚠️ Erro ao limpar mapeamento: ${e.message}")
            }

            Log.d(TAG, "🎉 ========== TOTAL: $cancelados alarmes (lista) + $canceladosBruta (força bruta) cancelados ==========")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao cancelar alarme: ${e.message}", e)
            promise.reject("ERROR", "Erro ao cancelar alarme: ${e.message}")
        }
    }

    // ========================================
    // 🆕 ATUALIZAR PREFERÊNCIAS GLOBAIS (INCLUINDO VOLUME)
    // ========================================
    @ReactMethod
    fun updateGlobalPreferences(preferences: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs = context.getSharedPreferences(PREFS_GLOBAL, Context.MODE_PRIVATE)
            val editor = prefs.edit()
            
            // 🔥 Salva som, vibração, visual e tipo de som
            if (preferences.hasKey("som")) {
                editor.putBoolean("som", preferences.getBoolean("som"))
                Log.d(TAG, "🔧 Pref nativa som = ${preferences.getBoolean("som")}")
            }
            
            if (preferences.hasKey("vibracao")) {
                editor.putBoolean("vibracao", preferences.getBoolean("vibracao"))
                Log.d(TAG, "🔧 Pref nativa vibracao = ${preferences.getBoolean("vibracao")}")
            }
            
            if (preferences.hasKey("notificacaoVisual")) {
                editor.putBoolean("notificacaoVisual", preferences.getBoolean("notificacaoVisual"))
                Log.d(TAG, "🔧 Pref nativa notificacaoVisual = ${preferences.getBoolean("notificacaoVisual")}")
            }
            
            if (preferences.hasKey("tipoSom")) {
                val tipoSom = preferences.getString("tipoSom") ?: "1"
                editor.putString("tipoSom", tipoSom)
                Log.d(TAG, "🔧 Pref nativa tipoSom = $tipoSom")
            }
            
            // 🆕 SALVA VOLUME DO ALARME
            if (preferences.hasKey("volumeAlarme")) {
                val volume = preferences.getInt("volumeAlarme")
                editor.putInt("volumeAlarme", volume)
                Log.d(TAG, "🔧 Pref nativa volumeAlarme = $volume%")
            }
            
            editor.apply()
            Log.d(TAG, "✅ Preferências globais salvas no SharedPreferences nativo")
            
            // 🆕 Envia broadcast para reagendar alarmes
            val reagendarIntent = Intent("com.dosecerta.REAGENDAR_ALARMES")
            context.sendBroadcast(reagendarIntent)
            Log.d(TAG, "📣 Broadcast REAGENDAR_ALARMES enviado pelo nativo")
            
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao atualizar preferências globais: ${e.message}", e)
            promise.reject("ERROR", "Erro ao atualizar preferências: ${e.message}")
        }
    }

    /**
     * 🗺️ Salva mapeamento entre Alarme ID → Medicamento ID BASE
     */
    @ReactMethod
    fun saveMedicamentoIdMapping(alarmId: Int, medicamentoIdBase: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("alarm_id_mapping", Context.MODE_PRIVATE)
            val currentMapping = prefs.getString("id_mapping", "{}") ?: "{}"
            
            val mapping = JSONObject(currentMapping)
            mapping.put(alarmId.toString(), medicamentoIdBase)
            
            prefs.edit()
                .putString("id_mapping", mapping.toString())
                .apply()
            
            Log.d(TAG, "🗺️ Mapeamento salvo: Alarme $alarmId → Med BASE $medicamentoIdBase")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao salvar mapeamento: ${e.message}", e)
            promise.reject("ERROR", "Erro ao salvar mapeamento: ${e.message}")
        }
    }

    /**
     * 🔇 Marca medicamento como silenciado no SharedPreferences
     */
    @ReactMethod
    fun silenceMedication(medicamentoId: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("silenced_medications", Context.MODE_PRIVATE)
            val currentIds = prefs.getStringSet("ids", mutableSetOf()) ?: mutableSetOf()
            
            val updatedIds = currentIds.toMutableSet()
            updatedIds.add(medicamentoId.toString())
            
            prefs.edit()
                .putStringSet("ids", updatedIds)
                .apply()
            
            Log.d(TAG, "🔇 Medicamento $medicamentoId marcado como SILENCIADO")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao silenciar medicamento: ${e.message}", e)
            promise.reject("ERROR", "Erro ao silenciar: ${e.message}")
        }
    }

    /**
     * 🔔 Remove medicamento da lista de silenciados
     */
    @ReactMethod
    fun unsilenceMedication(medicamentoId: Int, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("silenced_medications", Context.MODE_PRIVATE)
            val currentIds = prefs.getStringSet("ids", mutableSetOf()) ?: mutableSetOf()
            
            val updatedIds = currentIds.toMutableSet()
            updatedIds.remove(medicamentoId.toString())
            
            prefs.edit()
                .putStringSet("ids", updatedIds)
                .apply()
            
            Log.d(TAG, "🔔 Medicamento $medicamentoId removido dos silenciados")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao reativar medicamento: ${e.message}", e)
            promise.reject("ERROR", "Erro ao reativar: ${e.message}")
        }
    }

    // ========================================
    // 🔕 CONTROLE DE SOM POR MEDICAMENTO
    // Desativa só o áudio — alarme continua disparando visualmente
    // SharedPrefs: "medicamentos_som_desativado" / key "som_desativado_ids"
    // ========================================

    @ReactMethod
    fun syncSomDesativado(ids: ReadableArray, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs   = context.getSharedPreferences("medicamentos_som_desativado", Context.MODE_PRIVATE)

            val stringSet = mutableSetOf<String>()
            for (i in 0 until ids.size()) {
                stringSet.add(ids.getInt(i).toString())
            }

            // commit() síncrono: garante que o AlarmReceiver lê o valor atualizado
            prefs.edit()
                .putStringSet("som_desativado_ids", stringSet)
                .commit()

            Log.d(TAG, "🔕 syncSomDesativado: ${stringSet.size} med(s) → $stringSet")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro em syncSomDesativado: ${e.message}", e)
            promise.reject("ERROR", "Erro ao sincronizar som: ${e.message}")
        }
    }

    // ========================================
    // 🔇 SINCRONIZAR MEDICAMENTOS SILENCIADOS (cancela alarme)
    // Chamado por alarmeService.ts: AlarmModule.syncSilencedMedications(lista)
    // ========================================

    @ReactMethod
    fun syncSilencedMedications(ids: ReadableArray, promise: Promise) {
        try {
            val context = reactApplicationContext
            SilencedMedicationsManager.reloadCache(context)

            val idList = mutableListOf<Int>()
            for (i in 0 until ids.size()) {
                idList.add(ids.getInt(i))
            }

            SilencedMedicationsManager.syncFromAsyncStorage(context, idList)
            Log.d(TAG, "🔇 syncSilencedMedications: ${idList.size} med(s) silenciados → $idList")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro em syncSilencedMedications: ${e.message}", e)
            promise.reject("ERROR", "Erro ao sincronizar silenciados: ${e.message}")
        }
    }

    // ========================================
    // 🔍 VERIFICAR SE MEDICAMENTO ESTÁ SILENCIADO (promise para RN)
    // ========================================

    @ReactMethod
    fun isMedicationSilenced(medicamentoId: Int, promise: Promise) {
        try {
            val result = SilencedMedicationsManager.isMedicationSilenced(
                reactApplicationContext, medicamentoId
            )
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro em isMedicationSilenced: ${e.message}", e)
            promise.reject("ERROR", "Erro ao verificar: ${e.message}")
        }
    }

    @ReactMethod
    fun scheduleNovidadesCheck(intervaloHoras: Int, promise: Promise) {
        try {
            Log.d(TAG, "🔔 ========== AGENDANDO CHECAGEM DE NOVIDADES ==========")
            Log.d(TAG, "⏰ Intervalo configurado: $intervaloHoras horas")
            
            val context = reactApplicationContext.applicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "com.dosecerta.CHECK_NOVIDADES"
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                PENDING_INTENT_NOVIDADES_ID,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val intervaloMs = intervaloHoras * 3600 * 1000L
            val primeiraChecagem = System.currentTimeMillis() + (60 * 1000L)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setInexactRepeating(
                    AlarmManager.RTC_WAKEUP, 
                    primeiraChecagem, 
                    intervaloMs, 
                    pendingIntent
                )
                Log.d(TAG, "✅ Checagem agendada (INEXACT REPEATING) para cada $intervaloHoras horas")
            } else {
                alarmManager.setRepeating(
                    AlarmManager.RTC_WAKEUP, 
                    primeiraChecagem, 
                    intervaloMs, 
                    pendingIntent
                )
                Log.d(TAG, "✅ Checagem agendada (REPEATING) para cada $intervaloHoras horas")
            }
            
            saveNovidadesCheckInterval(context, intervaloHoras)
            
            Log.d(TAG, "🎉 ========== CHECAGEM DE NOVIDADES CONFIGURADA ==========")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao agendar checagem de novidades: ${e.message}", e)
            e.printStackTrace()
            promise.reject("ERROR", "Erro ao agendar checagem: ${e.message}")
        }
    }

    @ReactMethod
    fun cancelNovidadesCheck(promise: Promise) {
        try {
            Log.d(TAG, "🗑️ Cancelando checagem de novidades...")
            
            val context = reactApplicationContext.applicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "com.dosecerta.CHECK_NOVIDADES"
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                PENDING_INTENT_NOVIDADES_ID,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            
            removeNovidadesCheckInterval(context)
            
            Log.d(TAG, "✅ Checagem de novidades cancelada")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao cancelar checagem: ${e.message}", e)
            promise.reject("ERROR", "Erro ao cancelar: ${e.message}")
        }
    }

    @ReactMethod
    fun isNovidadesCheckActive(promise: Promise) {
        try {
            val context = reactApplicationContext.applicationContext
            val interval = getNovidadesCheckInterval(context)
            
            val isActive = interval > 0
            
            Log.d(TAG, "🔍 Checagem de novidades ${if (isActive) "ATIVA" else "INATIVA"}")
            
            val result = Arguments.createMap().apply {
                putBoolean("isActive", isActive)
                putInt("intervaloHoras", interval)
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao verificar status: ${e.message}", e)
            promise.reject("ERROR", "Erro ao verificar: ${e.message}")
        }
    }

    // ========================================
    // 🔧 MÉTODOS AUXILIARES PRIVADOS
    // ========================================

    private fun saveNovidadesCheckInterval(context: Context, intervaloHoras: Int) {
        try {
            val prefs = context.getSharedPreferences("novidades_check_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putInt("intervalo_horas", intervaloHoras)
                .putLong("ultimo_agendamento", System.currentTimeMillis())
                .apply()
            
            Log.d(TAG, "💾 Intervalo salvo: $intervaloHoras horas")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao salvar intervalo: ${e.message}", e)
        }
    }

    private fun removeNovidadesCheckInterval(context: Context) {
        try {
            val prefs = context.getSharedPreferences("novidades_check_prefs", Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            
            Log.d(TAG, "🗑️ Preferências de checagem removidas")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao remover intervalo: ${e.message}", e)
        }
    }

    private fun getNovidadesCheckInterval(context: Context): Int {
        return try {
            val prefs = context.getSharedPreferences("novidades_check_prefs", Context.MODE_PRIVATE)
            prefs.getInt("intervalo_horas", 0)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao ler intervalo: ${e.message}", e)
            0
        }
    }

    /**
     * 🔄 Reagenda a checagem após boot (chamado pelo BootReceiver)
     */
    fun reagendarNovidadesCheckSeNecessario(context: Context) {
        try {
            val intervalo = getNovidadesCheckInterval(context)
            
            if (intervalo > 0) {
                Log.d(TAG, "🔄 Reagendando checagem de novidades: $intervalo horas")
                
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, AlarmReceiver::class.java).apply {
                    action = "com.dosecerta.CHECK_NOVIDADES"
                }
                
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    PENDING_INTENT_NOVIDADES_ID,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val intervaloMs = intervalo * 3600 * 1000L
                val primeiraChecagem = System.currentTimeMillis() + (60 * 1000L)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setInexactRepeating(
                        AlarmManager.RTC_WAKEUP, 
                        primeiraChecagem, 
                        intervaloMs, 
                        pendingIntent
                    )
                } else {
                    alarmManager.setRepeating(
                        AlarmManager.RTC_WAKEUP, 
                        primeiraChecagem, 
                        intervaloMs, 
                        pendingIntent
                    )
                }
                
                Log.d(TAG, "✅ Checagem reagendada com sucesso")
            } else {
                Log.d(TAG, "ℹ️ Nenhuma checagem configurada anteriormente")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao reagendar checagem: ${e.message}", e)
        }
    }
}