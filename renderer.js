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
const searchBar = document.getElementById('searchBar');
const searchResults = document.getElementById('searchResults');
const searchButton = document.getElementById('searchButton');

// Additional UI for album art
const albumArtContainer = document.createElement('div');
albumArtContainer.id = 'albumArt';
document.body.appendChild(albumArtContainer); // Add album art container to body

let originalPlaylist = []; // To store the original loaded playlist
let playlist = [];         // Current working playlist (shuffled or original)
let currentIndex = -1;     // Index of the currently playing track
let shuffleEnabled = false; // Toggle state for shuffle
let repeatEnabled = false;  // Toggle state for repeat
let isPlaying = false;  // track playing state

// Load music from a folder
const loadMusicFromFolder = (folderPath) => {
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        const audioFiles = files.filter(file =>
            ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase())
        );

        // Clear existing playlist
        originalPlaylist = [];

        audioFiles.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            const albumArtPath = getAlbumArtPath(folderPath);

            originalPlaylist.push({
                name: file,
                path: filePath,
                albumArt: albumArtPath,
                dateAdded: stats.birthtime || stats.mtime, // Use creation time or modification time as fallback
                dateAddedTimestamp: (stats.birthtime || stats.mtime).getTime() // For sorting
            });
        });

        // Sort the playlist by date added (newest first)
        sortPlaylistByDate();
        displayPlaylist();
    }
};

// New function to sort playlist by date
const sortPlaylistByDate = () => {
    originalPlaylist.sort((a, b) => b.dateAddedTimestamp - a.dateAddedTimestamp);
    playlist = [...originalPlaylist];
};


// Function to search and display all matching songs
const displaySearchResults = (term) => {
    const results = playlist.filter(track =>
        track.name.toLowerCase().includes(term.toLowerCase())
    );

    searchResults.innerHTML = ''; // Clear previous results

    if (results.length === 0) {
        const noResultsItem = document.createElement('li');
        noResultsItem.textContent = 'No matching songs found.';
        searchResults.appendChild(noResultsItem);
    } else {
        results.forEach((track) => {
            const resultItem = document.createElement('li');
            resultItem.textContent = track.name;
            resultItem.addEventListener('click', () => {
                playTrack(originalPlaylist.findIndex(t => t.path === track.path));
                searchResults.innerHTML = ''; // Clear results after selection
            });
            searchResults.appendChild(resultItem);
        });
    }
};

// Add click listener for the search button
searchButton.addEventListener('click', () => {
    const searchTerm = searchBar.value.trim();
    displaySearchResults(searchTerm);
});

// Filter playlist based on the search term and display top 5 results
const searchSongs = (term) => {
    const results = playlist.filter(track =>
        track.name.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 5); // Top 5 results

    searchResults.innerHTML = ''; // Clear previous results

    results.forEach((track, index) => {
        const resultItem = document.createElement('li');
        resultItem.textContent = track.name;
        resultItem.addEventListener('click', () => {
            playTrack(originalPlaylist.findIndex(t => t.path === track.path));
            searchResults.innerHTML = ''; // Clear dropdown after selection
        });
        searchResults.appendChild(resultItem);
    });

    if (!term) {
        searchResults.innerHTML = ''; // Clear dropdown if search is empty
    }
};

// Attach input listener to the search bar
searchBar.addEventListener('input', (e) => {
    searchSongs(e.target.value);
});
// Function to check for common album art filenames in the folder
const getAlbumArtPath = (folderPath) => {
    try {
        const albumArtFiles = ['cover.jpg', 'cover.png', 'album.jpg', 'album.png'];
        for (const artFile of albumArtFiles) {
            const artPath = path.join(folderPath, artFile);
            if (fs.existsSync(artPath)) {
                return artPath;
            }
        }
    } catch (error) {
        console.error('Error processing album art:', error);
    }
    return null; // Return null if no valid album art is found
};

// Display the playlist in the UI
const displayPlaylist = () => {
    musicList.innerHTML = '';
    playlist.forEach((track, index) => {
        const listItem = document.createElement('li');
        const dateStr = track.dateAdded.toLocaleDateString() + ' ' +
            track.dateAdded.toLocaleTimeString();

        // Create a container for better layout
        listItem.innerHTML = `
            <div class="track-info">
                <span class="track-name">${track.name}</span>
            </div>
        `;

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
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                playButton.textContent = "Pause";
                nowPlaying.textContent = `Now Playing: ${track.name}`;
                displayAlbumArt(track.albumArt);
            })
            .catch(error => {
                console.error('Error playing track:', error);
            });
    }
};


// Handle track completion
audioPlayer.addEventListener('ended', () => {
    if (repeatEnabled) {
        // If repeat is enabled, replay the current track
        playTrack(currentIndex);
    } else if (currentIndex < playlist.length - 1) {
        // If there are more tracks, play the next one
        playTrack(currentIndex + 1);
    } else if (currentIndex === playlist.length - 1) {
        // If it's the last track
        if (shuffleEnabled) {
            // If shuffle is enabled, reshuffle and start from beginning
            toggleShuffle();
            playTrack(0);
        } else {
            // Stop playing and reset
            isPlaying = false;
            playButton.textContent = "Play";
            currentIndex = -1;
            audioPlayer.src = '';
            nowPlaying.textContent = 'Playlist finished';
        }
    }
});
// Play button functionality
playButton.addEventListener('click', () => {
    if (!isPlaying) {
        if (currentIndex === -1 && playlist.length > 0) {
            // Start playing from the beginning if no track is selected
            playTrack(0);
        } else if (audioPlayer.src) {
            // Resume current track
            audioPlayer.play();
            isPlaying = true;
            playButton.textContent = "Pause";
        }
    } else {
        // Pause current track
        audioPlayer.pause();
        isPlaying = false;
        playButton.textContent = "Play";
    }
});

// Display album art with proper styling
const displayAlbumArt = (artPath) => {
    albumArtContainer.innerHTML = '';
    if (artPath) {
        const img = document.createElement('img');
        img.src = artPath;
        img.alt = 'Album Art';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '12px';
        albumArtContainer.appendChild(img);
    }
};

// Modified pause button functionality
pauseButton.addEventListener('click', () => {
    if (audioPlayer.src) {
        audioPlayer.pause();
        isPlaying = false;
        playButton.textContent = "Play";
    }
});

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
        // Shuffle Off: Reset to original date-sorted playlist
        shuffleEnabled = false;
        shuffleButton.textContent = "Shuffle On";
        playlist = [...originalPlaylist]; // Reset to the date-sorted order
        displayPlaylist();
        currentIndex = 0;
        playTrack(currentIndex);
    } else {
        // Shuffle On: Shuffle the playlist
        shuffleEnabled = true;
        shuffleButton.textContent = "Shuffle Off";
        playlist = [...originalPlaylist];
        for (let i = playlist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
        }
        displayPlaylist();
        currentIndex = 0;
        playTrack(currentIndex);
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

// const style = document.createElement('style');
// style.textContent = `
//     #musicList li {
//         padding: 10px;
//         border-bottom: 1px solid #eee;
//         cursor: pointer;
//     }
//
//     .track-info {
//         display: flex;
//         justify-content: space-between;
//         align-items: center;
//     }
//
//     .track-name {
//         flex: 1;
//         margin-right: 15px;
//     }
//
//     .track-date {
//         font-size: 0.85em;
//         color: #666;
//     }
//
//     #musicList li:hover {
//         background-color: #f5f5f5;
//     }
// `;
// document.head.appendChild(style);
