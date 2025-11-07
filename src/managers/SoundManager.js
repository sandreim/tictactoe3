export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.5;
        this.musicEnabled = true;
        this.backgroundMusic = null;
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    // Resume audio context (required after user interaction)
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    // Metallic clang sound for making a move
    playMoveSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create oscillators for metallic sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Metallic frequencies
        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        
        osc2.frequency.setValueAtTime(1200, now);
        osc2.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        
        osc1.type = 'square';
        osc2.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(this.volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    }

    // Dramatic horror chord for winning
    playWinSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create a dramatic rising horror chord
        [220, 277, 330, 440].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            osc.frequency.setValueAtTime(freq * 0.5, now);
            osc.frequency.exponentialRampToValueAtTime(freq, now + 0.3);
            osc.type = 'sawtooth';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, now);
            filter.frequency.exponentialRampToValueAtTime(2000, now + 0.8);
            
            const delay = i * 0.05;
            gainNode.gain.setValueAtTime(0, now + delay);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, now + delay + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 1.2);
            
            osc.start(now + delay);
            osc.stop(now + delay + 1.2);
        });
    }

    // Dark, ominous sound for losing
    playLoseSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Deep descending horror sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.frequency.setValueAtTime(110, now);
        osc1.frequency.exponentialRampToValueAtTime(55, now + 1.5);
        
        osc2.frequency.setValueAtTime(165, now);
        osc2.frequency.exponentialRampToValueAtTime(82.5, now + 1.5);
        
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 1.5);
        filter.Q.setValueAtTime(5, now);
        
        gainNode.gain.setValueAtTime(this.volume * 0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.5);
        osc2.stop(now + 1.5);
    }

    // Eerie whisper-like sound for matchmaking
    playMatchmakingSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create white noise
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
        filter.Q.setValueAtTime(10, now);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(this.volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        noise.start(now);
        noise.stop(now + 0.5);
    }

    // Ticking clock with distortion for timeout warning
    playTimeoutWarning() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Sharp tick sound
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.01);
        osc.type = 'square';
        
        gainNode.gain.setValueAtTime(this.volume * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        osc.start(now);
        osc.stop(now + 0.05);
    }

    // Creepy ambient drone for game start
    playGameStartSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Low frequency rumble
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc1.frequency.setValueAtTime(55, now);
        osc2.frequency.setValueAtTime(58, now); // Slight dissonance
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2);
        osc2.stop(now + 2);
    }

    // Sharp notification sound for opponent's turn
    playOpponentTurnSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Create a sharp, attention-grabbing sound
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(660, now + 0.05);
        osc.frequency.linearRampToValueAtTime(440, now + 0.1);
        osc.type = 'triangle';
        
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(300, now);
        
        gainNode.gain.setValueAtTime(this.volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // Update background music volume if playing
        if (this.backgroundMusic && this.backgroundMusic.gainNode) {
            this.backgroundMusic.gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioContext.currentTime);
        }
    }

    toggleEnabled() {
        this.enabled = !this.enabled;
        
        // Stop background music if disabling all sounds
        if (!this.enabled && this.backgroundMusic) {
            this.stopBackgroundMusic();
        }
        
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    /**
     * Start sinister background music
     */
    startBackgroundMusic() {
        if (!this.musicEnabled || !this.audioContext || this.backgroundMusic) {
            return;
        }

        console.log('🎵 Starting background music...');

        try {
            // Create multiple oscillators for a complex, sinister drone
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            const osc3 = this.audioContext.createOscillator();
            const osc4 = this.audioContext.createOscillator();
            
            // Create noise for texture
            const bufferSize = this.audioContext.sampleRate * 2;
            const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.loop = true;
            
            // Filters for shaping the sound
            const filter1 = this.audioContext.createBiquadFilter();
            const filter2 = this.audioContext.createBiquadFilter();
            const noiseFilter = this.audioContext.createBiquadFilter();
            
            // Gain nodes for mixing
            const droneGain = this.audioContext.createGain();
            const noiseGain = this.audioContext.createGain();
            const masterGain = this.audioContext.createGain();
            
            // Configure oscillators - Deep, dissonant drones
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(55, this.audioContext.currentTime); // Deep bass A
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(58.27, this.audioContext.currentTime); // Slightly detuned for dissonance
            
            osc3.type = 'triangle';
            osc3.frequency.setValueAtTime(110, this.audioContext.currentTime); // One octave up
            
            osc4.type = 'sawtooth';
            osc4.frequency.setValueAtTime(73.42, this.audioContext.currentTime); // Tritone - the devil's interval
            
            // Configure filters - Dark, ominous tone
            filter1.type = 'lowpass';
            filter1.frequency.setValueAtTime(200, this.audioContext.currentTime);
            filter1.Q.setValueAtTime(5, this.audioContext.currentTime);
            
            filter2.type = 'bandpass';
            filter2.frequency.setValueAtTime(150, this.audioContext.currentTime);
            filter2.Q.setValueAtTime(8, this.audioContext.currentTime);
            
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(100, this.audioContext.currentTime);
            noiseFilter.Q.setValueAtTime(20, this.audioContext.currentTime);
            
            // Configure gains - Very subtle background
            droneGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            noiseGain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            masterGain.gain.setValueAtTime(this.volume * 0.15, this.audioContext.currentTime);
            
            // Connect the audio graph
            osc1.connect(filter1);
            osc2.connect(filter1);
            osc3.connect(filter2);
            osc4.connect(filter2);
            
            filter1.connect(droneGain);
            filter2.connect(droneGain);
            droneGain.connect(masterGain);
            
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            
            masterGain.connect(this.audioContext.destination);
            
            // Add slow modulation for eerie effect
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.setValueAtTime(0.05, this.audioContext.currentTime); // Very slow
            lfoGain.gain.setValueAtTime(2, this.audioContext.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(filter1.frequency);
            lfoGain.connect(filter2.frequency);
            
            // Start all sources
            osc1.start();
            osc2.start();
            osc3.start();
            osc4.start();
            noiseSource.start();
            lfo.start();
            
            // Store references for cleanup
            this.backgroundMusic = {
                oscillators: [osc1, osc2, osc3, osc4],
                noiseSource,
                lfo,
                gainNode: masterGain
            };
            
            console.log('✅ Background music started');
        } catch (error) {
            console.error('Error starting background music:', error);
        }
    }

    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (!this.backgroundMusic) {
            return;
        }

        console.log('🔇 Stopping background music...');

        try {
            // Fade out
            const now = this.audioContext.currentTime;
            this.backgroundMusic.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
            
            // Stop all sources after fade
            setTimeout(() => {
                if (this.backgroundMusic) {
                    this.backgroundMusic.oscillators.forEach(osc => {
                        try { osc.stop(); } catch (e) { /* already stopped */ }
                    });
                    try { this.backgroundMusic.noiseSource.stop(); } catch (e) { /* already stopped */ }
                    try { this.backgroundMusic.lfo.stop(); } catch (e) { /* already stopped */ }
                    this.backgroundMusic = null;
                }
            }, 1000);
            
            console.log('✅ Background music stopped');
        } catch (error) {
            console.error('Error stopping background music:', error);
            this.backgroundMusic = null;
        }
    }

    /**
     * Toggle background music on/off
     */
    toggleBackgroundMusic() {
        this.musicEnabled = !this.musicEnabled;
        
        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        
        return this.musicEnabled;
    }

    /**
     * Check if background music is playing
     */
    isMusicPlaying() {
        return this.backgroundMusic !== null;
    }
}

