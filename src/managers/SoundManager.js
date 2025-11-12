export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.5;
        this.musicEnabled = false; // Start with music disabled
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
     * Start sinister background music from audio file or synthesized fallback
     */
    async startBackgroundMusic() {
        if (!this.musicEnabled || !this.audioContext || this.backgroundMusic) {
            return;
        }

        console.log('🎵 Starting background music...');

        // Try to load audio file first
        const audioFile = '/music/horror-ambient.mp3'; // Place your MP3 here
        
        try {
            const response = await fetch(audioFile);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                
                // Create audio source from file
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.loop = true;
                
                const gainNode = this.audioContext.createGain();
                gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
                
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                source.start(0);
                
                this.backgroundMusic = {
                    source,
                    gainNode
                };
                
                console.log('✅ Background music loaded from file');
                return;
            }
        } catch (error) {
            console.warn('Could not load audio file, using synthesized music:', error);
        }

        // Fallback to synthesized music if file not found
        this.startSynthesizedMusic();
    }

    /**
     * Synthesized music fallback
     */
    startSynthesizedMusic() {
        try {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            
            // ===== BASS CELLO (Deep bowed string) =====
            const celloOsc1 = ctx.createOscillator();
            const celloOsc2 = ctx.createOscillator();
            const celloOsc3 = ctx.createOscillator();
            const celloFilter = ctx.createBiquadFilter();
            const celloGain = ctx.createGain();
            
            // Cello harmonics: fundamental + overtones
            celloOsc1.type = 'sawtooth'; // Rich in harmonics
            celloOsc1.frequency.setValueAtTime(65.41, now); // C2
            celloOsc2.type = 'sawtooth';
            celloOsc2.frequency.setValueAtTime(65.41 * 2, now); // Octave
            celloOsc3.type = 'sine';
            celloOsc3.frequency.setValueAtTime(65.41 * 3, now); // 3rd harmonic
            
            // Simulate bowed string resonance
            celloFilter.type = 'bandpass';
            celloFilter.frequency.setValueAtTime(800, now);
            celloFilter.Q.setValueAtTime(2, now);
            
            celloOsc1.connect(celloFilter);
            celloOsc2.connect(celloFilter);
            celloOsc3.connect(celloFilter);
            celloFilter.connect(celloGain);
            celloGain.gain.setValueAtTime(0.15, now);
            
            // ===== PIPE ORGAN (Dark, sustained) =====
            const organOsc1 = ctx.createOscillator();
            const organOsc2 = ctx.createOscillator();
            const organOsc3 = ctx.createOscillator();
            const organFilter = ctx.createBiquadFilter();
            const organGain = ctx.createGain();
            
            // Organ pipes: multiple sine waves at specific intervals
            organOsc1.type = 'sine';
            organOsc1.frequency.setValueAtTime(87.31, now); // F2
            organOsc2.type = 'sine';
            organOsc2.frequency.setValueAtTime(87.31 * 2, now);
            organOsc3.type = 'sine';
            organOsc3.frequency.setValueAtTime(87.31 * 4, now);
            
            organFilter.type = 'lowpass';
            organFilter.frequency.setValueAtTime(1200, now);
            organFilter.Q.setValueAtTime(1, now);
            
            organOsc1.connect(organFilter);
            organOsc2.connect(organFilter);
            organOsc3.connect(organFilter);
            organFilter.connect(organGain);
            organGain.gain.setValueAtTime(0.12, now);
            
            // ===== TIMPANI (Low drum rumble) =====
            const timpaniBufferSize = ctx.sampleRate * 4;
            const timpaniBuffer = ctx.createBuffer(1, timpaniBufferSize, ctx.sampleRate);
            const timpaniData = timpaniBuffer.getChannelData(0);
            
            // Generate realistic drum texture
            for (let i = 0; i < timpaniBufferSize; i++) {
                const decay = Math.exp(-i / (ctx.sampleRate * 0.8));
                const noise = (Math.random() * 2 - 1) * 0.3;
                const tone = Math.sin(2 * Math.PI * 58 * i / ctx.sampleRate); // A#1
                timpaniData[i] = (tone * 0.7 + noise * 0.3) * decay;
            }
            
            const timpaniSource = ctx.createBufferSource();
            timpaniSource.buffer = timpaniBuffer;
            timpaniSource.loop = true;
            
            const timpaniFilter = ctx.createBiquadFilter();
            timpaniFilter.type = 'lowpass';
            timpaniFilter.frequency.setValueAtTime(120, now);
            timpaniFilter.Q.setValueAtTime(3, now);
            
            const timpaniGain = ctx.createGain();
            timpaniGain.gain.setValueAtTime(0.08, now);
            
            timpaniSource.connect(timpaniFilter);
            timpaniFilter.connect(timpaniGain);
            
            // ===== ETHEREAL CHOIR (Ghostly voices) =====
            const choirOsc1 = ctx.createOscillator();
            const choirOsc2 = ctx.createOscillator();
            const choirOsc3 = ctx.createOscillator();
            const choirFilter = ctx.createBiquadFilter();
            const choirGain = ctx.createGain();
            
            // Human voice-like formants
            choirOsc1.type = 'triangle';
            choirOsc1.frequency.setValueAtTime(196, now); // G3
            choirOsc2.type = 'sine';
            choirOsc2.frequency.setValueAtTime(196 * 1.5, now); // 5th
            choirOsc3.type = 'sine';
            choirOsc3.frequency.setValueAtTime(196 * 0.75, now); // Lower
            
            choirFilter.type = 'bandpass';
            choirFilter.frequency.setValueAtTime(900, now);
            choirFilter.Q.setValueAtTime(4, now);
            
            choirOsc1.connect(choirFilter);
            choirOsc2.connect(choirFilter);
            choirOsc3.connect(choirFilter);
            choirFilter.connect(choirGain);
            choirGain.gain.setValueAtTime(0.06, now);
            
            // ===== MASTER MIXING & REVERB =====
            const masterGain = ctx.createGain();
            const reverbGain = ctx.createGain();
            const compressor = ctx.createDynamicsCompressor();
            
            // Create convolution reverb for cathedral effect
            const reverbBuffer = ctx.createBuffer(2, ctx.sampleRate * 3, ctx.sampleRate);
            for (let channel = 0; channel < 2; channel++) {
                const data = reverbBuffer.getChannelData(channel);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 1.5));
                }
            }
            
            const reverb = ctx.createConvolver();
            reverb.buffer = reverbBuffer;
            reverbGain.gain.setValueAtTime(0.3, now);
            
            // Connect everything to master
            celloGain.connect(masterGain);
            organGain.connect(masterGain);
            timpaniGain.connect(masterGain);
            choirGain.connect(masterGain);
            
            masterGain.connect(reverb);
            reverb.connect(reverbGain);
            reverbGain.connect(compressor);
            
            masterGain.connect(compressor); // Dry signal
            compressor.connect(ctx.destination);
            
            // Set master volume
            masterGain.gain.setValueAtTime(this.volume * 0.2, now);
            
            // ===== MODULATION (Subtle vibrato and movement) =====
            const lfo1 = ctx.createOscillator();
            const lfo1Gain = ctx.createGain();
            lfo1.frequency.setValueAtTime(0.08, now); // Slow vibrato
            lfo1Gain.gain.setValueAtTime(3, now);
            lfo1.connect(lfo1Gain);
            lfo1Gain.connect(celloOsc1.frequency);
            
            const lfo2 = ctx.createOscillator();
            const lfo2Gain = ctx.createGain();
            lfo2.frequency.setValueAtTime(0.05, now); // Filter sweep
            lfo2Gain.gain.setValueAtTime(100, now);
            lfo2.connect(lfo2Gain);
            lfo2Gain.connect(celloFilter.frequency);
            
            const lfo3 = ctx.createOscillator();
            const lfo3Gain = ctx.createGain();
            lfo3.frequency.setValueAtTime(0.03, now); // Choir swell
            lfo3Gain.gain.setValueAtTime(0.02, now);
            lfo3.connect(lfo3Gain);
            lfo3Gain.connect(choirGain.gain);
            
            // Start all oscillators and sources
            celloOsc1.start(now);
            celloOsc2.start(now);
            celloOsc3.start(now);
            organOsc1.start(now);
            organOsc2.start(now);
            organOsc3.start(now);
            timpaniSource.start(now);
            choirOsc1.start(now);
            choirOsc2.start(now);
            choirOsc3.start(now);
            lfo1.start(now);
            lfo2.start(now);
            lfo3.start(now);
            
            // Store references for cleanup
            this.backgroundMusic = {
                oscillators: [
                    celloOsc1, celloOsc2, celloOsc3,
                    organOsc1, organOsc2, organOsc3,
                    choirOsc1, choirOsc2, choirOsc3,
                    lfo1, lfo2, lfo3
                ],
                sources: [timpaniSource],
                gainNode: masterGain
            };
            
            console.log('✅ Background music started (realistic instruments)');
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
                    // Stop file source if exists
                    if (this.backgroundMusic.source) {
                        try { this.backgroundMusic.source.stop(); } catch (e) { /* already stopped */ }
                    }
                    // Stop synthesized sources if exist
                    if (this.backgroundMusic.oscillators) {
                        this.backgroundMusic.oscillators.forEach(osc => {
                            try { osc.stop(); } catch (e) { /* already stopped */ }
                        });
                    }
                    if (this.backgroundMusic.sources) {
                        this.backgroundMusic.sources.forEach(src => {
                            try { src.stop(); } catch (e) { /* already stopped */ }
                        });
                    }
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

    /**
     * Check if background music is enabled
     */
    isMusicEnabled() {
        return this.musicEnabled;
    }
}

