// ============================================================
// EXOTEL AUDIO
// ============================================================
// Handles Gemini-to-Exotel audio conversion, buffering, playback,
// customer speech detection, and audio interruptions.
// ============================================================

// Resamples Gemini PCM16 audio from 24kHz to the Exotel stream rate.
class StreamingPcm16Resampler {
  constructor(
    inputSampleRate,
    outputSampleRate,
  ) {
    this.inputSampleRate =
      inputSampleRate;

    this.outputSampleRate =
      outputSampleRate;

    this.step =
      inputSampleRate /
      outputSampleRate;

    this.samples = [];
    this.position = 0;
  }

  // Converts a Gemini Base64 PCM16 chunk into the Exotel sample rate.
  process(base64Audio) {
    if (!base64Audio) {
      return null;
    }

    const inputBuffer =
      Buffer.from(
        base64Audio,
        "base64",
      );

    if (inputBuffer.length < 2) {
      return null;
    }

    const sampleCount =
      Math.floor(
        inputBuffer.length / 2,
      );

    for (
      let i = 0;
      i < sampleCount;
      i++
    ) {
      this.samples.push(
        inputBuffer.readInt16LE(
          i * 2,
        ),
      );
    }

    const output = [];

    while (
      this.position + 1 <
      this.samples.length
    ) {
      const index =
        Math.floor(
          this.position,
        );

      const fraction =
        this.position -
        index;

      const sample1 =
        this.samples[index];

      const sample2 =
        this.samples[index + 1];

      const value =
        sample1 +
        (sample2 - sample1) *
          fraction;

      output.push(
        Math.max(
          -32768,
          Math.min(
            32767,
            Math.round(value),
          ),
        ),
      );

      this.position +=
        this.step;
    }

    const discardCount =
      Math.max(
        0,
        Math.floor(
          this.position,
        ),
      );

    if (discardCount > 0) {
      this.samples.splice(
        0,
        discardCount,
      );

      this.position -=
        discardCount;
    }

    if (
      output.length === 0
    ) {
      return null;
    }

    const outputBuffer =
      Buffer.allocUnsafe(
        output.length * 2,
      );

    for (
      let i = 0;
      i < output.length;
      i++
    ) {
      outputBuffer.writeInt16LE(
        output[i],
        i * 2,
      );
    }

    return outputBuffer;
  }

  // Clears the resampler state.
  reset() {
    this.samples = [];
    this.position = 0;
  }
}

