import type {
  AttachmentResponse,
  AttachmentUploadResponse,
  CreateAttachmentRequest,
} from '@nezfocus/shared';

export type ImageFile = { uri: string; size: number; type: string };

// SRS 5.3 Upload: presigned URL → PUT the local file → complete. Errors: ApiError.
export interface AttachmentRepository {
  create(body: CreateAttachmentRequest): Promise<AttachmentUploadResponse>;
  // `onProgress`: 0…1 of the bytes sent (S-HOME-05 `uploading`); `signal` cancels (`x`).
  uploadFile(
    url: string,
    file: ImageFile,
    opts?: { onProgress?: (sent: number) => void; signal?: AbortSignal },
  ): Promise<void>;
  complete(id: string): Promise<AttachmentResponse>;
}
