// ===== STATE VARIABLES =====
let songs = [];
let queue = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0: off, 1: repeat all, 2: repeat one
let currentView = 'search';
let viewMode = 'grid';
let playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let currentSongForPlaylist = null;
let currentPlaylist = null;
let currentPlaylistIndex = null;

// ===== DOM ELEMENTS =====
const audio = document.getElementById("audio");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const playBtn = document.getElementById("playBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const volumeBtn = document.getElementById("volumeBtn");
const playerImg = document.getElementById("playerImg");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerEl = document.getElementById("player");
const queuePanel = document.getElementById("queuePanel");
const songsContainer = document.getElementById("songs");
const searchInput = document.getElementById("searchInput");

// ===== INITIALIZATION =====
window.onload = () => {
  searchInput.value = "Linkin Park";
  searchMusic();
  renderPlaylists();
  
  // Set initial volume
  audio.volume = 1;
};

// ===== SEARCH FUNCTIONS =====
function searchMusic() {
  const term = searchInput.value.trim();
  if (!term) return;
  
  // Show loading state
  songsContainer.innerHTML = '<div class="empty-state"><h3><i class="fas fa-spinner fa-spin"></i> Searching...</h3></div>';
  
  fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=50`)
    .then(res => res.json())
    .then(data => {
      songs = data.results;
      queue = [...songs];
      renderSongs();
    })
    .catch(error => {
      console.error('Search error:', error);
      songsContainer.innerHTML = '<div class="empty-state"><h3><i class="fas fa-exclamation-circle"></i> Error</h3><p>Failed to search. Please try again.</p></div>';
    });
}

// ===== RENDER FUNCTIONS =====
function renderSongs() {
  const songsToRender = currentView === 'favorites' ? favorites : songs;
  
  if (songsToRender.length === 0) {
    songsContainer.innerHTML = `
      <div class="empty-state">
        <h3><i class="fas fa-${currentView === 'favorites' ? 'heart' : 'search'}"></i> ${currentView === 'favorites' ? 'No Favorites Yet' : 'No Results'}</h3>
        <p>${currentView === 'favorites' ? 'Start adding songs to your favorites!' : 'Try searching for an artist or song'}</p>
      </div>
    `;
    return;
  }
  
  songsContainer.innerHTML = "";
  songsContainer.className = viewMode === 'list' ? 'container list-view' : 'container';
  
  songsToRender.forEach((song, index) => {
    const isLiked = favorites.some(f => f.trackId === song.trackId);
    const cardClass = viewMode === 'list' ? 'card list-item' : 'card';
    
    const card = document.createElement('div');
    card.className = cardClass;
    
    if (viewMode === 'grid') {
      card.innerHTML = `
        <div class="card-image">
          <img src="${song.artworkUrl100.replace('100x100','300x300')}" alt="${song.trackName}">
          <div class="play-overlay"><i class="fas fa-play"></i></div>
        </div>
        <div class="card-actions">
          <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${index})" title="${isLiked ? 'Unlike' : 'Like'}">
            <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i>
          </button>
          <button class="action-btn" onclick="event.stopPropagation(); openAddToPlaylist(${index})" title="Add to playlist"><i class="fas fa-plus"></i></button>
        </div>
        <h4>${song.trackName}</h4>
        <p>${song.artistName}</p>
      `;
    } else {
      card.innerHTML = `
        <img src="${song.artworkUrl100.replace('100x100','300x300')}" alt="${song.trackName}">
        <div class="card-info">
          <h4>${song.trackName}</h4>
          <p>${song.artistName}</p>
        </div>
        <div class="card-actions">
          <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${index})" title="${isLiked ? 'Unlike' : 'Like'}">
            <i class="fa${isLiked ? 's' : 'r'} fa-heart"></i>
          </button>
          <button class="action-btn" onclick="event.stopPropagation(); openAddToPlaylist(${index})" title="Add to playlist"><i class="fas fa-plus"></i></button>
        </div>
      `;
    }
    
    card.onclick = () => {
      queue = [...songsToRender];
      playSong(index);
    };
    
    songsContainer.appendChild(card);
  });
}

function renderQueue() {
  const queueList = document.getElementById("queueList");
  queueList.innerHTML = "";
  
  if (queue.length === 0) {
    queueList.innerHTML = '<div class="empty-state"><h3><i class="fas fa-list-ul"></i> Queue Empty</h3><p>Play a song to start</p></div>';
    return;
  }
  
  queue.forEach((song, index) => {
    const item = document.createElement('div');
    item.className = 'queue-item' + (index === currentIndex ? ' playing' : '');
    item.innerHTML = `
      <img src="${song.artworkUrl100}" alt="${song.trackName}">
      <div class="queue-item-info">
        <h5>${song.trackName}</h5>
        <p>${song.artistName}</p>
      </div>
    `;
    item.onclick = () => {
      playSong(index);
    };
    queueList.appendChild(item);
  });
}

function renderPlaylists() {
  const list = document.getElementById("playlistList");
  list.innerHTML = "";
  
  playlists.forEach((playlist, index) => {
    const item = document.createElement('div');
    item.className = 'playlist-item';
    item.innerHTML = `
      <span><i class="fas fa-list-music"></i> ${playlist.name}</span>
      <span class="playlist-delete" onclick="event.stopPropagation(); deletePlaylist(${index})" title="Delete playlist"><i class="fas fa-times"></i></span>
    `;
    item.onclick = () => viewPlaylist(index);
    list.appendChild(item);
  });
}

// ===== PLAYBACK FUNCTIONS =====
function playSong(index) {
  if (!queue[index]) return;
  
  currentIndex = index;
  const song = queue[index];

  audio.src = song.previewUrl;
  audio.play().catch(error => {
    console.error('Playback error:', error);
  });
  isPlaying = true;

  playerEl.style.display = "block";
  playerImg.src = song.artworkUrl100;
  playerTitle.textContent = song.trackName;
  playerArtist.textContent = song.artistName;
  playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  
  renderQueue();
  
  // Update document title
  document.title = `${song.trackName} - ${song.artistName}`;
}

function togglePlay() {
  if (!queue.length) return;
  
  if (!isPlaying) {
    audio.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  }
}

function next() {
  if (!queue.length) return;
  
  if (repeatMode === 2) {
    audio.currentTime = 0;
    audio.play();
    return;
  }
  
  if (isShuffle) {
    currentIndex = Math.floor(Math.random() * queue.length);
  } else {
    currentIndex = (currentIndex + 1) % queue.length;
  }
  playSong(currentIndex);
}

function prev() {
  if (!queue.length) return;
  
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    currentIndex = (currentIndex - 1 + queue.length) % queue.length;
    playSong(currentIndex);
  }
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active', isShuffle);
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  repeatBtn.classList.toggle('active', repeatMode > 0);
  repeatBtn.innerHTML = repeatMode === 2 ? '<i class="fas fa-redo-alt"></i>' : '<i class="fas fa-redo"></i>';
  
  // Update title attribute
  const titles = ['Repeat: Off', 'Repeat: All', 'Repeat: One'];
  repeatBtn.title = titles[repeatMode];
}

function toggleMute() {
  if (audio.volume > 0) {
    audio.dataset.previousVolume = audio.volume;
    audio.volume = 0;
    volume.value = 0;
    volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
  } else {
    const prevVolume = parseFloat(audio.dataset.previousVolume) || 1;
    audio.volume = prevVolume;
    volume.value = prevVolume * 100;
    updateVolumeIcon();
  }
}

function updateVolumeIcon() {
  if (volume.value == 0) {
    volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
  } else if (volume.value < 50) {
    volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
  } else {
    volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
  }
}

// ===== FAVORITES FUNCTIONS =====
function toggleFavorite(index) {
  const songsToUse = currentView === 'favorites' ? favorites : songs;
  const song = songsToUse[index];
  const favIndex = favorites.findIndex(f => f.trackId === song.trackId);
  
  if (favIndex > -1) {
    favorites.splice(favIndex, 1);
  } else {
    favorites.push(song);
  }
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderSongs();
}

// ===== PLAYLIST FUNCTIONS =====
function showNewPlaylistModal() {
  document.getElementById("playlistModal").classList.add('show');
  document.getElementById("playlistName").value = "";
  document.getElementById("playlistName").focus();
}

function closePlaylistModal() {
  document.getElementById("playlistModal").classList.remove('show');
}

function createPlaylist() {
  const name = document.getElementById("playlistName").value.trim();
  if (!name) {
    alert('Please enter a playlist name');
    return;
  }
  
  playlists.push({ name, songs: [] });
  localStorage.setItem('playlists', JSON.stringify(playlists));
  renderPlaylists();
  closePlaylistModal();
}

function deletePlaylist(index) {
  if (confirm(`Delete "${playlists[index].name}"?`)) {
    playlists.splice(index, 1);
    localStorage.setItem('playlists', JSON.stringify(playlists));
    renderPlaylists();
  }
}

function openAddToPlaylist(index) {
  currentSongForPlaylist = currentView === 'favorites' ? favorites[index] : songs[index];
  const modal = document.getElementById("addToPlaylistModal");
  const list = document.getElementById("playlistSelectList");
  
  list.innerHTML = "";
  
  if (playlists.length === 0) {
    list.innerHTML = '<p style="opacity:0.6; text-align:center; padding:20px;">No playlists yet. Create one first!</p>';
  } else {
    playlists.forEach((playlist, idx) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      const songExists = playlist.songs.some(s => s.trackId === currentSongForPlaylist.trackId);
      item.innerHTML = `
        <span><i class="fas fa-list-music"></i> ${playlist.name}</span>
        ${songExists ? '<span style="color: #22c55e;"><i class="fas fa-check"></i></span>' : ''}
      `;
      item.onclick = () => addToPlaylist(idx);
      list.appendChild(item);
    });
  }
  
  modal.classList.add('show');
}

function closeAddToPlaylistModal() {
  document.getElementById("addToPlaylistModal").classList.remove('show');
  currentSongForPlaylist = null;
}

function addToPlaylist(playlistIndex) {
  const playlist = playlists[playlistIndex];
  const exists = playlist.songs.some(s => s.trackId === currentSongForPlaylist.trackId);
  
  if (!exists) {
    playlist.songs.push(currentSongForPlaylist);
    localStorage.setItem('playlists', JSON.stringify(playlists));
    alert(`Added to "${playlist.name}"`);
  } else {
    alert(`Already in "${playlist.name}"`);
  }
  
  closeAddToPlaylistModal();
}

function viewPlaylist(index) {
  currentPlaylistIndex = index;
  currentPlaylist = playlists[index];
  const modal = document.getElementById("viewPlaylistModal");
  const title = document.getElementById("viewPlaylistTitle");
  const songsList = document.getElementById("playlistSongs");
  
  title.textContent = currentPlaylist.name;
  songsList.innerHTML = "";
  
  if (currentPlaylist.songs.length === 0) {
    songsList.innerHTML = '<p style="opacity:0.6; text-align:center; padding:20px;">No songs in this playlist yet</p>';
  } else {
    currentPlaylist.songs.forEach((song, idx) => {
      const item = document.createElement('div');
      item.className = 'playlist-song-item';
      item.innerHTML = `
        <div>
          <div style="font-weight:500; margin-bottom: 4px;">${song.trackName}</div>
          <div style="font-size:12px; opacity:0.7;">${song.artistName}</div>
        </div>
        <span class="playlist-song-remove" onclick="removeFromPlaylist(${currentPlaylistIndex}, ${idx})" title="Remove from playlist"><i class="fas fa-times"></i></span>
      `;
      songsList.appendChild(item);
    });
  }
  
  modal.classList.add('show');
}

function closeViewPlaylistModal() {
  document.getElementById("viewPlaylistModal").classList.remove('show');
  currentPlaylist = null;
  currentPlaylistIndex = null;
}

function removeFromPlaylist(playlistIndex, songIndex) {
  playlists[playlistIndex].songs.splice(songIndex, 1);
  localStorage.setItem('playlists', JSON.stringify(playlists));
  viewPlaylist(playlistIndex);
  renderPlaylists();
}

function playCurrentPlaylist() {
  if (currentPlaylist && currentPlaylist.songs.length > 0) {
    queue = [...currentPlaylist.songs];
    currentIndex = 0;
    playSong(0);
    closeViewPlaylistModal();
  }
}

// ===== VIEW FUNCTIONS =====
function toggleView(mode) {
  viewMode = mode;
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderSongs();
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event.target.classList.add('active');
  
  if (view === 'search') {
    document.getElementById("contentTitle").innerHTML = '<i class="fas fa-music"></i> Music Player';
    document.getElementById("viewTitle").textContent = "Search Results";
    document.getElementById("searchSection").style.display = "block";
    renderSongs();
  } else if (view === 'favorites') {
    document.getElementById("contentTitle").innerHTML = '<i class="fas fa-heart"></i> Favorites';
    document.getElementById("viewTitle").textContent = "Liked Songs";
    document.getElementById("searchSection").style.display = "none";
    renderSongs();
  }
}

function toggleQueue() {
  queuePanel.classList.toggle('open');
}

// ===== UTILITY FUNCTIONS =====
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== AUDIO EVENT LISTENERS =====
audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    progress.value = (audio.currentTime / audio.duration) * 100;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    durationEl.textContent = formatTime(audio.duration);
  }
});

audio.addEventListener("ended", () => {
  if (repeatMode === 2) {
    audio.currentTime = 0;
    audio.play();
  } else if (repeatMode === 1 || currentIndex < queue.length - 1) {
    next();
  } else {
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    document.title = "Music Player";
  }
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("error", (e) => {
  console.error('Audio error:', e);
  alert('Failed to load audio. The preview may not be available.');
});

// ===== PROGRESS BAR EVENT LISTENER =====
progress.addEventListener("input", () => {
  audio.currentTime = (progress.value / 100) * audio.duration;
});

progress.addEventListener("mousedown", () => {
  audio.dataset.wasPlaying = isPlaying;
  if (isPlaying) {
    audio.pause();
  }
});

progress.addEventListener("mouseup", () => {
  if (audio.dataset.wasPlaying === 'true') {
    audio.play();
  }
});

// ===== VOLUME CONTROL EVENT LISTENER =====
volume.addEventListener("input", () => {
  audio.volume = volume.value / 100;
  updateVolumeIcon();
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in input fields
  if (e.target.tagName === 'INPUT') return;
  
  switch(e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowRight':
      e.preventDefault();
      if (e.shiftKey) {
        // Skip forward 10 seconds
        audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
      } else {
        next();
      }
      break;
    case 'ArrowLeft':
      e.preventDefault();
      if (e.shiftKey) {
        // Skip backward 10 seconds
        audio.currentTime = Math.max(audio.currentTime - 10, 0);
      } else {
        prev();
      }
      break;
    case 'ArrowUp':
      e.preventDefault();
      volume.value = Math.min(parseFloat(volume.value) + 10, 100);
      audio.volume = volume.value / 100;
      updateVolumeIcon();
      break;
    case 'ArrowDown':
      e.preventDefault();
      volume.value = Math.max(parseFloat(volume.value) - 10, 0);
      audio.volume = volume.value / 100;
      updateVolumeIcon();
      break;
    case 'KeyM':
      e.preventDefault();
      toggleMute();
      break;
    case 'KeyS':
      e.preventDefault();
      toggleShuffle();
      break;
    case 'KeyR':
      e.preventDefault();
      toggleRepeat();
      break;
    case 'KeyQ':
      e.preventDefault();
      toggleQueue();
      break;
  }
});

// ===== MODAL CLOSE ON OUTSIDE CLICK =====
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
    }
  });
});

// ===== ESCAPE KEY TO CLOSE MODALS AND QUEUE =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close any open modals
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
    
    // Close queue panel
    if (queuePanel.classList.contains('open')) {
      queuePanel.classList.remove('open');
    }
  }
});

// ===== PREVENT SCROLL ON SPACE BAR =====
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
  }
});

// ===== MEDIA SESSION API (for media controls on mobile/desktop) =====
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => {
    audio.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    prev();
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    next();
  });

  // Update media session metadata when song changes
  audio.addEventListener('loadedmetadata', () => {
    if (queue[currentIndex]) {
      const song = queue[currentIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.trackName,
        artist: song.artistName,
        album: song.collectionName || '',
        artwork: [
          { src: song.artworkUrl100.replace('100x100', '512x512'), sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    }
  });
}

// ===== SERVICE WORKER FOR OFFLINE SUPPORT (Optional) =====
if ('serviceWorker' in navigator) {
  // Uncomment to enable service worker
  // navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
}

console.log('🎵 Music Player loaded successfully!');
console.log('Keyboard shortcuts:');
console.log('  Space - Play/Pause');
console.log('  ← → - Previous/Next track');
console.log('  Shift + ← → - Skip 10 seconds');
console.log('  ↑ ↓ - Volume up/down');
console.log('  M - Mute/Unmute');
console.log('  S - Toggle shuffle');
console.log('  R - Toggle repeat');
console.log('  Q - Toggle queue');
console.log('  Esc - Close modals/queue');