import { NextRequest, NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth-helpers';
import { uploadImage, validateImage } from '@/lib/cloudinary';

/**
 * POST /api/upload/image
 * Upload an image to Cloudinary (standalone — no property ID required).
 * Used by the Add Property form before the property is created.
 *
 * FormData: file (required)
 * Returns: { success: true, url: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateImage(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const result = await uploadImage(file, 'hostn/properties');

    return NextResponse.json({
      success: true,
      url: result.secureUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, message: `Upload failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
