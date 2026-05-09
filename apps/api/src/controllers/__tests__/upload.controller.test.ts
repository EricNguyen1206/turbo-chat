import { mockRequest, mockResponse } from '@/tests/helpers/mockExpress';

// Mock the S3 service module (default export singleton)
jest.mock('@/services/s3.service', () => ({
  __esModule: true,
  default: {
    getPresignedUrl: jest.fn(),
  },
}));

// Mock uuid to return a predictable value
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234'),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Import the mocked S3Service and the controller AFTER mocks
import S3Service from '@/services/s3.service';
import uploadController from '@/controllers/upload.controller';

describe('UploadController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // getPresignedUrl
  // ==========================================================================
  describe('getPresignedUrl', () => {
    it('should return 400 when filename is missing', async () => {
      const req = mockRequest({ body: { contentType: 'image/jpeg' } });
      const res = mockResponse();

      await uploadController.getPresignedUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Filename and content type are required',
      });
    });

    it('should return 400 when contentType is missing', async () => {
      const req = mockRequest({ body: { filename: 'test.jpg' } });
      const res = mockResponse();

      await uploadController.getPresignedUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Filename and content type are required',
      });
    });

    it('should return 400 when contentType is invalid', async () => {
      const req = mockRequest({ body: { filename: 'test.exe', contentType: 'application/exe' } });
      const res = mockResponse();

      await uploadController.getPresignedUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid content type',
      });
    });

    it('should return 200 with uploadUrl, publicUrl, and key on success', async () => {
      const mockResult = {
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        publicUrl: 'https://cdn.example.com/uploads/mock-uuid-1234.jpg',
      };
      (S3Service.getPresignedUrl as jest.Mock).mockResolvedValue(mockResult);

      const req = mockRequest({
        body: { filename: 'photo.jpg', contentType: 'image/jpeg' },
      });
      const res = mockResponse();

      await uploadController.getPresignedUrl(req, res);

      expect(S3Service.getPresignedUrl).toHaveBeenCalledWith(
        'uploads/mock-uuid-1234.jpg',
        'image/jpeg'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        publicUrl: 'https://cdn.example.com/uploads/mock-uuid-1234.jpg',
        key: 'uploads/mock-uuid-1234.jpg',
      });
    });

    it('should use custom folder when provided', async () => {
      const mockResult = {
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        publicUrl: 'https://cdn.example.com/avatars/mock-uuid-1234.png',
      };
      (S3Service.getPresignedUrl as jest.Mock).mockResolvedValue(mockResult);

      const req = mockRequest({
        body: { filename: 'avatar.png', contentType: 'image/png', folder: 'avatars' },
      });
      const res = mockResponse();

      await uploadController.getPresignedUrl(req, res);

      expect(S3Service.getPresignedUrl).toHaveBeenCalledWith(
        'avatars/mock-uuid-1234.png',
        'image/png'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept all valid content types', async () => {
      const validTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/webm',
      ];

      for (const contentType of validTypes) {
        (S3Service.getPresignedUrl as jest.Mock).mockResolvedValue({
          uploadUrl: 'url',
          publicUrl: 'public',
        });

        const req = mockRequest({ body: { filename: 'file.ext', contentType } });
        const res = mockResponse();

        await uploadController.getPresignedUrl(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
      }
    });

    it('should return 500 on S3 service error', async () => {
      (S3Service.getPresignedUrl as jest.Mock).mockRejectedValue(new Error('S3 down'));

      const req = mockRequest({
        body: { filename: 'photo.jpg', contentType: 'image/jpeg' },
      });
      const res = mockResponse();

      await uploadController.getPresignedUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error during upload preparation',
      });
    });
  });
});
