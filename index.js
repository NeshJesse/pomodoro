// Pomodoro Timer Application
        // Timer state management
        let timerState = {
            isRunning: false,
            isPaused: false,
            totalSeconds: 1500, // 25 minutes default
            remainingSeconds: 1500,
            intervalId: null,
            configuredMinutes: 25
        };

        // Audio management
        let audioContext = null;
        let audioBuffer = null;
        let audioInitialized = false;
        let audioPermissionGranted = false;

        // DOM elements
        const minutesInput = document.getElementById('minutesInput');
        const timerDisplay = document.getElementById('timerDisplay');
        const startPauseBtn = document.getElementById('startPauseBtn');
        const statusMessage = document.getElementById('statusMessage');
        const audioPermissionPrompt = document.getElementById('audioPermissionPrompt');

        // Initialize app
        window.addEventListener('load', () => {
            initializeApp();
        });

        function initializeApp() {
            // Set default values
            minutesInput.value = timerState.configuredMinutes;
            updateDisplay();
            
            // Add input listeners
            minutesInput.addEventListener('input', handleMinutesInput);
            minutesInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    updateTimerFromInput();
                }
            });

            // Check if we need to show audio permission prompt
            checkAudioPermissions();

            // Handle page visibility changes for background timing
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        async function checkAudioPermissions() {
            try {
                // Check if we can create audio context
                const testContext = new (window.AudioContext || window.webkitAudioContext)();
                if (testContext.state === 'suspended') {
                    showAudioPermissionPrompt();
                } else {
                    audioPermissionGranted = true;
                }
                testContext.close();
            } catch (error) {
                console.warn('Audio context not available:', error);
                showStatus('Audio notifications may not work in this browser', 'warning');
            }
        }

        function showAudioPermissionPrompt() {
            audioPermissionPrompt.classList.remove('hidden');
        }

        async function initializeAudio() {
            try {
                // Create audio context with user gesture
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }

                // Generate a simple notification sound (beep)
                await generateNotificationSound();
                
                audioInitialized = true;
                audioPermissionGranted = true;
                audioPermissionPrompt.classList.add('hidden');
                
                showStatus('✅ Audio notifications enabled successfully!', 'success');
                
                // Auto-hide success message after 3 seconds
                setTimeout(() => {
                    hideStatus();
                }, 3000);

            } catch (error) {
                console.error('Failed to initialize audio:', error);
                showStatus('⚠️ Could not enable audio notifications. Timer will still work visually.', 'warning');
            }
        }

        async function generateNotificationSound() {
            const sampleRate = audioContext.sampleRate;
            const duration = 0.5; // 500ms
            const bufferLength = sampleRate * duration;
            
            audioBuffer = audioContext.createBuffer(1, bufferLength, sampleRate);
            const channelData = audioBuffer.getChannelData(0);
            
            // Generate a pleasant chime sound (multiple sine waves)
            for (let i = 0; i < bufferLength; i++) {
                const time = i / sampleRate;
                const envelope = Math.exp(-time * 3); // Decay envelope
                
                // Multiple harmonics for a richer sound
                let sample = 0;
                sample += Math.sin(2 * Math.PI * 800 * time) * 0.5; // Main tone
                sample += Math.sin(2 * Math.PI * 1200 * time) * 0.3; // Higher harmonic
                sample += Math.sin(2 * Math.PI * 600 * time) * 0.2; // Lower harmonic
                
                channelData[i] = sample * envelope * 0.3; // Overall volume
            }
        }

        function playNotificationSound() {
            if (!audioInitialized || !audioBuffer || !audioContext) {
                console.warn('Audio not initialized, cannot play notification');
                return;
            }

            try {
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
                
                console.log('Notification sound played successfully');
            } catch (error) {
                console.error('Failed to play notification sound:', error);
            }
        }

        function handleMinutesInput() {
            if (!timerState.isRunning) {
                updateTimerFromInput();
            }
        }

        function updateTimerFromInput() {
            const minutes = parseInt(minutesInput.value);
            
            if (isNaN(minutes) || minutes < 1 || minutes > 999) {
                showStatus('Please enter a valid number between 1 and 999 minutes', 'error');
                return;
            }

            timerState.configuredMinutes = minutes;
            timerState.totalSeconds = minutes * 60;
            timerState.remainingSeconds = minutes * 60;
            updateDisplay();
            hideStatus();
        }

        function toggleTimer() {
            if (!audioPermissionGranted && !audioInitialized) {
                showAudioPermissionPrompt();
                showStatus('Please enable audio notifications first for the best experience', 'warning');
                return;
            }

            if (timerState.isRunning) {
                pauseTimer();
            } else {
                startTimer();
            }
        }

        function startTimer() {
            // Ensure we have valid input
            updateTimerFromInput();
            
            if (timerState.remainingSeconds <= 0) {
                showStatus('Please set a valid timer duration', 'error');
                return;
            }

            timerState.isRunning = true;
            timerState.isPaused = false;
            startPauseBtn.textContent = 'Pause';
            minutesInput.disabled = true;

            // Store start time for accurate background timing
            timerState.startTime = Date.now();
            timerState.expectedEndTime = timerState.startTime + (timerState.remainingSeconds * 1000);

            // Start the interval
            timerState.intervalId = setInterval(updateTimer, 100); // Update every 100ms for smooth display

            hideStatus();
        }

        function pauseTimer() {
            timerState.isRunning = false;
            timerState.isPaused = true;
            startPauseBtn.textContent = 'Resume';
            
            if (timerState.intervalId) {
                clearInterval(timerState.intervalId);
                timerState.intervalId = null;
            }
        }

        function updateTimer() {
            if (!timerState.isRunning) return;

            // Calculate remaining time based on actual elapsed time (more accurate for background tabs)
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - timerState.startTime) / 1000);
            timerState.remainingSeconds = Math.max(0, timerState.totalSeconds - elapsedSeconds);

            updateDisplay();

            if (timerState.remainingSeconds <= 0) {
                completeTimer();
            }
        }

        function completeTimer() {
            // Stop the timer
            timerState.isRunning = false;
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;

            // Reset UI
            startPauseBtn.textContent = 'Start';
            minutesInput.disabled = false;

            // Visual feedback
            timerDisplay.classList.add('timer-completed');
            setTimeout(() => {
                timerDisplay.classList.remove('timer-completed');
            }, 3000);

            // Play notification sound
            playNotificationSound();

            // Reset timer to original configured time
            timerState.remainingSeconds = timerState.totalSeconds;
            updateDisplay();

            // Show completion message
            showStatus('🎉 Timer completed! Starting a new session...', 'success');

            // Focus the window if possible (limited by browser security)
            if (window.focus) {
                window.focus();
            }
        }

        function updateDisplay() {
            const minutes = Math.floor(timerState.remainingSeconds / 60);
            const seconds = timerState.remainingSeconds % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            timerDisplay.textContent = timeString;
            
            // Update page title for background visibility
            document.title = timerState.isRunning ? `${timeString} - Pomodoro` : 'Pomodoro Timer';
        }

        function handleVisibilityChange() {
            if (document.hidden && timerState.isRunning) {
                // Tab became hidden, store the current state
                console.log('Tab hidden, timer continues in background');
            } else if (!document.hidden && timerState.isRunning) {
                // Tab became visible, sync the timer
                console.log('Tab visible, syncing timer');
                // The updateTimer function already handles this with actual elapsed time
            }
        }

        function showStatus(message, type = 'info') {
            statusMessage.textContent = message;
            statusMessage.className = `status-message status-${type}`;
            statusMessage.classList.remove('hidden');
        }

        function hideStatus() {
            statusMessage.classList.add('hidden');
        }

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target !== minutesInput) {
                e.preventDefault();
                toggleTimer();
            }
        });

        // Handle browser refresh/close
        window.addEventListener('beforeunload', (e) => {
            if (timerState.isRunning) {
                e.preventDefault();
                e.returnValue = 'Timer is running. Are you sure you want to leave?';
            }
        });
