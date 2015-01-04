// refs http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
// Cookbook formulae for audio EQ biquad filter coefficients
// by Robert Bristow-Johnson

var VCF = function() {
  this.setCutoffFrequency = function(cutoffFrequency) {
    this.cutoffFrequency = cutoffFrequency;
  };

  this.setResonance = function(resonance) {
    this.resonance = resonance;
  };

  this.setEnvelopeAmount = function(envelopeAmount) {
    this.envelopeAmount = envelopeAmount;
  };

  this.setKeyFollow = function(keyFollow) {
    this.keyFollow = keyFollow;
  };

  this.noteOn = function(noteNumber) {
    this.noteNumber = noteNumber;
  };

  this.clock = function(a, k) {
    var c = this.cutoffFrequency + (this.envelopeAmount * k)
                                 + (this.noteNumber - 60) * (this.keyFollow / 127);
    if (c > 127) {
      c = 127
    } else if (c < 0) {
      c = 0
    }
    var q = Math.pow(Math.sqrt(2), (this.resonance - (127 / 5)) / (127 / 5));

    var f0OverFs = (MAX_FREQ * Math.pow(2, ((c - 127) / 12))) / SAMPLING_RATE;
    var w0 = 2 * Math.PI * f0OverFs;
    var alpha = Math.sin(w0) / (2 * q);

    var b1 = 1 - Math.cos(w0);
    var b2 = (1 - Math.cos(w0)) / 2;
    var a0 = 1 + alpha;
    var a1 = -2 * Math.cos(w0);
    var a2 = 1 - alpha;

    var b1OverA0 = b1 / a0;
    var b2OverA0 = b2 / a0;
    var a1OverA0 = a1 / a0;
    var a2OverA0 = a2 / a0;

    var x0 = a;
    var y0 = (b2OverA0 * x0) + (b1OverA0 * this.x1) + (b2OverA0 * this.x2)
                             - (a1OverA0 * this.y1) - (a2OverA0 * this.y2);
    this.x2 = this.x1;
    this.y2 = this.y1;
    this.x1 = x0;
    this.y1 = y0;

    return y0;
  };

  this.cutoffFrequency = 120;
  this.resonance       = 0;
  this.envelopeAmount  = 0;
  this.keyFollow       = 0;
  this.noteNumber      = 60;
  this.x1              = 0;
  this.x2              = 0;
  this.y1              = 0;
  this.y2              = 0;
};
