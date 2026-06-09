const audioPlayer = document.querySelector("#audioPlayer");
const currentTitle = document.querySelector("#currentTitle");
const trackCount = document.querySelector("#trackCount");
const trackList = document.querySelector("#trackList");
const playButton = document.querySelector("#playButton");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const seekBar = document.querySelector("#seekBar");
const currentTime = document.querySelector("#currentTime");
const duration = document.querySelector("#duration");
const speedSelect = document.querySelector("#speedSelect");
const repeatToggle = document.querySelector("#repeatToggle");
const searchInput = document.querySelector("#searchInput");
const statusMessage = document.querySelector("#statusMessage");
const fileInput = document.querySelector("#fileInput");

let tracks = [];
let filteredTracks = [];
let currentIndex = -1;
let isSeeking = false;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function cleanFileName(fileName) {
  return decodeURIComponent(fileName)
    .split("/")
    .pop()
    .replace(/\.mp3$/i, "");
}

function sortTracks(trackA, trackB) {
  return trackA.title.localeCompare(trackB.title, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function updateCount() {
  const total = tracks.length;
  trackCount.textContent = total > 0 ? `${total}개 파일` : "파일 없음";
}

function updateControls() {
  const hasTracks = tracks.length > 0;
  playButton.disabled = !hasTracks;
  prevButton.disabled = !hasTracks;
  nextButton.disabled = !hasTracks;
  seekBar.disabled = !hasTracks;
}

function renderTrackList() {
  const query = searchInput.value.trim().toLowerCase();
  filteredTracks = tracks.filter((track) => track.title.toLowerCase().includes(query));
  trackList.replaceChildren();

  if (filteredTracks.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = tracks.length === 0 ? "MP3 파일이 없습니다." : "검색 결과가 없습니다.";
    trackList.append(emptyItem);
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredTracks.forEach((track) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "track-item";
    button.textContent = track.title;
    button.dataset.index = track.index;

    if (track.index === currentIndex) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "true");
    }

    button.addEventListener("click", () => {
      loadTrack(track.index, true);
    });

    item.append(button);
    fragment.append(item);
  });

  trackList.append(fragment);
}

function loadTrack(index, shouldPlay = false) {
  if (!tracks[index]) {
    return;
  }

  currentIndex = index;
  const track = tracks[currentIndex];
  audioPlayer.src = track.url;
  audioPlayer.playbackRate = Number(speedSelect.value);
  currentTitle.textContent = track.title;
  seekBar.value = 0;
  currentTime.textContent = "0:00";
  duration.textContent = "0:00";
  setStatus("");
  renderTrackList();

  if (shouldPlay) {
    audioPlayer.play().catch(() => {
      setStatus("브라우저가 자동 재생을 막았습니다. 재생 버튼을 눌러주세요.");
    });
  }
}

function moveTrack(step) {
  if (tracks.length === 0) {
    return;
  }

  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + step + tracks.length) % tracks.length;

  loadTrack(nextIndex, !audioPlayer.paused);
}

async function loadAudioFolder() {
  try {
    const response = await fetch("audio/");

    if (!response.ok) {
      throw new Error("Audio folder is not readable.");
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = [...doc.querySelectorAll("a")];
    const audioTracks = links
      .map((link) => link.getAttribute("href"))
      .filter((href) => href && /\.mp3(?:$|\?)/i.test(href))
      .map((href) => {
        const url = new URL(href, new URL("audio/", window.location.href));
        return {
          title: cleanFileName(url.pathname),
          url: url.href,
        };
      })
      .sort(sortTracks)
      .map((track, index) => ({ ...track, index }));

    tracks = audioTracks;
    updateCount();
    updateControls();
    renderTrackList();

    if (tracks.length > 0) {
      loadTrack(0);
      setStatus("audio 폴더에서 MP3 파일을 불러왔습니다.");
    } else {
      setStatus("audio 폴더에 MP3 파일을 넣어주세요.");
    }
  } catch (error) {
    tracks = [];
    updateCount();
    updateControls();
    renderTrackList();
    setStatus("로컬 서버에서 실행하거나 파일 선택으로 MP3를 불러와 주세요.");
  }
}

playButton.addEventListener("click", () => {
  if (tracks.length === 0) {
    return;
  }

  if (currentIndex === -1) {
    loadTrack(0);
  }

  if (audioPlayer.paused) {
    audioPlayer.play();
  } else {
    audioPlayer.pause();
  }
});

prevButton.addEventListener("click", () => moveTrack(-1));
nextButton.addEventListener("click", () => moveTrack(1));

audioPlayer.addEventListener("play", () => {
  playButton.textContent = "일시정지";
});

audioPlayer.addEventListener("pause", () => {
  playButton.textContent = "재생";
});

audioPlayer.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  if (isSeeking || !Number.isFinite(audioPlayer.duration)) {
    return;
  }

  const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  seekBar.value = progress || 0;
  currentTime.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("ended", () => {
  if (repeatToggle.checked) {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    return;
  }

  moveTrack(1);
});

seekBar.addEventListener("input", () => {
  isSeeking = true;
});

seekBar.addEventListener("change", () => {
  if (Number.isFinite(audioPlayer.duration)) {
    audioPlayer.currentTime = (Number(seekBar.value) / 100) * audioPlayer.duration;
  }

  isSeeking = false;
});

speedSelect.addEventListener("change", () => {
  audioPlayer.playbackRate = Number(speedSelect.value);
});

searchInput.addEventListener("input", renderTrackList);

fileInput.addEventListener("change", () => {
  const files = [...fileInput.files].filter((file) => /\.mp3$/i.test(file.name));

  tracks.forEach((track) => {
    if (track.url.startsWith("blob:")) {
      URL.revokeObjectURL(track.url);
    }
  });

  tracks = files
    .map((file) => ({
      title: cleanFileName(file.name),
      url: URL.createObjectURL(file),
    }))
    .sort(sortTracks)
    .map((track, index) => ({ ...track, index }));

  currentIndex = -1;
  updateCount();
  updateControls();
  renderTrackList();

  if (tracks.length > 0) {
    loadTrack(0);
    setStatus("선택한 MP3 파일을 불러왔습니다.");
  } else {
    currentTitle.textContent = "파일을 선택하세요";
    setStatus("선택한 파일 중 MP3가 없습니다.");
  }
});

updateControls();
loadAudioFolder();
