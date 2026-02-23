import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder } from '../useVoiceRecorder';
import axios from 'axios';
import { toast } from 'react-toastify';

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('axios');
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));

// Mock MediaDevices and MediaRecorder
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
});

const mockMediaRecorderStart = vi.fn();
const mockMediaRecorderStop = vi.fn();

class MockMediaRecorder {
  ondataavailable: any = null;
  onstop: any = null;
  stream: any;

  constructor(stream: any) {
    this.stream = stream;
  }
  start() {
    mockMediaRecorderStart();
  }
  stop() {
    mockMediaRecorderStop();
    if (this.onstop) this.onstop();
  }
}

(window as any).MediaRecorder = MockMediaRecorder;

describe('useVoiceRecorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    (axios.post as any).mockResolvedValue({ data: { text: 'test transcription' } });
  });

  it('starts recording successfully', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockMediaRecorderStart).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });

  it('handles microphone access error', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(toast.error).toHaveBeenCalledWith('Could not access microphone');
    expect(result.current.isRecording).toBe(false);
  });

  it('stops recording and transcribes successfully', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    // Start
    await act(async () => {
      await result.current.startRecording();
    });

    // Stop & Transcribe
    let transcription: string | null = null;
    await act(async () => {
      transcription = await result.current.stopRecordingAndTranscribe();
    });

    expect(mockMediaRecorderStop).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/voice/transcribe',
      expect.any(FormData),
      expect.any(Object)
    );
    expect(transcription).toBe('test transcription');
    expect(result.current.isRecording).toBe(false);
  });
});
