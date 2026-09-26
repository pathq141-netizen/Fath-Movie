/**
 * MOVIENAS - Video Player Logic
 * Custom HTML5 Player, Seeking with Range Proxy, Multi-Quality Switching,
 * WebVTT Subtitle Selector, Series Episode Navigation, and LocalStorage History
 */

let streamData = null;
let currentDetailData = null;
let activeStream = null;
let activeSubtitle = null;
let controlsTimeout = null;
let isScrubbing = false;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const detailPath = urlParams.get('path') || urlParams.get('slug');
  const subjectId = urlParams.get('id') || '';
  const season = parseInt(urlParams.get('se') || '0', 10);
  const episode = parseInt(urlParams.get('ep') || '0', 10);
  const resumeTime = parseFloat(urlParams.get('t') || '0');

  if (!detailPath) {
    alert('Parameter tontonan tidak valid.');
    window.location.href = '/';
    return;
  }

  // Setup Back Button
  const backBtn = document.getElementById('playerBackBtn');
  if (backBtn) {
    backBtn.href = `/detail.html?path=${encodeURIComponent(detailPath)}`;
  }

  initPlayerControls();
  await loadStream(detailPath, subjectId, season, episode, resumeTime);
  loadSeriesNavigation(detailPath, season, episode);
});

