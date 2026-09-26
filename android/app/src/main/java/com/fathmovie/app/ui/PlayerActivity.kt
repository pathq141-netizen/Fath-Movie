package com.fathmovie.app.ui

import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.widget.NestedScrollView
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.fathmovie.app.R
import com.fathmovie.app.data.MovieBoxApi
import com.fathmovie.app.data.StreamData
import com.fathmovie.app.data.SubtitleItem
import com.fathmovie.app.data.VideoStream
import com.fathmovie.app.player.MoviePlayerManager
import com.fathmovie.app.data.OfflineDownloadManager
import com.fathmovie.app.ui.adapter.EpisodeAdapter
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

@UnstableApi
class PlayerActivity : AppCompatActivity() {

    private lateinit var playerRootLayout: RelativeLayout
    private lateinit var playerTopBar: LinearLayout
    private lateinit var btnPlayerBack: View
    private lateinit var tvPlayerTitle: TextView
    private lateinit var tvPlayerSubtitle: TextView
    private lateinit var btnPlayerDownload: ImageView
    private lateinit var btnPlayerPip: ImageView
    private lateinit var btnPlayerWatchlist: View
    private lateinit var ivWatchlistIcon: ImageView
    private lateinit var tvWatchlistText: TextView

    private lateinit var playerCardContainer: CardView
    private lateinit var playerView: PlayerView
    private lateinit var playerProgressBar: ProgressBar
    private lateinit var playerScrollView: NestedScrollView

    // Fullscreen Landscape Controls
    private lateinit var layoutFullscreenHeader: LinearLayout
    private lateinit var btnCloseFullscreen: View
    private lateinit var tvFsTitle: TextView
    private lateinit var btnFsResize: ImageView
    private lateinit var btnFsPip: ImageView
    private var isFullscreenLandscape: Boolean = false

    // Quick controls (Portrait)
    private lateinit var layoutPlayerQuickControls: LinearLayout
    private lateinit var btnFullscreenLandscape: View
    private lateinit var btnPlayerResize: View
    private lateinit var tvResizeLabel: TextView

    private lateinit var layoutEpisodeNav: LinearLayout
    private lateinit var btnPrevEp: View
    private lateinit var btnNextEp: View
    private lateinit var tvEpisodeIndicator: TextView

    private lateinit var cardStreamSettings: LinearLayout
    private lateinit var qualityContainer: LinearLayout
    private lateinit var subtitleContainer: LinearLayout
    private lateinit var speedContainer: LinearLayout

    private lateinit var cardEpisodeGrid: LinearLayout
    private lateinit var tvEpisodeGridTitle: TextView
    private lateinit var tvEpisodeGridSub: TextView
    private lateinit var scrollPlayerEpisodeRanges: View
    private lateinit var layoutPlayerEpisodeRanges: LinearLayout
    private lateinit var rvEpisodesGrid: RecyclerView
    private var episodeAdapter: EpisodeAdapter? = null
    private var episodeChunks: List<List<Int>> = emptyList()
    private var activeChunkIndex: Int = 0

    private var streamJob: kotlinx.coroutines.Job? = null
    private var lastClickTime: Long = 0L

    private fun canClick(): Boolean {
        val now = System.currentTimeMillis()
        if (now - lastClickTime < 800L) return false
        lastClickTime = now
        return true
    }

    private var exoPlayer: ExoPlayer? = null
    private var streamData: StreamData? = null
    private var currentQuality: String = ""
    private var currentSubtitleUrl: String? = null
    private var currentSpeed: Float = 1.0f
    private var currentResizeMode: Int = AspectRatioFrameLayout.RESIZE_MODE_FIT

    private var currentSeason: Int = 1
    private var currentEpisode: Int = 1
    private var isEpisodic: Boolean = false
    private var episodesList: ArrayList<Int> = arrayListOf()

