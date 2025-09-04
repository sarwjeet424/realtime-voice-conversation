import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "./cache.service";

@Injectable()
export class AudioProcessorService {
  private readonly bufferSize: number;
  private readonly sampleRate: number;
  private readonly logger = new Logger("AudioProcessorService");

  constructor(
    private configService: ConfigService,
    private cacheService: CacheService
  ) {
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

  // Advanced audio processing methods
  async applyNoiseReduction(audioBuffer: Buffer): Promise<Buffer> {
    this.logger.log(`🔇 Applying noise reduction to ${audioBuffer.length} bytes`);
    
    // Simple noise reduction using spectral subtraction
    const audioData = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 4);
    const processedData = new Float32Array(audioData.length);
    
    const noiseFloor = 0.01; // Threshold for noise
    
    for (let i = 0; i < audioData.length; i++) {
      const sample = audioData[i];
      if (Math.abs(sample) < noiseFloor) {
        processedData[i] = sample * 0.1; // Reduce noise
      } else {
        processedData[i] = sample;
      }
    }
    
    return Buffer.from(processedData.buffer);
  }

  async applyEchoCancellation(audioBuffer: Buffer): Promise<Buffer> {
    this.logger.log(`🔄 Applying echo cancellation to ${audioBuffer.length} bytes`);
    
    // Simple echo cancellation using delay and subtraction
    const audioData = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 4);
    const processedData = new Float32Array(audioData.length);
    
    const delay = 100; // 100 samples delay
    const echoGain = 0.3;
    
    for (let i = 0; i < audioData.length; i++) {
      let sample = audioData[i];
      
      // Subtract delayed version to cancel echo
      if (i >= delay) {
        sample -= audioData[i - delay] * echoGain;
      }
      
      processedData[i] = sample;
    }
    
    return Buffer.from(processedData.buffer);
  }

  async enhanceAudio(audioBuffer: Buffer): Promise<Buffer> {
    this.logger.log(`✨ Enhancing audio quality for ${audioBuffer.length} bytes`);
    
    // Apply multiple enhancements
    let enhanced = await this.applyNoiseReduction(audioBuffer);
    enhanced = await this.applyEchoCancellation(enhanced);
    enhanced = await this.normalizeAudioBuffer(enhanced);
    
    return enhanced;
  }

  private async normalizeAudioBuffer(audioBuffer: Buffer): Promise<Buffer> {
    const audioData = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 4);
    const normalizedData = this.normalizeAudio(audioData);
    return Buffer.from(normalizedData.buffer);
  }

  async detectVoiceActivity(audioBuffer: Buffer): Promise<{ isVoice: boolean; confidence: number }> {
    const audioData = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 4);
    
    // Calculate energy and zero-crossing rate
    let energy = 0;
    let zeroCrossings = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      energy += audioData[i] * audioData[i];
      
      if (i > 0 && ((audioData[i] >= 0) !== (audioData[i - 1] >= 0))) {
        zeroCrossings++;
      }
    }
    
    const avgEnergy = energy / audioData.length;
    const zcr = zeroCrossings / audioData.length;
    
    // Voice activity detection based on energy and ZCR
    const isVoice = avgEnergy > 0.001 && zcr < 0.3;
    const confidence = Math.min(1, avgEnergy * 1000);
    
    this.logger.debug(`🎤 Voice activity: ${isVoice}, confidence: ${confidence.toFixed(3)}`);
    
    return { isVoice, confidence };
  }

  async extractAudioFeatures(audioBuffer: Buffer): Promise<{
    mfcc: number[];
    spectralCentroid: number;
    spectralRolloff: number;
    zeroCrossingRate: number;
  }> {
    const audioData = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 4);
    
    // Simplified feature extraction
    const mfcc = this.calculateMFCC(audioData);
    const spectralCentroid = this.calculateSpectralCentroid(audioData);
    const spectralRolloff = this.calculateSpectralRolloff(audioData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(audioData);
    
    return {
      mfcc,
      spectralCentroid,
      spectralRolloff,
      zeroCrossingRate,
    };
  }

  private calculateMFCC(audioData: Float32Array): number[] {
    // Simplified MFCC calculation
    const mfcc = [];
    const frameSize = 512;
    
    for (let i = 0; i < Math.min(13, Math.floor(audioData.length / frameSize)); i++) {
      const start = i * frameSize;
      const end = Math.min(start + frameSize, audioData.length);
      const frame = audioData.slice(start, end);
      
      // Simple energy calculation as MFCC approximation
      let energy = 0;
      for (let j = 0; j < frame.length; j++) {
        energy += frame[j] * frame[j];
      }
      mfcc.push(Math.log(energy + 1e-10));
    }
    
    return mfcc;
  }

  private calculateSpectralCentroid(audioData: Float32Array): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      const magnitude = Math.abs(audioData[i]);
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(audioData: Float32Array): number {
    const threshold = 0.85;
    let cumulativeEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      totalEnergy += audioData[i] * audioData[i];
    }
    
    for (let i = 0; i < audioData.length; i++) {
      cumulativeEnergy += audioData[i] * audioData[i];
      if (cumulativeEnergy >= threshold * totalEnergy) {
        return i / audioData.length;
      }
    }
    
    return 1;
  }

  private calculateZeroCrossingRate(audioData: Float32Array): number {
    let crossings = 0;
    
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings / (audioData.length - 1);
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
