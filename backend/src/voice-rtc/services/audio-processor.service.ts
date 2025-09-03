import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AudioProcessorService {
  private readonly bufferSize: number;
  private readonly sampleRate: number;
  private readonly logger = new Logger("AudioProcessorService");

  constructor(private configService: ConfigService) {
    this.bufferSize = this.configService.get("VOICE_BUFFER_SIZE", 4096);
    this.sampleRate = this.configService.get("AUDIO_SAMPLE_RATE", 16000);

    this.logger.log(
      `🔧 AudioProcessor initialized with buffer: ${this.bufferSize}, sample rate: ${this.sampleRate}Hz`
    );
  }

  processAudioBuffer(audioData: Float32Array): Buffer {
    this.logger.debug(
      `🎵 Processing audio buffer with ${audioData.length} samples`
    );

    // Convert Float32Array to Int16Array for better compression
    const int16Array = new Int16Array(audioData.length);
    let minValue = 0;
    let maxValue = 0;

    for (let i = 0; i < audioData.length; i++) {
      // Clamp values to [-1, 1] and convert to 16-bit integer
      const clampedValue = Math.max(-1, Math.min(1, audioData[i]));
      int16Array[i] = Math.floor(clampedValue * 32767);

      // Track min/max for debugging
      if (clampedValue < minValue) minValue = clampedValue;
      if (clampedValue > maxValue) maxValue = clampedValue;
    }

    const buffer = Buffer.from(int16Array.buffer);
    this.logger.debug(
      `📊 Processed audio - Range: ${minValue.toFixed(4)} to ${maxValue.toFixed(4)}, Output: ${buffer.length} bytes`
    );

    return buffer;
  }

  createWavHeader(
    dataLength: number,
    sampleRate: number = 16000,
    channels: number = 1
  ): Buffer {
    this.logger.debug(
      `📁 Creating WAV header - Data: ${dataLength} bytes, Sample rate: ${sampleRate}Hz, Channels: ${channels}`
    );

    const header = Buffer.alloc(44);
    const bytesPerSample = 2; // 16-bit
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    // RIFF header
    header.write("RIFF", 0, 4, "ascii");
    header.writeUInt32LE(36 + dataLength, 4);
    header.write("WAVE", 8, 4, "ascii");

    // fmt chunk
    header.write("fmt ", 12, 4, "ascii");
    header.writeUInt32LE(16, 16); // chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34); // bits per sample

    // data chunk
    header.write("data", 36, 4, "ascii");
    header.writeUInt32LE(dataLength, 40);

    this.logger.debug(
      `📁 WAV header created - Total size: ${header.length} bytes, Byte rate: ${byteRate}`
    );
    return header;
  }

  createWavFile(audioBuffer: Buffer, sampleRate: number = 16000): Buffer {
    this.logger.log(
      `🎵 Creating WAV file from ${audioBuffer.length} bytes of audio data`
    );

    const wavHeader = this.createWavHeader(audioBuffer.length, sampleRate);
    const wavFile = Buffer.concat([wavHeader, audioBuffer]);

    this.logger.log(
      `✅ WAV file created - Header: ${wavHeader.length} bytes, Data: ${audioBuffer.length} bytes, Total: ${wavFile.length} bytes`
    );

    // Log some file characteristics
    const durationSeconds = audioBuffer.length / (sampleRate * 2); // 16-bit = 2 bytes per sample
    this.logger.log(`⏱️ Audio duration: ${durationSeconds.toFixed(2)} seconds`);

    return wavFile;
  }

  detectSilence(audioData: Float32Array, threshold: number = 0.01): boolean {
    if (audioData.length === 0) {
      this.logger.debug("🤫 Empty audio data - considered silent");
      return true;
    }

    let sum = 0;
    let maxSample = 0;

    for (let i = 0; i < audioData.length; i++) {
      const abs = Math.abs(audioData[i]);
      sum += abs;
      if (abs > maxSample) maxSample = abs;
    }

    const average = sum / audioData.length;
    const isSilent = average < threshold;

    this.logger.debug(
      `🔊 Silence detection - Average: ${average.toFixed(4)}, Max: ${maxSample.toFixed(4)}, Threshold: ${threshold}, Silent: ${isSilent}`
    );

    return isSilent;
  }

  normalizeAudio(audioData: Float32Array): Float32Array {
    if (audioData.length === 0) {
      this.logger.debug("📏 Empty audio data for normalization");
      return audioData;
    }

    let max = 0;
    for (let i = 0; i < audioData.length; i++) {
      max = Math.max(max, Math.abs(audioData[i]));
    }

    if (max === 0) {
      this.logger.debug("📏 Audio normalization - All samples are zero");
      return audioData;
    }

    const normalizedData = new Float32Array(audioData.length);
    const scaleFactor = 1 / max;

    for (let i = 0; i < audioData.length; i++) {
      normalizedData[i] = audioData[i] * scaleFactor;
    }

    this.logger.debug(
      `📏 Audio normalized - Original max: ${max.toFixed(4)}, Scale factor: ${scaleFactor.toFixed(4)}`
    );

    return normalizedData;
  }

  // Utility method to analyze audio characteristics
  analyzeAudio(audioData: Float32Array): object {
    if (audioData.length === 0) {
      return { length: 0, average: 0, max: 0, min: 0, rms: 0 };
    }

    let sum = 0;
    let sumSquares = 0;
    let max = -Infinity;
    let min = Infinity;

    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      sum += sample;
      sumSquares += sample * sample;
      if (sample > max) max = sample;
      if (sample < min) min = sample;
    }

    const average = sum / audioData.length;
    const rms = Math.sqrt(sumSquares / audioData.length);

    const analysis = {
      length: audioData.length,
      average: parseFloat(average.toFixed(6)),
      max: parseFloat(max.toFixed(6)),
      min: parseFloat(min.toFixed(6)),
      rms: parseFloat(rms.toFixed(6)),
      duration: audioData.length / this.sampleRate,
    };

    this.logger.debug("📊 Audio analysis:", analysis);
    return analysis;
  }
}
