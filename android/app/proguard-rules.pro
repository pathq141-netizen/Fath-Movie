# Proguard rules for FathMovie Native (R8 Full Shrinking & Obfuscation)

# Preserve all JSON models and reflection
-keep class com.fathmovie.app.data.** { *; }
-keepclassmembers class com.fathmovie.app.data.** { *; }

# Preserve Activities and View Holders
-keep class com.fathmovie.app.ui.** { *; }
-keep class com.fathmovie.app.ui.adapter.** { *; }
-keep class com.fathmovie.app.player.** { *; }

# Glide Image Loading
-keep class com.github.bumptech.glide.** { *; }
-dontwarn com.github.bumptech.glide.**
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep public class * extends com.bumptech.glide.module.AppGlideModule

# Media3 / ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Annotations and generic signatures
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
