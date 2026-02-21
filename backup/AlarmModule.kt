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

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MODULE_NAME = "AlarmModule"
        private const val TAG = "AlarmModule"
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
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            val intent = Intent(reactApplicationContext, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                medicamentoId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            alarmManager.cancel(pendingIntent)
            Log.d(TAG, "✅ Alarme cancelado: ID=$medicamentoId")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Erro ao cancelar alarme: ${e.message}", e)
            promise.reject("ERROR", "Erro ao cancelar alarme: ${e.message}")
        }
    }
}