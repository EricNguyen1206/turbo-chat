/**
 * Unit tests for S3Service (singleton)
 * @module services/__tests__/s3.service.test
 */

import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn().mockImplementation((input: any) => input),
    DeleteObjectCommand: jest.fn().mockImplementation((input: any) => input),
  };
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn(),
}));

const mockedGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
void (S3Client as jest.MockedClass<typeof S3Client>);

// Import after mocks are set up so the singleton uses the mocked client
// Set env vars before import so constructor reads correct values
process.env["AWS_REGION"] = "us-east-1";
process.env["AWS_ACCESS_KEY_ID"] = "test-access-key";
process.env["AWS_SECRET_ACCESS_KEY"] = "test-secret-key";
process.env["S3_BUCKET_NAME"] = "test-bucket";
process.env["S3_PUBLIC_URL"] = "https://cdn.example.com";

import s3Service from "../s3.service";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("S3Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env vars for consistent tests
    process.env["AWS_REGION"] = "us-east-1";
    process.env["AWS_ACCESS_KEY_ID"] = "test-access-key";
    process.env["AWS_SECRET_ACCESS_KEY"] = "test-secret-key";
    process.env["S3_BUCKET_NAME"] = "test-bucket";
    process.env["S3_PUBLIC_URL"] = "https://cdn.example.com";
    delete process.env["S3_URL"];
    delete process.env["S3_PUBLIC_URL_PREFIX"];
  });

  // -------------------------------------------------------------------------
  // getPresignedUrl
  // -------------------------------------------------------------------------
  describe("getPresignedUrl", () => {
    it("should generate a presigned URL and return uploadUrl, key, and publicUrl", async () => {
      mockedGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-upload-url");

      const result = await s3Service.getPresignedUrl("uploads/image.png", "image/png");

      expect(result).toEqual({
        uploadUrl: "https://s3.amazonaws.com/presigned-upload-url",
        key: "uploads/image.png",
        publicUrl: "https://cdn.example.com/uploads/image.png",
      });
      expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("should use the provided expiresIn value", async () => {
      mockedGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-url");

      await s3Service.getPresignedUrl("uploads/file.pdf", "application/pdf", 7200);

      // getSignedUrl is called with (client, command, { expiresIn })
      const callArgs = mockedGetSignedUrl.mock.calls[0]!;
      expect(callArgs[2]).toEqual({ expiresIn: 7200 });
    });

    it("should default expiresIn to 3600 when not provided", async () => {
      mockedGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-url");

      await s3Service.getPresignedUrl("uploads/file.txt", "text/plain");

      const callArgs = mockedGetSignedUrl.mock.calls[0]!;
      expect(callArgs[2]).toEqual({ expiresIn: 3600 });
    });

    it("should strip leading slash from key when building publicUrl", async () => {
      mockedGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-url");

      const result = await s3Service.getPresignedUrl("/uploads/image.png", "image/png");

      expect(result.publicUrl).toBe("https://cdn.example.com/uploads/image.png");
    });

    it("should use S3_PUBLIC_URL_PREFIX when S3_PUBLIC_URL is not set", async () => {
      delete process.env["S3_PUBLIC_URL"];
      process.env["S3_PUBLIC_URL_PREFIX"] = "https://assets.example.com/";

      // Re-instantiate by reimporting — but since it's a singleton, we test
      // the public URL logic directly via the result. The singleton was created
      // once, so we need to verify the env-based logic. Since the env is checked
      // at getPresignedUrl time, let's just check the publicUrl.
      // Actually, looking at the source, S3_PUBLIC_URL is checked at call time.
      // We need to re-import to pick up env changes... but singleton pattern
      // means we can't easily re-instantiate. The public URL is built in getPresignedUrl
      // so env changes at call time ARE reflected.
      mockedGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-url");

      const result = await s3Service.getPresignedUrl("uploads/doc.pdf", "application/pdf");

      // Note: the singleton reads S3_PUBLIC_URL from env at call time
      // but the bucket and endpoint were read at construction time.
      // For public URL, it reads env vars at call time.
      expect(result.publicUrl).toBe("https://assets.example.com/uploads/doc.pdf");
    });

    it("should use S3_URL endpoint as fallback when no public URL config exists", async () => {
      delete process.env["S3_PUBLIC_URL"];
      delete process.env["S3_PUBLIC_URL_PREFIX"];
      process.env["S3_URL"] = "https://minio.example.com";

      mockedGetSignedUrl.mockResolvedValue("https://s3.amazonaws.com/presigned-url");

      const result = await s3Service.getPresignedUrl("uploads/file.txt", "text/plain");

      expect(result.publicUrl).toContain("minio.example.com");
      expect(result.publicUrl).toContain("test-bucket");
    });

    it("should throw error when getSignedUrl fails", async () => {
      mockedGetSignedUrl.mockRejectedValue(new Error("AWS error"));

      await expect(
        s3Service.getPresignedUrl("uploads/image.png", "image/png")
      ).rejects.toThrow("Failed to generate upload URL");
    });
  });

  // -------------------------------------------------------------------------
  // deleteFile
  // -------------------------------------------------------------------------
  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      mockSend.mockResolvedValue({});

      await s3Service.deleteFile("uploads/image.png");

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("should catch and swallow errors silently", async () => {
      mockSend.mockRejectedValue(new Error("Delete failed"));

      // Should not throw
      await expect(s3Service.deleteFile("uploads/missing.png")).resolves.toBeUndefined();
    });
  });
});