async function loadStream(detailPath, subjectId, season, episode, initialTime = 0) {
  const spinner = document.getElementById('playerSpinner');
  const titleElem = document.getElementById('playerTitle');
  const subTitleElem = document.getElementById('playerSubTitle');

  if (spinner) spinner.classList.add('active');

  try {
    const url = `/api/stream?path=${encodeURIComponent(detailPath)}&id=${encodeURIComponent(subjectId)}&se=${season}&ep=${episode}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.status || !json.data || !json.data.streams || json.data.streams.length === 0) {
      alert('Maaf, link stream video tidak ditemukan untuk judul atau episode ini.');
      window.location.href = `/detail.html?path=${encodeURIComponent(detailPath)}`;
      return;
    }

    streamData = json.data;

    // Header Title
    if (titleElem) titleElem.textContent = streamData.title || 'FathMovie Player';
    if (subTitleElem) {
      if (streamData.isMovie) {
        subTitleElem.textContent = 'Film Layar Lebar';
      } else {
        subTitleElem.textContent = `Season ${streamData.season} • Episode ${streamData.episode}`;
      }
    }

    // Watchlist sync
    const watchlistBtn = document.getElementById('playerWatchlistBtn');
    if (watchlistBtn) {
      const syncWl = () => {
        const active = StreamBoxApp.isWatchlisted(streamData.detailPath);
        watchlistBtn.innerHTML = active
          ? `<i class="fa-solid fa-check"></i> Tersimpan`
          : `<i class="fa-solid fa-bookmark"></i> Watchlist`;
      };
      syncWl();
      watchlistBtn.onclick = () => {
        StreamBoxApp.toggleWatchlist(streamData);
        syncWl();
      };
    }

    // Setup Qualities & Subtitles
    setupQualityOptions(streamData.streams);
    setupSubtitleOptions(streamData.subtitles || []);

    // Pick best quality (prefer 720p or 1080p, or first available)
    const preferredStream =
      streamData.streams.find((s) => s.resolution === 720) ||
      streamData.streams.find((s) => s.resolution === 1080) ||
      streamData.streams[0];

    playSelectedStream(preferredStream, initialTime);

  } catch (err) {
    console.error('Error loading stream:', err);
    alert('Terjadi kesalahan saat memuat pemutar: ' + err.message);
  } finally {
    if (spinner) spinner.classList.remove('active');
  }
}

// 1. Play specific stream quality
function playSelectedStream(streamObj, seekToTime = 0) {
  const video = document.getElementById('mainVideo');
  const qualityLabel = document.getElementById('qualityLabel');
  if (!video || !streamObj) return;

  activeStream = streamObj;
  if (qualityLabel) qualityLabel.textContent = streamObj.quality || 'Auto';

  // Update active state in dropdown
  const qualityItems = document.querySelectorAll('#qualityDropdown .dropdown-item');
  qualityItems.forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-quality') === streamObj.quality);
  });

  const previousTime = seekToTime > 0 ? seekToTime : video.currentTime || 0;
  const wasPlaying = !video.paused;

  video.src = streamObj.proxyUrl;
  video.load();

  video.onloadedmetadata = () => {
    if (previousTime > 0 && previousTime < video.duration) {
      video.currentTime = previousTime;
      StreamBoxApp.showToast(`Melanjutkan pemutaran dari ${StreamBoxApp.formatTime(previousTime)}`);
    } else {
      // Check localStorage for saved progress if not provided
      const history = StreamBoxApp.getHistoryItem(streamData.detailPath);
      if (history && history.currentTime > 15 && (!history.duration || history.currentTime < history.duration - 30)) {
        if (!streamData.isMovie && (history.season !== streamData.season || history.episode !== streamData.episode)) {
          // Different episode
        } else {
          video.currentTime = history.currentTime;
          StreamBoxApp.showToast(`Melanjutkan dari posisi terakhir: ${StreamBoxApp.formatTime(history.currentTime)}`);
        }
      }
    }

    if (wasPlaying || seekToTime > 0) {
      video.play().catch(() => {});
    }
  };
}

// 2. Setup Quality Options Dropdown
function setupQualityOptions(streams) {
  const dropdown = document.getElementById('qualityDropdown');
  if (!dropdown || !streams) return;

  dropdown.innerHTML = streams
    .map((s) => `
      <div class="dropdown-item" data-quality="${s.quality}" onclick="switchQuality('${s.quality}')">
        <span>${s.quality}</span>
        ${s.sizeFormatted ? `<span class="text-xs text-slate-500">${s.sizeFormatted}</span>` : ''}
      </div>
    `)
    .join('');
}

window.switchQuality = function (quality) {
  const target = streamData.streams.find((s) => s.quality === quality);
  if (target && target !== activeStream) {
    const video = document.getElementById('mainVideo');
    playSelectedStream(target, video.currentTime);
    StreamBoxApp.showToast(`Kualitas diubah ke ${quality}`);
  }
  closeAllDropdowns();
};

// 3. Setup Subtitle Options Dropdown
function setupSubtitleOptions(subtitles) {
  const dropdown = document.getElementById('subDropdown');
  const subLabel = document.getElementById('subLabel');
  if (!dropdown) return;

  if (!subtitles || subtitles.length === 0) {
    if (subLabel) subLabel.textContent = 'Sub: Tidak Ada';
    dropdown.innerHTML = `<div class="dropdown-item active">Tidak ada subtitle</div>`;
    return;
  }

  let html = `<div class="dropdown-item active" data-sub="off" onclick="switchSubtitle('off')">Matikan Subtitle</div>`;
  html += subtitles
    .map((sub) => `
      <div class="dropdown-item" data-sub="${sub.id}" onclick="switchSubtitle('${sub.id}')">
        <span>${sub.languageName}</span>
        <span class="text-xs text-slate-500 uppercase">${sub.languageCode}</span>
      </div>
    `)
    .join('');

  dropdown.innerHTML = html;

  // Auto-enable Indonesian subtitle if available!
  const idSub =
    subtitles.find((s) => s.languageCode.toLowerCase() === 'id' || s.languageName.toLowerCase().includes('indonesia')) ||
    subtitles.find((s) => s.languageCode.toLowerCase() === 'en' || s.languageName.toLowerCase().includes('english'));

  if (idSub) {
    switchSubtitle(idSub.id);
  }
}

window.switchSubtitle = function (subId) {
  const video = document.getElementById('mainVideo');
  const subLabel = document.getElementById('subLabel');
  if (!video) return;

  // Clear existing tracks
  while (video.firstChild) {
    video.removeChild(video.firstChild);
  }

  // Update active dropdown item
  const items = document.querySelectorAll('#subDropdown .dropdown-item');
  items.forEach((item) => {
    item.classList.toggle('active', item.getAttribute('data-sub') === subId);
  });

  if (subId === 'off') {
    if (subLabel) subLabel.textContent = 'Sub: Nonaktif';
    activeSubtitle = null;
    closeAllDropdowns();
    return;
  }

  const selected = streamData.subtitles.find((s) => s.id === subId);
  if (selected) {
    activeSubtitle = selected;
    if (subLabel) subLabel.textContent = `Sub: ${selected.languageName}`;

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = selected.languageName;
    track.srclang = selected.languageCode || 'id';
    track.src = selected.vttUrl;
    track.default = true;

    video.appendChild(track);

    if (video.textTracks && video.textTracks.length > 0) {
      video.textTracks[0].mode = 'showing';
    }

    StreamBoxApp.showToast(`Subtitle aktif: ${selected.languageName}`);
  }
  closeAllDropdowns();
};

// 4. Initialize Custom Player Controls
function initPlayerControls() {
  const video = document.getElementById('mainVideo');
  const videoWrapper = document.getElementById('videoWrapper');
  const controlsBar = document.getElementById('controlsBar');
  const centerPlayBtn = document.getElementById('centerPlayBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const rewindBtn = document.getElementById('rewindBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressFilled = document.getElementById('progressFilled');
  const progressBuffer = document.getElementById('progressBuffer');
  const progressThumb = document.getElementById('progressThumb');
  const currentTimeElem = document.getElementById('currentTime');
  const durationTimeElem = document.getElementById('durationTime');
  const volumeBtn = document.getElementById('volumeBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Toggle Play / Pause
  const togglePlay = () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  playPauseBtn.addEventListener('click', togglePlay);
  centerPlayBtn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);

  video.addEventListener('play', () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    centerPlayBtn.classList.add('hidden');
    resetControlsTimer();
  });

  video.addEventListener('pause', () => {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    centerPlayBtn.classList.remove('hidden');
    showControls();
  });

  // Rewind & Forward 10s
  rewindBtn.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
    resetControlsTimer();
  });

  forwardBtn.addEventListener('click', () => {
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
    resetControlsTimer();
  });

  // Time & Progress Updates
  video.addEventListener('timeupdate', () => {
    if (isScrubbing || isNaN(video.duration)) return;

    const current = video.currentTime;
    const duration = video.duration;
    const percent = (current / duration) * 100;

    progressFilled.style.width = `${percent}%`;
    progressThumb.style.left = `${percent}%`;
    currentTimeElem.textContent = StreamBoxApp.formatTime(current);
    durationTimeElem.textContent = StreamBoxApp.formatTime(duration);

    // Update buffer bar
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const bufferPercent = (bufferedEnd / duration) * 100;
      progressBuffer.style.width = `${bufferPercent}%`;
    }
  });

  // Seek bar interaction (click & drag)
  const seek = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * video.duration;
    progressFilled.style.width = `${pos * 100}%`;
    progressThumb.style.left = `${pos * 100}%`;
  };

  progressContainer.addEventListener('mousedown', (e) => {
    isScrubbing = true;
    seek(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isScrubbing) seek(e);
  });

  window.addEventListener('mouseup', () => {
    if (isScrubbing) isScrubbing = false;
  });

  // Volume slider & Mute
  const savedVol = localStorage.getItem('movienas_volume');
  if (savedVol !== null) {
    video.volume = parseFloat(savedVol);
    volumeSlider.value = savedVol;
  }

  const updateVolumeIcon = () => {
    if (video.muted || video.volume === 0) {
      volumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    } else if (video.volume < 0.5) {
      volumeBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
    } else {
      volumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    }
  };
  updateVolumeIcon();

  volumeSlider.addEventListener('input', (e) => {
    video.volume = parseFloat(e.target.value);
    video.muted = false;
    localStorage.setItem('movienas_volume', e.target.value);
    updateVolumeIcon();
    resetControlsTimer();
  });

  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon();
    resetControlsTimer();
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      if (videoWrapper.requestFullscreen) {
        videoWrapper.requestFullscreen();
      } else if (videoWrapper.webkitRequestFullscreen) {
        videoWrapper.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFs = Boolean(document.fullscreenElement);
    videoWrapper.classList.toggle('fullscreen', isFs);
    fullscreenBtn.innerHTML = isFs
      ? '<i class="fa-solid fa-compress"></i>'
      : '<i class="fa-solid fa-expand"></i>';
  });

  // Dropdown menus toggle (Quality, Subtitle, Speed)
  setupDropdownToggle('qualityBtn', 'qualityDropdown');
  setupDropdownToggle('subBtn', 'subDropdown');
  setupDropdownToggle('speedBtn', 'speedDropdown');

  // Playback speed selection
  const speedItems = document.querySelectorAll('#speedDropdown .dropdown-item');
  speedItems.forEach((item) => {
    item.addEventListener('click', () => {
      const speed = parseFloat(item.getAttribute('data-speed'));
      video.playbackRate = speed;
      document.getElementById('speedLabel').textContent = `${speed}x`;
      speedItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      closeAllDropdowns();
      StreamBoxApp.showToast(`Kecepatan: ${speed}x`);
    });
  });

  // Controls Auto-Hide Behavior
  function showControls() {
    controlsBar.classList.remove('inactive');
  }

  function hideControls() {
    if (!video.paused && !isScrubbing) {
      controlsBar.classList.add('inactive');
      closeAllDropdowns();
    }
  }

  function resetControlsTimer() {
    showControls();
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3500);
  }

  videoWrapper.addEventListener('mousemove', resetControlsTimer);
  videoWrapper.addEventListener('touchstart', resetControlsTimer);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 10);
      resetControlsTimer();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
      resetControlsTimer();
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      volumeSlider.value = video.volume;
      updateVolumeIcon();
      resetControlsTimer();
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      volumeSlider.value = video.volume;
      updateVolumeIcon();
      resetControlsTimer();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      fullscreenBtn.click();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      volumeBtn.click();
    }
  });

  // Continue Watching Auto-save (Every 5 seconds)
  setInterval(() => {
    if (video && !video.paused && streamData && video.currentTime > 5) {
      StreamBoxApp.saveHistory({
        detailPath: streamData.detailPath,
        subjectId: streamData.subjectId,
        title: streamData.title,
        coverUrl: currentDetailData?.coverUrl || '',
        isMovie: streamData.isMovie,
        season: streamData.season,
        episode: streamData.episode,
        currentTime: video.currentTime,
        duration: video.duration || 0,
      });
    }
  }, 5000);

  // Auto-play next episode on ended
  video.addEventListener('ended', () => {
    handleVideoEnded();
  });
}

// 5. Setup Dropdown Menus
function setupDropdownToggle(btnId, menuId) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = menu.classList.contains('show');
    closeAllDropdowns();
    if (!isShown) menu.classList.add('show');
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.player-dropdown-menu').forEach((m) => m.classList.remove('show'));
}

window.addEventListener('click', closeAllDropdowns);

// 6. Series Navigation & Quick Episodes List
async function loadSeriesNavigation(detailPath, currentSeason, currentEpisode) {
  try {
    const res = await fetch(`/api/detail?path=${encodeURIComponent(detailPath)}`);
    const json = await res.json();
    if (!json.status || !json.data) return;

    currentDetailData = json.data;
    const isSeries = currentDetailData.typeLabel === 'Series' || currentDetailData.subjectType === 2;

    if (!isSeries || !currentDetailData.resource?.seasons?.length) {
      return;
    }

    const seasons = currentDetailData.resource.seasons;
    const curSeasonObj = seasons.find((s) => s.seasonNumber === currentSeason) || seasons[0];
    const episodes = curSeasonObj.allEpisodes || [1];

    const seriesNavBar = document.getElementById('seriesNavBar');
    const quickEpList = document.getElementById('quickEpList');
    const seasonTitle = document.getElementById('seriesSeasonTitle');
    const prevEpBtn = document.getElementById('prevEpBtn');
    const nextEpBtn = document.getElementById('nextEpBtn');

    seriesNavBar.style.display = 'flex';
    quickEpList.style.display = 'flex';
    seasonTitle.textContent = `Episode Season ${curSeasonObj.seasonNumber}`;

    // Quick Episodes pills
    quickEpList.innerHTML = episodes
      .map((ep) => `
        <div class="ep-btn-quick ${ep === currentEpisode ? 'current' : ''}" onclick="jumpToEpisode(${curSeasonObj.seasonNumber}, ${ep})">
          <span class="ep-num">${ep}</span>
          <span>EP</span>
        </div>
      `)
      .join('');

    // Prev / Next button setup
    const curIndex = episodes.indexOf(currentEpisode);

    if (curIndex > 0) {
      prevEpBtn.style.display = 'inline-flex';
      prevEpBtn.onclick = () => jumpToEpisode(curSeasonObj.seasonNumber, episodes[curIndex - 1]);
    } else {
      prevEpBtn.style.display = 'none';
    }

    if (curIndex < episodes.length - 1) {
      nextEpBtn.style.display = 'inline-flex';
      nextEpBtn.onclick = () => jumpToEpisode(curSeasonObj.seasonNumber, episodes[curIndex + 1]);
    } else {
      nextEpBtn.style.display = 'none';
    }

  } catch (err) {
    console.error('Error loading series navigation:', err);
  }
}

window.jumpToEpisode = function (season, episode) {
  window.location.href = `/player.html?path=${encodeURIComponent(streamData.detailPath)}&id=${encodeURIComponent(streamData.subjectId)}&se=${season}&ep=${episode}`;
};

function handleVideoEnded() {
  if (streamData && !streamData.isMovie && currentDetailData?.resource?.seasons) {
    const seasons = currentDetailData.resource.seasons;
    const curSeasonObj = seasons.find((s) => s.seasonNumber === streamData.season) || seasons[0];
    const episodes = curSeasonObj.allEpisodes || [];
    const curIndex = episodes.indexOf(streamData.episode);

    if (curIndex > -1 && curIndex < episodes.length - 1) {
      const nextEp = episodes[curIndex + 1];
      StreamBoxApp.showToast(`Episode selesai. Memutar Episode ${nextEp} dalam 5 detik...`);
      setTimeout(() => {
        jumpToEpisode(curSeasonObj.seasonNumber, nextEp);
      }, 5000);
    }
  }
}
