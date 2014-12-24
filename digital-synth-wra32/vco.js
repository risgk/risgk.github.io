var VCO = function() {
  const CYCLE_RESOLUTION  = 0x100000000;
  const MAX_OVERTONE      = 127;
  const SAMPLES_PER_CYCLE = 256;

  that = this;

  var generateWaveTable = function(waveTables, f) {
    for (var m = 0; m <= Math.floor((MAX_OVERTONE + 1) / 2) - 1; m++) {
      var waveTable = new Float64Array(SAMPLES_PER_CYCLE);
      for (var t = 0; t < SAMPLES_PER_CYCLE; t++) {
        var level = 0;
        for (var k = 1; k <= (m * 2) + 1; k++) {
          level += f(t, k);
        }
        waveTable[t] = level;
      }
      waveTables[m] = waveTable;
    }
  };

  this.waveTablesSawtooth = [];
  generateWaveTable(this.waveTablesSawtooth, function(t, k) {
    return (2 / Math.PI) * Math.sin((2 * Math.PI) * ((t + 0.5) / SAMPLES_PER_CYCLE) * k) / k;
  });

  this.waveTablesSquare = [];
  generateWaveTable(this.waveTablesSquare, function(t, k) {
    if (k % 2 == 1) {
      return (4 / Math.PI) * Math.sin((2 * Math.PI) * ((t + 0.5) / SAMPLES_PER_CYCLE) * k) / k;
    }
    return 0;
  });

  this.waveTablesTriangle = [];
  generateWaveTable(this.waveTablesTriangle, function(t, k) {
    if (k % 4 == 1) {
      return (8 / Math.pow(Math.PI, 2)) * Math.sin((2 * Math.PI) * ((t + 0.5) / SAMPLES_PER_CYCLE) * k) / Math.pow(k, 2);
    } else if (k % 4 == 3) {
      return (8 / Math.pow(Math.PI, 2)) * -Math.sin((2 * Math.PI) * ((t + 0.5) / SAMPLES_PER_CYCLE) * k) / Math.pow(k, 2);
    }
    return 0;
  });

  this.waveTablesSine = [];
  generateWaveTable(this.waveTablesSine, function(t, k) {
    if (k == 1) {
      return Math.sin((2 * Math.PI) * ((t + 0.5) / SAMPLES_PER_CYCLE));
    }
    return 0;
  });

  var generateWaveTableFFT = function(waveTables, originalWaveTable) {
    for (var m = 0; m <= Math.floor((MAX_OVERTONE + 1) / 2) - 1; m++) {
      var waveTable = new Float64Array(SAMPLES_PER_CYCLE);
      var w = ifft(lpf(fft(originalWaveTable), (m * 2) + 1));
      for (var t = 0; t < SAMPLES_PER_CYCLE; t++) {
        waveTable[t] = w[t];
      }
      waveTables[m] = waveTable;
    }
  };

  this.waveTablesPulse25 = [];
  this.originalPulse25 = [];
  for (var t = 0; t < SAMPLES_PER_CYCLE; t++) {
    this.originalPulse25[t] = (t + 0.5) < (SAMPLES_PER_CYCLE * 0.25) ? 1 : -1;
  }
  generateWaveTableFFT(this.waveTablesPulse25, this.originalPulse25);

  this.waveTablesPulse12 = [];
  this.originalPulse12 = [];
  for (var t = 0; t < SAMPLES_PER_CYCLE; t++) {
    this.originalPulse12[t] = (t + 0.5) < (SAMPLES_PER_CYCLE * 0.125) ? 1 : -1;
  }
  generateWaveTableFFT(this.waveTablesPulse12, this.originalPulse12);

  this.waveTablesPseudoTri = [];
  this.shortPseudoTri = [
    +1/16,  +3/16,  +5/16,  +7/16,  +9/16, +11/16, +13/16, +15/16,
   +15/16, +13/16, +11/16,  +9/16,  +7/16,  +5/16,  +3/16,  +1/16,
    -1/16,  -3/16,  -5/16,  -7/16,  -9/16, -11/16, -13/16, -15/16,
   -15/16, -13/16, -11/16,  -9/16,  -7/16,  -5/16,  -3/16,  -1/16,
  ];
  this.originalPseudoTri=[];
  for (var t = 0; t < SAMPLES_PER_CYCLE; t++) {
    var i = Math.floor((t + 0.5) / Math.floor(SAMPLES_PER_CYCLE / this.shortPseudoTri.length));
    this.originalPseudoTri[t] = this.shortPseudoTri[i];
  }
  generateWaveTableFFT(this.waveTablesPseudoTri, this.originalPseudoTri);

  this.freqTableC4toB4 = [];
  var generatefreqTable = function() {
    for (var i = 0; i <= 11; i++) {
      n = i + 60;
      cent = (n * 100) - 6900;
      hz = 440 * Math.pow(2, cent / 1200);
      that.freqTableC4toB4[i] = hz * CYCLE_RESOLUTION / SAMPLING_RATE;
    }
  }();

  this.resetPhase = function() {
    this.phase = 0;
  };

  this.setWaveform = function(waveform) {
    switch (waveform) {
    case SAWTOOTH:
      this.waveTables = this.waveTablesSawtooth;
      break;
    case SQUARE:
      this.waveTables = this.waveTablesSquare;
      break;
    case TRIANGLE:
      this.waveTables = this.waveTablesTriangle;
      break;
    case SINE:
      this.waveTables = this.waveTablesSine;
      break;
    case PULSE_25:
      this.waveTables = this.waveTablesPulse25;
      break;
    case PULSE_12:
      this.waveTables = this.waveTablesPulse12;
      break;
    case PSEUDO_TRI:
      this.waveTables = this.waveTablesPseudoTri;
      break;
    }
  };

  this.setCoarseTune = function(coarseTune) {
    this.courseTune = coarseTune;
    this.updateFreq();
  };

  this.coarseTune = function() {
    return this.courseTune;
  };

  this.setFineTune = function(fineTune) {
    this.fineTune = fineTune;
    this.updateFreq();
  };

  this.noteOn = function(noteNumber) {
    this.noteNumber = noteNumber;
    this.updateFreq();
  };

  this.clock = function() {
    this.phase += this.freq;
    if (this.phase >= CYCLE_RESOLUTION) {
      this.phase -= CYCLE_RESOLUTION;
    }
    var currIndex = Math.floor(this.phase / (CYCLE_RESOLUTION / SAMPLES_PER_CYCLE));
    var nextIndex = currIndex + 1;
    if (nextIndex >= SAMPLES_PER_CYCLE) {
      nextIndex -= SAMPLES_PER_CYCLE;
    }
    var waveTable = this.waveTables[Math.floor((this.overtone + 1) / 2) - 1];
    var currData = waveTable[currIndex];
    var nextData = waveTable[nextIndex];

    var level;
    var nextWeight = this.phase % (CYCLE_RESOLUTION / SAMPLES_PER_CYCLE);
    var currWeight = (CYCLE_RESOLUTION / SAMPLES_PER_CYCLE) - nextWeight;
    level = ((currData * currWeight) + (nextData * nextWeight)) / (CYCLE_RESOLUTION / SAMPLES_PER_CYCLE);

    return level;
  };

  this.updateFreq = function() {
    var noteNumber = this.noteNumber + this.courseTune - 64;
    var base = Math.floor(this.freqTableC4toB4[noteNumber % 12] *
                          Math.pow(2, (this.fineTune - 64) / 768) / 32) * 32;
    this.freq = base * Math.pow(2, Math.floor(noteNumber / 12) - 5);
    this.overtone = Math.floor((MAX_FREQ * CYCLE_RESOLUTION) / (this.freq * SAMPLING_RATE));
    if (this.overtone > MAX_OVERTONE) {
      this.overtone = MAX_OVERTONE;
    }
  };

  this.courseTune  = 64;
  this.fineTune    = 64;
  this.noteNumber  = 60;
  this.phase       = 0;
  this.freq        = 0;
  this.overtone    = 1;
  this.waveTables  = this.waveTablesSawtooth;
};
