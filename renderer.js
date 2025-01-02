const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const selectFolderButton = document.getElementById('selectFolder');
const previousButton = document.getElementById('previousButton');
const nextButton = document.getElementById('nextButton');
const shuffleButton = document.getElementById('shuffleButton');
const repeatButton = document.getElementById('repeatButton');
const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const musicList = document.getElementById('musicList');
const audioPlayer = document.getElementById('audioPlayer');
const nowPlaying = document.getElementById('nowPlaying');

// Additional UI for album art
const albumArtContainer = document.createElement('div');
albumArtContainer.id = 'albumArt';
document.body.appendChild(albumArtContainer); // Add album art container to body

let originalPlaylist = []; // To store the original loaded playlist
let playlist = [];         // Current working playlist (shuffled or original)
let currentIndex = -1;     // Index of the currently playing track
let shuffleEnabled = false; // Toggle state for shuffle
let repeatEnabled = false;  // Toggle state for repeat

// Load music from a folder
const loadMusicFromFolder = (folderPath) => {
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        const audioFiles = files.filter(file =>
            ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase())
        );

        audioFiles.forEach(file => {
            const filePath = path.join(folderPath, file);
            const albumArtPath = getAlbumArtPath(folderPath);
            originalPlaylist.push({ name: file, path: filePath, albumArt: albumArtPath });
        });

        playlist = [...originalPlaylist]; // Set the working playlist to the original
        displayPlaylist();
    }
};

// Function to check for common album art filenames in the folder
const getAlbumArtPath = (folderPath) => {
    const albumArtFiles = ['cover.jpg', 'cover.png', 'album.jpg', 'album.png'];
    for (const artFile of albumArtFiles) {
        const artPath = path.join(folderPath, artFile);
        if (fs.existsSync(artPath)) {
            return artPath;
        }
    }
    return null; // Return null if no album art is found
};

// Display the playlist in the UI
const displayPlaylist = () => {
    musicList.innerHTML = '';
    playlist.forEach((track, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = track.name;
        listItem.addEventListener('click', () => {
            playTrack(index);
        });
        musicList.appendChild(listItem);
    });
};

// Play a specific track
const playTrack = (index) => {
    if (index >= 0 && index < playlist.length) {
        currentIndex = index;
        const track = playlist[currentIndex];
        audioPlayer.src = track.path;
        audioPlayer.play();
        nowPlaying.textContent = `Now Playing: ${track.name}`;
        displayAlbumArt(track.albumArt); // Display album art if exists
    }
};

// Function to display album art
const displayAlbumArt = (artPath) => {
    albumArtContainer.innerHTML = ''; // Clear previous album art
    if (artPath) {
        const img = document.createElement('img');
        img.src = artPath;
        img.alt = 'Album Art';
        img.style.width = '150px'; // Set width of the album art
        img.style.height = '150px'; // Set height of the album art
        albumArtContainer.appendChild(img);
    } else {
        albumArtContainer.innerHTML = ''; // Clear if no album art
    }
};

// Play the next track
const playNext = () => {
    if (playlist.length > 0) {
        currentIndex = (currentIndex + 1) % playlist.length;
        playTrack(currentIndex);
    }
};

// Play the previous track
const playPrevious = () => {
    if (playlist.length > 0) {
        currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playTrack(currentIndex);
    }
};

// Toggle shuffle mode
const toggleShuffle = () => {
    if (shuffleEnabled) {
        // Shuffle Off: Reset to original playlist
        shuffleEnabled = false;
        shuffleButton.textContent = "Shuffle On";
        playlist = [...originalPlaylist]; // Reset playlist to the original order
        displayPlaylist(); // Update the UI
        currentIndex = 0; // Reset to the first track
        playTrack(currentIndex); // Play the first track
    } else {
        // Shuffle On: Shuffle the playlist
        shuffleEnabled = true;
        shuffleButton.textContent = "Shuffle Off";
        playlist = [...originalPlaylist]; // Copy the original playlist
        for (let i = playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
        }
        displayPlaylist(); // Update the UI
        currentIndex = 0; // Reset to the first track
        playTrack(currentIndex); // Play the first track
    }
};

// Toggle repeat mode
const toggleRepeat = () => {
    if (repeatEnabled) {
        // Repeat Off
        repeatEnabled = false;
        repeatButton.textContent = "Repeat Off";
        audioPlayer.loop = false;  // Disable repeat
    } else {
        // Repeat On
        repeatEnabled = true;
        repeatButton.textContent = "Repeat On";
        audioPlayer.loop = true;   // Enable repeat
    }
};

// Event Listeners
selectFolderButton.addEventListener('click', async () => {
    const folderPath = await ipcRenderer.invoke('select-folder');
    if (folderPath) {
        loadMusicFromFolder(folderPath);
    }
});

playButton.addEventListener('click', () => {
    if (audioPlayer.src) {
        audioPlayer.play();
    }
});

pauseButton.addEventListener('click', () => {
    if (audioPlayer.src) {
        audioPlayer.pause();
    }
});

nextButton.addEventListener('click', playNext);
previousButton.addEventListener('click', playPrevious);
shuffleButton.addEventListener('click', toggleShuffle);
repeatButton.addEventListener('click', toggleRepeat);

// Load remembered folders on startup
ipcRenderer.on('load-folders', (event, folders) => {
    folders.forEach(folderPath => {
        loadMusicFromFolder(folderPath);
    });
});
