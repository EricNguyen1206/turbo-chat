import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecordingAndTranscribe = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current) {
        resolve(null);
        return;
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'voice.webm', { type: 'audio/webm' });

        // Stop all tracks
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
        mediaRecorder.current = null;
        setIsRecording(false);
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append('audio', file);

          // Assuming the token is handled by an interceptor or we need to pass it
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/v1/voice/transcribe', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });

          resolve(response.data.text);
        } catch (error) {
          console.error('Speech to text failed:', error);
          toast.error('Speech recognition failed');
          resolve(null);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.current.stop();
    });
  };

  return { isRecording, isTranscribing, startRecording, stopRecordingAndTranscribe };
}
