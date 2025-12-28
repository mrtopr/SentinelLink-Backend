import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

/**
 * Configure Cloudinary SDK with environment credentials
 */
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer to upload
 * @param folder - Cloudinary folder for organization
 * @returns Promise with upload result containing secure_url
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    folder: string = 'incidents'
): Promise<{ secure_url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `anginat/${folder}`,
                resource_type: 'auto',
                allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'webp'],
                max_bytes: 10 * 1024 * 1024, // 10MB limit
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else if (result) {
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    });
                } else {
                    reject(new Error('Cloudinary upload returned no result'));
                }
            }
        );

        uploadStream.end(buffer);
    });
}

/**
 * Delete a file from Cloudinary
 * @param publicId - Cloudinary public ID of the file
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