// Creates the audio functions used by the Exotel stream handler.
function createExotelAudio(
  ws,
  state,
  exotelClient,
  {
    onCustomerSpeech = null,
  } = {},
) {
  // Calculates RMS to detect customer speech.
  function calculateRmsFromBase64(
    base64Audio,
  ) {
    if (!base64Audio) {
      return 0;
    }

    let buffer;

    try {
      buffer =
        Buffer.from(
          base64Audio,
          "base64",
        );
    } catch {
      return 0;
    }

    if (buffer.length < 2) {
      return 0;
    }

    let sumSquares = 0;
    let sampleCount = 0;

    for (
      let i = 0;
      i + 1 < buffer.length;
      i += 2
    ) {
      const sample =
        buffer.readInt16LE(i);

      const normalized =
        sample / 32768;

      sumSquares +=
        normalized *
        normalized;

      sampleCount++;
    }

    if (sampleCount === 0) {
      return 0;
    }

    return Math.sqrt(
      sumSquares /
        sampleCount,
    );
  }

  // Updates Exotel audio settings and creates the matching resampler.
  function configureExotelMediaFormat(
    mediaFormat,
  ) {
    const nextSampleRate =
      Number(
        mediaFormat?.sample_rate ||
          mediaFormat?.sampleRate ||
          mediaFormat?.rate,
      );

    if (
      !Number.isFinite(
        nextSampleRate,
      ) ||
      nextSampleRate <= 0
    ) {
      return;
    }

    if (
      nextSampleRate ===
        state.exotelSampleRate &&
      state.geminiToExotelResampler
    ) {
      return;
    }

    state.exotelSampleRate =
      nextSampleRate;

    state.chunkSize =
      Math.max(
        Math.round(
          state.exotelSampleRate *
            0.1 *
            2,
        ),
        state.MIN_EXOTEL_CHUNK_BYTES,
      );

    state.playbackChunkDurationMs =
      (
        state.chunkSize /
        (
          state.exotelSampleRate *
          2
        )
      ) *
      1000;

    state.outputPcmBuffer =
      Buffer.alloc(0);

    state.geminiToExotelResampler =
      new StreamingPcm16Resampler(
        24000,
        state.exotelSampleRate,
      );

    console.log(
      "Exotel sample rate:",
      state.exotelSampleRate,
    );

    console.log(
      "Exotel chunk size:",
      state.chunkSize,
    );

    console.log(
      "Exotel playback chunk duration:",
      `${state.playbackChunkDurationMs.toFixed(1)} ms`,
    );
  }

  // Clears queued AI audio and resets playback state.
  function clearLocalAudio() {
    state.audioQueue = [];
    state.outputPcmBuffer =
      Buffer.alloc(0);

    state.pendingAudio = [];
    state.totalQueuedBytes = 0;
    state.aiCurrentlySpeaking =
      false;

    if (
      state.geminiToExotelResampler &&
      typeof state
        .geminiToExotelResampler
        .reset === "function"
    ) {
      state.geminiToExotelResampler.reset();
    }

    if (
      state.audioPlaybackTimer
    ) {
      clearTimeout(
        state.audioPlaybackTimer,
      );

      state.audioPlaybackTimer =
        null;
    }

    state.nextPlaybackAt = 0;
  }

  // Detects customer speech and triggers AI interruption when required.
  function handleCustomerSpeech(
    rms,
  ) {
    const now = Date.now();

    if (
      rms >=
      state.SPEECH_RMS_THRESHOLD
    ) {
      state.speechFrameCount++;

      if (
        state.speechFrameCount <
        state.REQUIRED_SPEECH_FRAMES
      ) {
        return;
      }

      state.speechFrameCount =
        0;

      // Report customer activity even when AI is silent.
      if (
        now -
          (
            state.lastCustomerSpeechDetectionTime ||
            0
          ) >=
        (
          state.CUSTOMER_SPEECH_COOLDOWN_MS ||
          700
        )
      ) {
        state.lastCustomerSpeechDetectionTime =
          now;

        if (onCustomerSpeech) {
          onCustomerSpeech();
        }
      }

      // No interruption is required when AI is not speaking.
      if (!state.aiCurrentlySpeaking) {
        return;
      }

      if (
        now -
          state.lastInterruptionTime <
        state.INTERRUPTION_COOLDOWN_MS
      ) {
        return;
      }

      if (
        state.interruptionTriggered
      ) {
        return;
      }

      state.lastInterruptionTime =
        now;

      state.interruptionTriggered =
        true;

      state.audioGeneration++;

      state.responseGeneration =
        state.audioGeneration;

      console.log("");
      console.log(
        "=================================",
      );

      console.log(
        "CUSTOMER INTERRUPTION",
      );

      console.log(
        "RMS:",
        rms.toFixed(4),
      );

      console.log(
        "Audio generation:",
        state.audioGeneration,
      );

      console.log(
        "=================================",
      );

      clearLocalAudio();

      exotelClient.clearExotelAudio();

      setTimeout(() => {
        state.interruptionTriggered =
          false;
      }, state.INTERRUPTION_COOLDOWN_MS);

      return;
    }

    state.speechFrameCount = 0;
  }

  // Sends queued audio to Exotel.
  function processAudioQueue() {
    if (
      ws.readyState !== ws.OPEN
    ) {
      clearLocalAudio();
      return;
    }

    if (state.callFinalized) {
      clearLocalAudio();
      return;
    }

    if (
      state.audioQueue.length === 0
    ) {
      state.aiCurrentlySpeaking =
        false;

      state.audioPlaybackTimer =
        null;

      return;
    }

    state.aiCurrentlySpeaking =
      true;

    const chunk =
      state.audioQueue.shift();

    state.totalQueuedBytes -=
      chunk.length;

    exotelClient.sendOneAudioChunk(
      chunk,
    );

    state.audioPlaybackTimer =
      setTimeout(
        processAudioQueue,
        state.playbackChunkDurationMs,
      );
  }

  // Starts playback when audio is available.
  function startAudioPlayback() {
    if (
      state.audioPlaybackTimer
    ) {
      return;
    }

    if (
      state.audioQueue.length ===
      0
    ) {
      return;
    }

    processAudioQueue();
  }

  // Resamples and queues Gemini audio for Exotel playback.
  function queueAudioForExotel(
    base64Audio,
    generation,
  ) {
    if (
      !base64Audio ||
      !state.geminiAudioEnabled ||
      state.callFinalized
    ) {
      return;
    }

    if (
      generation !==
      state.audioGeneration
    ) {
      return;
    }

    if (!state.streamSid) {
      state.pendingAudio.push({
        audio: base64Audio,
        generation,
      });

      return;
    }

    if (
      ws.readyState !== ws.OPEN
    ) {
      return;
    }

    let audioBuffer;

    try {
      if (
        !state.geminiToExotelResampler
      ) {
        state.geminiToExotelResampler =
          new StreamingPcm16Resampler(
            24000,
            state.exotelSampleRate,
          );
      }

      audioBuffer =
        state.geminiToExotelResampler.process(
          base64Audio,
        );
    } catch (error) {
      console.error(
        "Failed to resample Gemini audio:",
        error,
      );

      return;
    }

    if (
      !audioBuffer ||
      audioBuffer.length === 0
    ) {
      return;
    }

    state.outputPcmBuffer =
      Buffer.concat([
        state.outputPcmBuffer,
        audioBuffer,
      ]);

    while (
      state.outputPcmBuffer.length >=
      state.chunkSize
    ) {
      const chunk =
        Buffer.from(
          state.outputPcmBuffer.subarray(
            0,
            state.chunkSize,
          ),
        );

      state.outputPcmBuffer =
        state.outputPcmBuffer.subarray(
          state.chunkSize,
        );

      state.audioQueue.push(
        chunk,
      );

      state.totalQueuedBytes +=
        chunk.length;
    }

    state.aiCurrentlySpeaking =
      true;

    startAudioPlayback();
  }

  // Sends remaining partial Gemini audio.
  function flushPartialOutputAudio() {
    if (
      !state.outputPcmBuffer ||
      state.outputPcmBuffer.length ===
        0 ||
      !state.geminiAudioEnabled ||
      state.callFinalized
    ) {
      return;
    }

    const padded =
      Buffer.alloc(
        state.chunkSize,
      );

    state.outputPcmBuffer.copy(
      padded,
      0,
      0,
      Math.min(
        state.outputPcmBuffer.length,
        state.chunkSize,
      ),
    );

    state.outputPcmBuffer =
      Buffer.alloc(0);

    state.audioQueue.push(
      padded,
    );

    state.totalQueuedBytes +=
      padded.length;

    state.aiCurrentlySpeaking =
      true;

    startAudioPlayback();
  }

  // Moves audio received before Exotel is ready into playback.
  function flushPendingAudio() {
    if (!state.streamSid) {
      return;
    }

    if (
      state.pendingAudio.length ===
      0
    ) {
      return;
    }

    const buffered =
      state.pendingAudio;

    state.pendingAudio = [];

    for (
      const item of buffered
    ) {
      if (
        item.generation ===
        state.audioGeneration
      ) {
        queueAudioForExotel(
          item.audio,
          item.generation,
        );
      }
    }

    startAudioPlayback();
  }

  return {
    StreamingPcm16Resampler,
    calculateRmsFromBase64,
    configureExotelMediaFormat,
    clearLocalAudio,
    handleCustomerSpeech,
    processAudioQueue,
    startAudioPlayback,
    queueAudioForExotel,
    flushPartialOutputAudio,
    flushPendingAudio,
  };
}

module.exports = {
  StreamingPcm16Resampler,
  createExotelAudio,
};