    private val detailPath: String by lazy { intent.getStringExtra("EXTRA_DETAIL_PATH") ?: "" }
    private val subjectId: String by lazy { intent.getStringExtra("EXTRA_SUBJECT_ID") ?: "" }
    private val movieTitle: String by lazy { intent.getStringExtra("EXTRA_TITLE") ?: "The Fix" }
    private val typeLabel: String by lazy { intent.getStringExtra("EXTRA_TYPE_LABEL") ?: "Movie" }
    private val isOffline: Boolean by lazy { intent.getBooleanExtra("EXTRA_IS_OFFLINE", false) }
    private val offlineFilePath: String by lazy { intent.getStringExtra("EXTRA_FILE_PATH") ?: "" }
    private val isShortDrama: Boolean by lazy {
        intent.getBooleanExtra("EXTRA_IS_SHORT_DRAMA", false) ||
        intent.getIntExtra("EXTRA_SUBJECT_TYPE", 0) == 7 ||
        typeLabel.contains("Drama", ignoreCase = true) ||
        typeLabel.contains("Short", ignoreCase = true)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on during playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContentView(R.layout.activity_player)

        currentSeason = intent.getIntExtra("EXTRA_SEASON", 1)
        currentEpisode = intent.getIntExtra("EXTRA_EPISODE", 1)
        isEpisodic = intent.getBooleanExtra("EXTRA_IS_EPISODIC", false) || currentEpisode > 0
        episodesList = intent.getIntegerArrayListExtra("EXTRA_EPISODES_LIST") ?: arrayListOf()

        initViews()
        initPlayer()

        if (isOffline) {
            initOfflinePlayback()
        } else {
            setupSpeedControls()
            setupWatchlistState()
            loadStreamData()
        }
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics
        ).toInt()
    }

    private fun initViews() {
        playerRootLayout = findViewById(R.id.playerRootLayout)
        playerTopBar = findViewById(R.id.playerTopBar)
        btnPlayerBack = findViewById(R.id.btnPlayerBack)
        tvPlayerTitle = findViewById(R.id.tvPlayerTitle)
        tvPlayerSubtitle = findViewById(R.id.tvPlayerSubtitle)
        btnPlayerDownload = findViewById(R.id.btnPlayerDownload)
        btnPlayerPip = findViewById(R.id.btnPlayerPip)
        btnPlayerWatchlist = findViewById(R.id.btnPlayerWatchlist)
        ivWatchlistIcon = findViewById(R.id.ivWatchlistIcon)
        tvWatchlistText = findViewById(R.id.tvWatchlistText)

        playerCardContainer = findViewById(R.id.playerCardContainer)
        playerView = findViewById(R.id.playerView)
        playerProgressBar = findViewById(R.id.playerProgressBar)
        playerScrollView = findViewById(R.id.playerScrollView)

        // Fullscreen Landscape Views
        layoutFullscreenHeader = findViewById(R.id.layoutFullscreenHeader)
        btnCloseFullscreen = findViewById(R.id.btnCloseFullscreen)
        tvFsTitle = findViewById(R.id.tvFsTitle)
        btnFsResize = findViewById(R.id.btnFsResize)
        btnFsPip = findViewById(R.id.btnFsPip)
        tvFsTitle.text = movieTitle

        // Quick Controls
        layoutPlayerQuickControls = findViewById(R.id.layoutPlayerQuickControls)
        btnFullscreenLandscape = findViewById(R.id.btnFullscreenLandscape)
        btnPlayerResize = findViewById(R.id.btnPlayerResize)
        tvResizeLabel = findViewById(R.id.tvResizeLabel)

        layoutEpisodeNav = findViewById(R.id.layoutEpisodeNav)
        btnPrevEp = findViewById(R.id.btnPrevEp)
        btnNextEp = findViewById(R.id.btnNextEp)
        tvEpisodeIndicator = findViewById(R.id.tvEpisodeIndicator)

        cardStreamSettings = findViewById(R.id.cardStreamSettings)
        qualityContainer = findViewById(R.id.qualityContainer)
        subtitleContainer = findViewById(R.id.subtitleContainer)
        speedContainer = findViewById(R.id.speedContainer)

        cardEpisodeGrid = findViewById(R.id.cardEpisodeGrid)
        tvEpisodeGridTitle = findViewById(R.id.tvEpisodeGridTitle)
        tvEpisodeGridSub = findViewById(R.id.tvEpisodeGridSub)
        scrollPlayerEpisodeRanges = findViewById(R.id.scrollPlayerEpisodeRanges)
        layoutPlayerEpisodeRanges = findViewById(R.id.layoutPlayerEpisodeRanges)
        rvEpisodesGrid = findViewById(R.id.rvEpisodesGrid)

        updateTitleInfo()

        btnPlayerBack.setOnClickListener {
            finish()
        }

        btnPlayerDownload.setOnClickListener {
            if (canClick()) showDownloadDialog()
        }

        btnPlayerPip.setOnClickListener {
            if (canClick()) enterPictureInPicture()
        }

        btnPlayerResize.setOnClickListener {
            if (canClick()) cycleResizeMode()
        }

        // Tonton Fullscreen Landscape Click
        btnFullscreenLandscape.setOnClickListener {
            if (canClick()) enterFullscreenLandscape()
        }

        // Tutup Fullscreen Landscape Click
        btnCloseFullscreen.setOnClickListener {
            if (canClick()) exitFullscreenLandscape()
        }

        btnFsResize.setOnClickListener {
            if (canClick()) cycleResizeMode()
        }

        btnFsPip.setOnClickListener {
            if (canClick()) enterPictureInPicture()
        }

        btnPrevEp.setOnClickListener {
            if (!canClick()) return@setOnClickListener
            if (currentEpisode > 1) {
                currentEpisode--
                updateTitleInfo()
                syncActiveEpisodeToGrid(currentEpisode)
                loadStreamData()
            }
        }

        btnNextEp.setOnClickListener {
            if (!canClick()) return@setOnClickListener
            currentEpisode++
            updateTitleInfo()
            syncActiveEpisodeToGrid(currentEpisode)
            loadStreamData()
        }

        setupEpisodesGrid()
        applyOrientationLayout(resources.configuration.orientation)
    }

    private fun initOfflinePlayback() {
        tvPlayerTitle.text = movieTitle
        tvPlayerSubtitle.text = "Tontonan Offline • FathMovie"
        btnPlayerDownload.visibility = View.GONE
        btnPlayerWatchlist.visibility = View.GONE
        cardStreamSettings.visibility = View.GONE
        cardEpisodeGrid.visibility = View.GONE
        layoutEpisodeNav.visibility = View.GONE
        playerProgressBar.visibility = View.GONE

        if (offlineFilePath.isNotEmpty()) {
            MoviePlayerManager.playLocalVideo(exoPlayer ?: return, offlineFilePath)
        } else {
            Toast.makeText(this, "Berkas video offline tidak ditemukan", Toast.LENGTH_LONG).show()
        }
    }

    private fun showDownloadDialog() {
        val streams = streamData?.streams
        if (streams.isNullOrEmpty()) {
            Toast.makeText(this, "Video belum siap untuk diunduh", Toast.LENGTH_SHORT).show()
            return
        }

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_download_options, null)
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setView(dialogView)
            .create()

        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val rgQuality = dialogView.findViewById<android.widget.RadioGroup>(R.id.rgDownloadQuality)
        val rbMovies = dialogView.findViewById<android.widget.RadioButton>(R.id.rbFolderMovies)
        val rbDownload = dialogView.findViewById<android.widget.RadioButton>(R.id.rbFolderDownload)
        val btnCancel = dialogView.findViewById<View>(R.id.btnDialogCancel)
        val btnStart = dialogView.findViewById<View>(R.id.btnDialogStartDownload)

        // Set current preferred storage
        val currentStorage = OfflineDownloadManager.getPreferredStorageFolder(this)
        if (currentStorage.contains("Download", ignoreCase = true)) {
            rbDownload.isChecked = true
        } else {
            rbMovies.isChecked = true
        }

        // Add quality radio buttons
        for (i in streams.indices) {
            val s = streams[i]
            val rb = android.widget.RadioButton(this).apply {
                id = View.generateViewId()
                val sz = if (s.sizeFormatted.isNotEmpty()) " (${s.sizeFormatted})" else ""
                text = "${s.quality}$sz"
                setTextColor(Color.WHITE)
                buttonTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#E50914"))
                setPadding(dpToPx(6f), dpToPx(4f), dpToPx(6f), dpToPx(4f))
            }
            rgQuality.addView(rb)
            if (s.quality == currentQuality || (i == 0 && rgQuality.checkedRadioButtonId == -1)) {
                rb.isChecked = true
            }
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        btnStart.setOnClickListener {
            val checkedRadioId = rgQuality.checkedRadioButtonId
            val selectedIndex = rgQuality.indexOfChild(dialogView.findViewById(checkedRadioId))
            val selectedStream = if (selectedIndex in streams.indices) streams[selectedIndex] else streams.first()

            val chosenPath = if (rbDownload.isChecked) {
                OfflineDownloadManager.PATH_DOWNLOAD
            } else {
                OfflineDownloadManager.PATH_MOVIES
            }

            OfflineDownloadManager.setPreferredStorageFolder(this, chosenPath)

            if (!OfflineDownloadManager.hasStoragePermission(this)) {
                OfflineDownloadManager.requestStoragePermission(this)
            }

            val titleWithEp = if (isEpisodic && currentEpisode > 0) {
                "$movieTitle - Ep $currentEpisode"
            } else {
                movieTitle
            }

            OfflineDownloadManager.startDownload(
                context = this,
                videoUrl = selectedStream.url,
                movieTitle = titleWithEp,
                quality = selectedStream.quality,
                targetPath = chosenPath
            )
            dialog.dismiss()
        }

        dialog.show()
    }

    private fun enterFullscreenLandscape() {
        isFullscreenLandscape = true
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        applyOrientationLayout(Configuration.ORIENTATION_LANDSCAPE)
    }

    private fun exitFullscreenLandscape() {
        isFullscreenLandscape = false
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        applyOrientationLayout(Configuration.ORIENTATION_PORTRAIT)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (isFullscreenLandscape) {
            exitFullscreenLandscape()
            return
        }
        super.onBackPressed()
        overridePendingTransition(R.anim.slide_in_left, R.anim.slide_out_right)
    }

    private fun updateTitleInfo() {
        tvPlayerTitle.text = movieTitle
        tvFsTitle.text = movieTitle

        if (isOffline) {
            tvPlayerSubtitle.text = "Tontonan Offline • FathMovie"
            layoutEpisodeNav.visibility = View.GONE
            return
        }

        if (isEpisodic && currentEpisode > 0) {
            val sub = if (isShortDrama) {
                "Drama Pendek • Episode $currentEpisode"
            } else {
                "Season $currentSeason • Episode $currentEpisode"
            }
            tvPlayerSubtitle.text = sub
            tvEpisodeIndicator.text = "Ep $currentEpisode"
            layoutEpisodeNav.visibility = View.VISIBLE
            btnPrevEp.visibility = if (currentEpisode > 1) View.VISIBLE else View.INVISIBLE
        } else {
            tvPlayerSubtitle.text = "Film Layar Lebar"
            layoutEpisodeNav.visibility = View.GONE
        }
    }

    private fun setupEpisodesGrid() {
        if (isEpisodic && (episodesList.isNotEmpty() || currentEpisode > 0)) {
            if (episodesList.isEmpty()) {
                val count = maxOf(currentEpisode, 10)
                episodesList = ArrayList((1..count).toList())
            }

            cardEpisodeGrid.visibility = View.VISIBLE
            tvEpisodeGridTitle.text = if (isShortDrama) "Daftar Episode Drama Pendek" else "Daftar Episode Season $currentSeason"
            tvEpisodeGridSub.text = "Total ${episodesList.size} Episode • Pilih episode untuk memutar"

            val chunkSize = 25
            if (episodesList.size <= chunkSize) {
                scrollPlayerEpisodeRanges.visibility = View.GONE
                rvEpisodesGrid.layoutManager = GridLayoutManager(this, 4)
                episodeAdapter = EpisodeAdapter(episodesList, currentEpisode) { ep ->
                    if (!canClick()) return@EpisodeAdapter
                    currentEpisode = ep
                    updateTitleInfo()
                    loadStreamData()
                }
                rvEpisodesGrid.adapter = episodeAdapter
            } else {
                scrollPlayerEpisodeRanges.visibility = View.VISIBLE
                episodeChunks = episodesList.chunked(chunkSize)
                activeChunkIndex = episodeChunks.indexOfFirst { it.contains(currentEpisode) }
                if (activeChunkIndex < 0) activeChunkIndex = 0

                val currentChunk = episodeChunks[activeChunkIndex]
                rvEpisodesGrid.layoutManager = GridLayoutManager(this, 4)
                episodeAdapter = EpisodeAdapter(currentChunk, currentEpisode) { ep ->
                    if (!canClick()) return@EpisodeAdapter
                    currentEpisode = ep
                    updateTitleInfo()
                    loadStreamData()
                }
                rvEpisodesGrid.adapter = episodeAdapter

                renderPlayerRangePills()
            }
        } else {
            cardEpisodeGrid.visibility = View.GONE
        }
    }

    private fun renderPlayerRangePills() {
        if (episodeChunks.isEmpty()) return
        layoutPlayerEpisodeRanges.removeAllViews()
        for (i in episodeChunks.indices) {
            val chunk = episodeChunks[i]
            val first = chunk.first()
            val last = chunk.last()
            val pill = TextView(this).apply {
                text = "$first - $last"
                textSize = 12f
                typeface = Typeface.DEFAULT_BOLD
                val isSelected = i == activeChunkIndex
                setBackgroundResource(if (isSelected) R.drawable.bg_button_red else R.drawable.bg_pill_inactive)
                setTextColor(if (isSelected) Color.WHITE else Color.parseColor("#94A3B8"))
                setPadding(dpToPx(12f), dpToPx(6f), dpToPx(12f), dpToPx(6f))
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(dpToPx(4f), 0, dpToPx(4f), 0)
                }
                layoutParams = lp
                setOnClickListener {
                    if (activeChunkIndex != i) {
                        activeChunkIndex = i
                        renderPlayerRangePills()
                        episodeAdapter?.updateList(episodeChunks[i], currentEpisode)
                    }
                }
            }
            layoutPlayerEpisodeRanges.addView(pill)
        }
    }

    private fun syncActiveEpisodeToGrid(ep: Int) {
        if (episodeChunks.isNotEmpty()) {
            val neededChunk = episodeChunks.indexOfFirst { it.contains(ep) }
            if (neededChunk >= 0 && neededChunk != activeChunkIndex) {
                activeChunkIndex = neededChunk
                renderPlayerRangePills()
                episodeAdapter?.updateList(episodeChunks[neededChunk], ep)
                return
            }
        }
        episodeAdapter?.setSelected(ep)
    }

    private fun setupWatchlistState() {
        val prefs = getSharedPreferences("movienas_prefs", Context.MODE_PRIVATE)
        var isSaved = prefs.getBoolean("wl_$detailPath", false)

        fun updateWatchlistUi() {
            if (isSaved) {
                ivWatchlistIcon.setColorFilter(Color.parseColor("#FBBF24"))
                tvWatchlistText.text = "Tersimpan"
                tvWatchlistText.setTextColor(Color.parseColor("#FBBF24"))
            } else {
                ivWatchlistIcon.setColorFilter(Color.WHITE)
                tvWatchlistText.text = "Watchlist"
                tvWatchlistText.setTextColor(Color.WHITE)
            }
        }

        updateWatchlistUi()

        btnPlayerWatchlist.setOnClickListener {
            isSaved = !isSaved
            prefs.edit().putBoolean("wl_$detailPath", isSaved).apply()
            updateWatchlistUi()
            val msg = if (isSaved) "Ditambahkan ke Watchlist" else "Dihapus dari Watchlist"
            Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
        }
    }

    private fun initPlayer() {
        exoPlayer = MoviePlayerManager.createPlayer(
            context = this,
            onStateChanged = { isLoading, _ ->
                playerProgressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            },
            onError = { error ->
                playerProgressBar.visibility = if (exoPlayer?.isPlaying == true) View.GONE else View.VISIBLE
                if (!isFinishing && !isDestroyed) {
                    Toast.makeText(this, "Gagal memutar video: ${error.message}", Toast.LENGTH_LONG).show()
                }
            }
        )
        playerView.player = exoPlayer
        playerView.resizeMode = currentResizeMode

        // Sync close button header in fullscreen with player controller visibility
        try {
            playerView.setControllerVisibilityListener(PlayerView.ControllerVisibilityListener { visibility ->
                if (isFinishing || isDestroyed) return@ControllerVisibilityListener
                if (isFullscreenLandscape || resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE) {
                    layoutFullscreenHeader.visibility = visibility
                }
            })
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    private fun loadStreamData() {
        streamJob?.cancel()

        playerProgressBar.visibility = View.VISIBLE

        streamJob = lifecycleScope.launch {
            try {
                val result = MovieBoxApi.getStream(
                    detailPath = detailPath,
                    subjectId = subjectId,
                    season = currentSeason,
                    episode = currentEpisode,
                    lang = "id"
                )

                if (!this@launch.isActive || isFinishing || isDestroyed) return@launch
                playerProgressBar.visibility = View.GONE

                result.onSuccess { data ->
                    if (!this@launch.isActive || isFinishing || isDestroyed) return@onSuccess
                    streamData = data

                    if (data.streams.isNotEmpty()) {
                        val defaultQuality = data.streams.find { it.resolution == 720 }
                            ?: data.streams.find { it.resolution == 1080 }
                            ?: data.streams.first()

                        currentQuality = defaultQuality.quality

                        // Default subtitle: Indonesian if available, else first
                        val idSub = data.subtitles.find {
                            it.languageCode.equals("id", ignoreCase = true) ||
                                    it.languageName.contains("Indonesia", ignoreCase = true)
                        }
                        currentSubtitleUrl = idSub?.srtUrl ?: data.subtitles.firstOrNull()?.srtUrl

                        setupQualityButtons(data.streams)
                        setupSubtitleButtons(data.subtitles)
                        playSelectedStream(defaultQuality)
                    } else {
                        Toast.makeText(this@PlayerActivity, "Sumber streaming video belum tersedia dari server", Toast.LENGTH_SHORT).show()
                    }
                }.onFailure { err ->
                    if (!isFinishing && !isDestroyed) {
                        Toast.makeText(this@PlayerActivity, "Gagal memuat video: ${err.message}", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Throwable) {
                if (e !is kotlinx.coroutines.CancellationException) {
                    playerProgressBar.visibility = View.GONE
                    if (!isFinishing && !isDestroyed) {
                        Toast.makeText(this@PlayerActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun playSelectedStream(stream: VideoStream) {
        MoviePlayerManager.playVideo(
            context = this,
            player = exoPlayer ?: return,
            videoUrl = stream.url,
            subtitleUrl = currentSubtitleUrl,
            autoPlay = true
        )
    }

    private fun setupQualityButtons(streams: List<VideoStream>) {
        qualityContainer.removeAllViews()
        val inflater = LayoutInflater.from(this)

        for (s in streams) {
            val pillView = inflater.inflate(R.layout.item_quality_pill, qualityContainer, false)
            val ivIcon: ImageView = pillView.findViewById(R.id.ivQualityPlayIcon)
            val tvRes: TextView = pillView.findViewById(R.id.tvQualityRes)
            val tvSize: TextView = pillView.findViewById(R.id.tvQualitySize)

            tvRes.text = s.quality

            if (s.sizeFormatted.isNotEmpty()) {
                tvSize.visibility = View.VISIBLE
                tvSize.text = s.sizeFormatted
            } else {
                tvSize.visibility = View.GONE
            }

            val isSelected = s.quality == currentQuality
            if (isSelected) {
                pillView.setBackgroundResource(R.drawable.bg_pill_quality_active)
                tvRes.setTextColor(Color.WHITE)
                tvSize.setTextColor(Color.parseColor("#FFE4E6"))
                ivIcon.setColorFilter(Color.WHITE)
                pillView.elevation = dpToPx(4f).toFloat()
            } else {
                pillView.setBackgroundResource(R.drawable.bg_pill_quality_inactive)
                tvRes.setTextColor(Color.parseColor("#E2E8F0"))
                tvSize.setTextColor(Color.parseColor("#94A3B8"))
                ivIcon.setColorFilter(Color.parseColor("#94A3B8"))
                pillView.elevation = 0f
            }

            pillView.setOnClickListener {
                currentQuality = s.quality
                setupQualityButtons(streams)

                MoviePlayerManager.switchResolution(
                    context = this@PlayerActivity,
                    player = exoPlayer ?: return@setOnClickListener,
                    newVideoUrl = s.url,
                    subtitleUrl = currentSubtitleUrl
                )
                Toast.makeText(this@PlayerActivity, "Kualitas: ${s.quality}", Toast.LENGTH_SHORT).show()
            }

            qualityContainer.addView(pillView)
        }
    }

    private fun setupSubtitleButtons(subtitles: List<SubtitleItem>) {
        subtitleContainer.removeAllViews()
        val inflater = LayoutInflater.from(this)

        // Button: Mati (Off)
        val offPill = inflater.inflate(R.layout.item_subtitle_pill, subtitleContainer, false)
        val tvOffName: TextView = offPill.findViewById(R.id.tvSubtitleName)
        tvOffName.text = "Mati"

        val isOffSelected = currentSubtitleUrl == null
        if (isOffSelected) {
            offPill.setBackgroundResource(R.drawable.bg_pill_sub_active)
            tvOffName.setTextColor(Color.parseColor("#FBBF24"))
            tvOffName.typeface = Typeface.DEFAULT_BOLD
        } else {
            offPill.setBackgroundResource(R.drawable.bg_pill_sub_inactive)
            tvOffName.setTextColor(Color.parseColor("#CBD5E1"))
            tvOffName.typeface = Typeface.DEFAULT
        }

        offPill.setOnClickListener {
            currentSubtitleUrl = null
            setupSubtitleButtons(subtitles)

            val currentStream = streamData?.streams?.find { it.quality == currentQuality }
                ?: streamData?.streams?.firstOrNull()
            if (currentStream != null) {
                MoviePlayerManager.switchResolution(
                    context = this@PlayerActivity,
                    player = exoPlayer ?: return@setOnClickListener,
                    newVideoUrl = currentStream.url,
                    subtitleUrl = null
                )
            }
            Toast.makeText(this@PlayerActivity, "Subtitle dinonaktifkan", Toast.LENGTH_SHORT).show()
        }
        subtitleContainer.addView(offPill)

        // Language Pills
        for (sub in subtitles) {
            val subPill = inflater.inflate(R.layout.item_subtitle_pill, subtitleContainer, false)
            val tvSubName: TextView = subPill.findViewById(R.id.tvSubtitleName)
            tvSubName.text = sub.languageName

            val isSelected = sub.srtUrl == currentSubtitleUrl
            if (isSelected) {
                subPill.setBackgroundResource(R.drawable.bg_pill_sub_active)
                tvSubName.setTextColor(Color.parseColor("#FBBF24"))
                tvSubName.typeface = Typeface.DEFAULT_BOLD
            } else {
                subPill.setBackgroundResource(R.drawable.bg_pill_sub_inactive)
                tvSubName.setTextColor(Color.parseColor("#CBD5E1"))
                tvSubName.typeface = Typeface.DEFAULT
            }

            subPill.setOnClickListener {
                currentSubtitleUrl = sub.srtUrl
                setupSubtitleButtons(subtitles)

                val currentStream = streamData?.streams?.find { it.quality == currentQuality }
                    ?: streamData?.streams?.firstOrNull()
                if (currentStream != null) {
                    MoviePlayerManager.switchResolution(
                        context = this@PlayerActivity,
                        player = exoPlayer ?: return@setOnClickListener,
                        newVideoUrl = currentStream.url,
                        subtitleUrl = sub.srtUrl
                    )
                }
                Toast.makeText(this@PlayerActivity, "Subtitle: ${sub.languageName}", Toast.LENGTH_SHORT).show()
            }
            subtitleContainer.addView(subPill)
        }
    }

    private fun setupSpeedControls() {
        speedContainer.removeAllViews()
        val inflater = LayoutInflater.from(this)
        val speeds = listOf(0.75f, 1.0f, 1.25f, 1.5f, 2.0f)

        for (spd in speeds) {
            val speedPill = inflater.inflate(R.layout.item_subtitle_pill, speedContainer, false)
            val tvSpeed: TextView = speedPill.findViewById(R.id.tvSubtitleName)
            tvSpeed.text = "${spd}x"

            val isSelected = spd == currentSpeed
            if (isSelected) {
                speedPill.setBackgroundResource(R.drawable.bg_pill_quality_active)
                tvSpeed.setTextColor(Color.WHITE)
                tvSpeed.typeface = Typeface.DEFAULT_BOLD
            } else {
                speedPill.setBackgroundResource(R.drawable.bg_pill_quality_inactive)
                tvSpeed.setTextColor(Color.parseColor("#CBD5E1"))
                tvSpeed.typeface = Typeface.DEFAULT
            }

            speedPill.setOnClickListener {
                currentSpeed = spd
                exoPlayer?.playbackParameters = PlaybackParameters(spd)
                setupSpeedControls()
                Toast.makeText(this@PlayerActivity, "Kecepatan: ${spd}x", Toast.LENGTH_SHORT).show()
            }
            speedContainer.addView(speedPill)
        }
    }

    private fun cycleResizeMode() {
        val (nextMode, modeName) = when (currentResizeMode) {
            AspectRatioFrameLayout.RESIZE_MODE_FIT -> Pair(AspectRatioFrameLayout.RESIZE_MODE_ZOOM, "Zoom (Layar Penuh)")
            AspectRatioFrameLayout.RESIZE_MODE_ZOOM -> Pair(AspectRatioFrameLayout.RESIZE_MODE_FILL, "Fill (Regang)")
            else -> Pair(AspectRatioFrameLayout.RESIZE_MODE_FIT, "Fit (Standar 16:9)")
        }
        currentResizeMode = nextMode
        playerView.resizeMode = nextMode
        tvResizeLabel.text = modeName
        Toast.makeText(this, "Rasio Layar: $modeName", Toast.LENGTH_SHORT).show()
    }

    private fun enterPictureInPicture() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val aspectRatio = if (isShortDrama) Rational(9, 16) else Rational(16, 9)
            val pipParams = PictureInPictureParams.Builder()
                .setAspectRatio(aspectRatio)
                .build()
            enterPictureInPictureMode(pipParams)
        } else {
            Toast.makeText(this, "Picture-in-Picture butuh Android 8.0+", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (isInPictureInPictureMode) {
            playerTopBar.visibility = View.GONE
            playerScrollView.visibility = View.GONE
            layoutFullscreenHeader.visibility = View.GONE
            playerView.useController = false

            val params = RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.MATCH_PARENT,
                RelativeLayout.LayoutParams.MATCH_PARENT
            )
            playerCardContainer.layoutParams = params
            playerCardContainer.radius = 0f
        } else {
            playerView.useController = true
            applyOrientationLayout(resources.configuration.orientation)
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        isFullscreenLandscape = newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE
        applyOrientationLayout(newConfig.orientation)
    }

    private fun applyOrientationLayout(orientation: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isInPictureInPictureMode) {
            return
        }

        if (orientation == Configuration.ORIENTATION_LANDSCAPE || isFullscreenLandscape) {
            // Fullscreen Landscape: hide top bar and scroll content, expand player to fill screen
            playerTopBar.visibility = View.GONE
            playerScrollView.visibility = View.GONE
            layoutFullscreenHeader.visibility = View.VISIBLE

            val params = RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.MATCH_PARENT,
                RelativeLayout.LayoutParams.MATCH_PARENT
            )
            params.setMargins(0, 0, 0, 0)
            playerCardContainer.layoutParams = params
            playerCardContainer.radius = 0f

            window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_FULLSCREEN
                            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    )
        } else {
            // Portrait: restore top bar, player card, and scrollable controls
            playerTopBar.visibility = View.VISIBLE
            playerScrollView.visibility = View.VISIBLE
            layoutFullscreenHeader.visibility = View.GONE

            // Short Drama: tall 9:16 vertical player (~480dp), Movie/Series: 16:9 (~225dp)
            val heightPx = if (isShortDrama) dpToPx(480f) else dpToPx(225f)
            val marginHorizPx = if (isShortDrama) dpToPx(16f) else dpToPx(12f)
            val marginTopPx = dpToPx(6f)

            val params = RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.MATCH_PARENT,
                heightPx
            ).apply {
                addRule(RelativeLayout.BELOW, R.id.playerTopBar)
                setMargins(marginHorizPx, marginTopPx, marginHorizPx, 0)
            }
            playerCardContainer.layoutParams = params
            playerCardContainer.radius = dpToPx(14f).toFloat()

            val scrollParams = RelativeLayout.LayoutParams(
                RelativeLayout.LayoutParams.MATCH_PARENT,
                RelativeLayout.LayoutParams.MATCH_PARENT
            ).apply {
                addRule(RelativeLayout.BELOW, R.id.playerCardContainer)
            }
            playerScrollView.layoutParams = scrollParams

            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        currentSeason = intent.getIntExtra("EXTRA_SEASON", 1)
        currentEpisode = intent.getIntExtra("EXTRA_EPISODE", 1)
        isEpisodic = intent.getBooleanExtra("EXTRA_IS_EPISODIC", false) || currentEpisode > 0
        episodesList = intent.getIntegerArrayListExtra("EXTRA_EPISODES_LIST") ?: arrayListOf()
        updateTitleInfo()
        setupEpisodesGrid()
        loadStreamData()
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && exoPlayer?.isPlaying == true) {
            enterPictureInPicture()
        }
    }

    override fun onStop() {
        super.onStop()
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N || !isInPictureInPictureMode) {
                exoPlayer?.pause()
            }
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        streamJob?.cancel()
        try {
            playerView.player = null
            exoPlayer?.release()
            exoPlayer = null
        } catch (e: Throwable) {
            e.printStackTrace()
        }
    }
}
