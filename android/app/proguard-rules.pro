# ==========================================
# 🔒 PROGUARD RULES - DOSECERTA
# Configuração segura para React Native + Hermes
# Garante que o app funcione mesmo com minificação ativa
# ==========================================

# Mantém todas as classes do React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.modules.** { *; }

# Mantém métodos ReactMethod e propriedades de bridge
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Mantém classes Hermes
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.hermes.**

# Mantém o pacote principal do app (importante!)
-keep class com.dosecerta.** { *; }

# Evita remover atributos e anotações importantes
-keepattributes *Annotation*

# Evita warnings de dependências comuns
-dontwarn androidx.**
-dontwarn com.google.android.material.**
-dontwarn com.facebook.react.**
-dontwarn kotlin.**
-dontwarn com.facebook.hermes.**

# Evita warnings de classes usadas por reflexão
-keep class * extends java.util.ListResourceBundle {
    protected Object[][] getContents();
}

# =======================================================
# 🆕 REGRA PARA CORRIGIR O ERRO DE AD ID / FIREBASE R8
# Ignora referências ao AdvertisingIdClient (AD ID).
# Isso impede que o R8 falhe, permitindo que o Firebase Analytics compile
# sem o módulo 'play-services-ads-identifier', que não é usado.
# =======================================================
-dontwarn com.google.android.gms.ads.identifier.**

# ==========================================
# FIM DO ARQUIVO
# ==========================================