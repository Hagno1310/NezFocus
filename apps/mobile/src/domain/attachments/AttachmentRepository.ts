import type {
  AttachmentResponse,
  AttachmentUploadResponse,
  CreateAttachmentRequest,
} from '@nezfocus/shared';

export type ImageFile = { uri: string; size: number; type: string };

// SRS 5.3 Upload: presigned URL → PUT the local file → complete. Errors: ApiError.
export interface AttachmentRepository {
  create(body: CreateAttachmentRequest): Promise<AttachmentUploadResponse>;
  uploadFile(url: string, file: ImageFile): Promise<void>;
  complete(id: string): Promise<AttachmentResponse>;
}
