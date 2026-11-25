
const backendUrl = (location.protocol === 'file:') ? 'http://127.0.0.1:3000' : location.origin;
(function () {
  var log = document.getElementById('chatLog');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var sendBtn = document.getElementById('chatSend');
  var clearBtn = document.getElementById('chatClear');
  var voiceBtn = document.getElementById('voiceBtn');
  var suggestionsEl = document.getElementById('suggestions');
  if (!log || !form || !input) return;

  var SETTINGS_KEY = 'blobby.settings';
  var DEFAULT_NAME = 'Blobby';

  function settings() {
    try {
      var s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return {
        name: (s.name || '').trim() || DEFAULT_NAME,
        prompt: (s.prompt || '').trim()
      };
    } catch (e) {
      return { name: DEFAULT_NAME, prompt: '' };
    }
  }

  var name = settings().name;

  var sessionId = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'session-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var moods = { neutral: 1, happy: 1, sad: 1, angry: 1, surprised: 1, wink: 1, sleepy: 1, silly: 1 };
  var busy = false;

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function addMessage(role, text) {
    var msg = document.createElement('div');
    msg.className = 'msg ' + role;
    var body = document.createElement('p');
    body.textContent = text;
    msg.appendChild(body);
    log.appendChild(msg);
    scrollDown();
    return msg;
  }

  function addTyping() {
    var msg = document.createElement('div');
    msg.className = 'msg bot typing-msg';
    msg.setAttribute('aria-label', name + ' is typing');
    var dots = document.createElement('span');
    dots.className = 'typing';
    dots.innerHTML = '<span></span><span></span><span></span>';
    msg.appendChild(dots);
    log.appendChild(msg);
    scrollDown();
    return msg;
  }

  function setBusy(value) {
    busy = value;
    input.disabled = value;
    sendBtn.disabled = value;
    if (!value && !voiceOn) input.focus();
  }

  async function sendMessage(message) {
    message = (message || '').trim();
    if (!message || busy) return;
    addMessage('user', message);
    if (suggestionsEl) suggestionsEl.hidden = true;
    var typing = addTyping();
    setBusy(true);
    stopListening();
    setVoiceStatus('Thinking…');
    setHeard('', false);

    try {
      var s = settings();
      var response = await fetch(`${backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
          name: s.name,
          systemPrompt: s.prompt
        }),
      });
      var data = await response.json().catch(function () { return {}; });
      typing.remove();

      if (!response.ok) {
        addMessage('bot', data.error || name + ' could not answer right now.');
        setVoiceStatus('Listening…');
        resumeVoice();
        return;
      }

      var reply = data.reply || '...';
      var mood = moods[data.mood] ? data.mood : 'neutral';
      addMessage('bot', reply);
      if (window.Blobby) {
        window.Blobby.setMood(mood);
        window.Blobby.speak(reply);
        window.Blobby.onSpeakEnd(function () {
          speaking = false;
          setVoiceStatus('Listening…');
          resumeVoice();
        });
        speaking = true;
        setVoiceStatus('Speaking…');
      } else {
        setVoiceStatus('Listening…');
        resumeVoice();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      typing.remove();
      addMessage('bot', name + ' is offline. Start the server with `npm start` and set `GROQ_API_KEY`.');
      setVoiceStatus('Listening…');
      resumeVoice();
    } finally {
      setBusy(false);
    }
  }

  /* ---------- voice chat ---------- */
  var SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
  var voiceOn = false;
  var speaking = false;
  var recog = null;
  var voiceSupported = !!SpeechRecognitionImpl;

  var overlay = document.getElementById('voiceOverlay');
  var statusEl = document.getElementById('voiceStatus');
  var heardEl = document.getElementById('voiceHeard');
  var endBtn = document.getElementById('voiceEnd');

  function setVoiceStatus(s) {
    if (statusEl) statusEl.textContent = s;
  }

  function setHeard(text, interim) {
    if (!heardEl) return;
    heardEl.textContent = text || '';
    heardEl.classList.toggle('interim', !!interim);
  }

  /* ---------- voice waveform ---------- */
  var waveEl = document.getElementById('voiceWave');
  var BARS = 28;
  var bars = [];
  var audioCtx = null;
  var analyser = null;
  var micStream = null;
  var freqData = null;
  var timeData = null;
  var waveRaf = 0;

  if (waveEl) {
    for (var bi = 0; bi < BARS; bi++) {
      var bar = document.createElement('i');
      waveEl.appendChild(bar);
      bars.push(bar);
    }
  }

  function setLevel(v) {
    if (overlay) overlay.style.setProperty('--lvl', Math.max(0, Math.min(1, v)).toFixed(3));
  }

  function waveLoop() {
    if (!voiceOn || !bars.length) return;
    var vals = new Array(BARS);
    var now = performance.now();
    var level = 0.08;

    if (speaking) {
      level = 0.5 + 0.28 * Math.sin(now / 240) + 0.1 * Math.sin(now / 95);
      for (var j = 0; j < BARS; j++) {
        vals[j] = 0.4 + 0.3 * Math.sin(now / 240 + j * 0.55) + 0.15 * Math.sin(now / 105 + j * 1.7);
      }
    } else if (analyser && freqData && timeData) {
      analyser.getByteTimeDomainData(timeData);
      var sum = 0;
      for (var ti = 0; ti < timeData.length; ti++) {
        var tv = (timeData[ti] - 128) / 128;
        sum += tv * tv;
      }
      var rms = Math.sqrt(sum / timeData.length);
      level = Math.min(1, Math.max(0, (rms - 0.012) * 9));
      analyser.getByteFrequencyData(freqData);
      var gate = 0.25 + level * 1.5;
      for (var i = 0; i < BARS; i++) {
        var idx = Math.floor(Math.pow(i / BARS, 1.7) * freqData.length * 0.75);
        vals[i] = Math.min(1, (freqData[idx] / 255) * gate);
      }
    } else {
      level = 0.1 + 0.05 * Math.sin(now / 700);
      for (var k = 0; k < BARS; k++) {
        vals[k] = 0.1 + 0.06 * Math.sin(now / 600 + k * 0.8);
      }
    }

    setLevel(level);
    for (var m = 0; m < BARS; m++) {
      var v = Math.max(0.05, Math.min(1, vals[m]));
      bars[m].style.height = (4 + v * 34) + 'px';
      bars[m].style.opacity = (0.3 + v * 0.7).toFixed(2);
    }
    waveRaf = requestAnimationFrame(waveLoop);
  }

  async function startWaveAudio() {
    if (!waveEl || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      var Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      var src = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      src.connect(analyser);
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
      waveLoop();
    } catch (e) {
      // Mic visualization unavailable; voice chat still works.
      analyser = null;
      freqData = null;
      waveLoop();
    }
  }

  function stopWaveAudio() {
    if (waveRaf) cancelAnimationFrame(waveRaf);
    waveRaf = 0;
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
    }
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) { }
      audioCtx = null;
    }
    analyser = null;
    freqData = null;
    timeData = null;
    setLevel(0);
    bars.forEach(function (b) {
      b.style.height = '4px';
      b.style.opacity = '0.35';
    });
  }

  function setVoiceUI(on) {
    voiceBtn.classList.toggle('on', on);
    voiceBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    voiceBtn.setAttribute('aria-label', on ? 'Stop voice chat' : 'Start voice chat');
  }

  function startListening() {
    if (!voiceSupported || !voiceOn || busy || speaking) return;
    stopListening();
    recog = new SpeechRecognitionImpl();
    recog.lang = navigator.language || 'en-US';
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = function (event) {
      var finalText = '';
      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim && !busy) {
        input.value = interim;
        setHeard(interim, true);
      }
      if (finalText.trim() && !busy) {
        input.value = '';
        setHeard(finalText, false);
        sendMessage(finalText);
      }
    };
    recog.onerror = function (event) {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        addMessage('bot', 'Microphone access was blocked. Allow mic permission and try again.');
        toggleVoice(false);
      }
    };
    recog.onend = function () {
      recog = null;
      resumeVoice();
    };
    try {
      recog.start();
    } catch (e) {
      recog = null;
    }
  }

  function stopListening() {
    if (recog) {
      try { recog.onend = null; recog.stop(); } catch (e) { }
      recog = null;
    }
  }

  function resumeVoice() {
    if (voiceOn && !busy && !speaking) {
      setTimeout(startListening, 250);
    }
  }

  function toggleVoice(force) {
    voiceOn = force !== undefined ? force : !voiceOn;
    setVoiceUI(voiceOn);
    if (voiceOn) {
      if (!voiceSupported) {
        addMessage('bot', 'Voice chat is not supported in this browser. Try Chrome or Edge.');
        voiceOn = false;
        setVoiceUI(false);
        return;
      }
      addMessage('bot', 'Voice chat on. Start talking to ' + name + '.');
      speaking = false;
      setVoiceStatus('Listening…');
      setHeard('', false);
      if (overlay) overlay.hidden = false;
      startWaveAudio();
      startListening();
    } else {
      speaking = false;
      stopListening();
      stopWaveAudio();
      if (overlay) overlay.hidden = true;
    }
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', function () { toggleVoice(); });
  }

  if (endBtn) {
    endBtn.addEventListener('click', function () { toggleVoice(false); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && voiceOn) toggleVoice(false);
  });

  /* ---------- starter suggestions ---------- */
  var SUGGESTIONS = [
    'Hi! How are you?',
    'What can you do?',
    'Tell me a joke',
    'Tell me about yourself',
    'Give me a fun fact'
  ];
  if (suggestionsEl) {
    SUGGESTIONS.forEach(function (text) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ghost suggest';
      b.textContent = text;
      b.addEventListener('click', function () {
        if (busy) return;
        sendMessage(text);
      });
      suggestionsEl.appendChild(b);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var message = input.value.trim();
    if (!message || busy) return;
    input.value = '';
    sendMessage(message);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', async function () {
      log.innerHTML = '';
      if (suggestionsEl) suggestionsEl.hidden = false;
      addMessage('bot', "Hi! I'm " + name + ". Ask me anything.");
      try {
        await fetch(`${backendUrl}/api/chat/clear`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId }),
        });
      } catch (error) {
        // The local chat was already cleared; server history will reset on next session.
      }
    });
  }

  input.placeholder = 'Say something to ' + name + '...';
  addMessage('bot', "Hi! I'm " + name + ". Ask me anything.");
  if (!voiceOn) input.focus();
})();
