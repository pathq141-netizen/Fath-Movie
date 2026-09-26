package com.fathmovie.app.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.fathmovie.app.R

class SplashActivity : AppCompatActivity() {

    private lateinit var viewLensFlare: View
    private lateinit var viewCenterBeam: View
    private lateinit var layoutSplashLogo: View
    private lateinit var viewLogoShimmer: View
    private lateinit var tvSplashTagline: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        viewLensFlare = findViewById(R.id.viewLensFlare)
        viewCenterBeam = findViewById(R.id.viewCenterBeam)
        layoutSplashLogo = findViewById(R.id.layoutSplashLogo)
        viewLogoShimmer = findViewById(R.id.viewLogoShimmer)
        tvSplashTagline = findViewById(R.id.tvSplashTagline)

        startNetflixIntroAnimation()
    }

    private fun startNetflixIntroAnimation() {
        // Initial values
        layoutSplashLogo.scaleX = 0.82f
        layoutSplashLogo.scaleY = 0.82f
        layoutSplashLogo.alpha = 0f

        viewCenterBeam.scaleY = 0.05f
        viewCenterBeam.alpha = 0f

        viewLensFlare.scaleX = 0.3f
        viewLensFlare.scaleY = 0.3f
        viewLensFlare.alpha = 0f

        viewLogoShimmer.translationX = -350f
        viewLogoShimmer.alpha = 0f

        tvSplashTagline.alpha = 0f
        tvSplashTagline.translationY = 30f

        // Phase 1: Laser Beam and Flare burst (0 - 450ms)
        val beamAlpha = ObjectAnimator.ofFloat(viewCenterBeam, View.ALPHA, 0f, 1f, 0.4f).apply {
            duration = 450
            interpolator = DecelerateInterpolator()
        }
        val beamScaleY = ObjectAnimator.ofFloat(viewCenterBeam, View.SCALE_Y, 0.05f, 1.4f).apply {
            duration = 450
            interpolator = DecelerateInterpolator()
        }

        val flareAlpha = ObjectAnimator.ofFloat(viewLensFlare, View.ALPHA, 0f, 0.95f, 0.4f).apply {
            duration = 600
            interpolator = DecelerateInterpolator()
        }
        val flareScaleX = ObjectAnimator.ofFloat(viewLensFlare, View.SCALE_X, 0.3f, 1.5f).apply {
            duration = 600
            interpolator = DecelerateInterpolator()
        }
        val flareScaleY = ObjectAnimator.ofFloat(viewLensFlare, View.SCALE_Y, 0.3f, 1.3f).apply {
            duration = 600
            interpolator = DecelerateInterpolator()
        }

        val phase1 = AnimatorSet().apply {
            playTogether(beamAlpha, beamScaleY, flareAlpha, flareScaleX, flareScaleY)
        }

        // Phase 2: Logo Reveal & Majestic Zoom (250ms - 1300ms)
        val logoAlpha = ObjectAnimator.ofFloat(layoutSplashLogo, View.ALPHA, 0f, 1f).apply {
            duration = 500
            startDelay = 220
        }
        val logoScaleX = ObjectAnimator.ofFloat(layoutSplashLogo, View.SCALE_X, 0.82f, 1.06f).apply {
            duration = 1100
            startDelay = 220
            interpolator = DecelerateInterpolator(1.6f)
        }
        val logoScaleY = ObjectAnimator.ofFloat(layoutSplashLogo, View.SCALE_Y, 0.82f, 1.06f).apply {
            duration = 1100
            startDelay = 220
            interpolator = DecelerateInterpolator(1.6f)
        }

        // Phase 3: Shimmer Light Sweep (650ms - 1200ms)
        val shimmerAlpha = ObjectAnimator.ofFloat(viewLogoShimmer, View.ALPHA, 0f, 0.85f, 0f).apply {
            duration = 550
            startDelay = 600
        }
        val shimmerTransX = ObjectAnimator.ofFloat(viewLogoShimmer, View.TRANSLATION_X, -300f, 350f).apply {
            duration = 650
            startDelay = 600
            interpolator = AccelerateDecelerateInterpolator()
        }

        // Phase 4: Tagline Float In (850ms - 1400ms)
        val taglineAlpha = ObjectAnimator.ofFloat(tvSplashTagline, View.ALPHA, 0f, 1f).apply {
            duration = 500
            startDelay = 800
        }
        val taglineTransY = ObjectAnimator.ofFloat(tvSplashTagline, View.TRANSLATION_Y, 30f, 0f).apply {
            duration = 500
            startDelay = 800
            interpolator = DecelerateInterpolator()
        }

        val masterIntro = AnimatorSet().apply {
            playTogether(
                phase1,
                logoAlpha, logoScaleX, logoScaleY,
                shimmerAlpha, shimmerTransX,
                taglineAlpha, taglineTransY
            )
        }

        // Tactile Haptic Kick
        Handler(Looper.getMainLooper()).postDelayed({
            triggerNetflixHaptic()
        }, 320)

        // Outro Transition: Scale into screen and launch MainActivity
        masterIntro.addListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator) {
                Handler(Looper.getMainLooper()).postDelayed({
                    animateExitAndProceed()
                }, 200)
            }
        })

        masterIntro.start()
    }

    private fun triggerNetflixHaptic() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                )
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createOneShot(35, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(35)
                }
            }
        } catch (_: Exception) {}
    }

    private fun animateExitAndProceed() {
        val zoomOutLogoX = ObjectAnimator.ofFloat(layoutSplashLogo, View.SCALE_X, 1.06f, 1.42f).apply {
            duration = 320
            interpolator = AccelerateDecelerateInterpolator()
        }
        val zoomOutLogoY = ObjectAnimator.ofFloat(layoutSplashLogo, View.SCALE_Y, 1.06f, 1.42f).apply {
            duration = 320
            interpolator = AccelerateDecelerateInterpolator()
        }
        val fadeLogo = ObjectAnimator.ofFloat(layoutSplashLogo, View.ALPHA, 1f, 0f).apply {
            duration = 260
        }
        val fadeTagline = ObjectAnimator.ofFloat(tvSplashTagline, View.ALPHA, 1f, 0f).apply {
            duration = 200
        }
        val fadeFlare = ObjectAnimator.ofFloat(viewLensFlare, View.ALPHA, viewLensFlare.alpha, 0f).apply {
            duration = 260
        }

        val exitSet = AnimatorSet().apply {
            playTogether(zoomOutLogoX, zoomOutLogoY, fadeLogo, fadeTagline, fadeFlare)
        }

        exitSet.addListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator) {
                launchMainActivity()
            }
        })

        exitSet.start()
    }

    private fun launchMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        finish()
    }
}
