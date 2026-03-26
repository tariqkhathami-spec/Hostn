import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { requireHost } from '@/lib/auth-helpers';
import Property from '@/lib/models/Property';
import { uploadImage, validateImage } from '@/lib/cloudinary';
import { logEvent } from '@/lib/logger';

const MAX_IMAGES_PER_PROPERTY = 20;

/**
 * POST /api/host/properties/[id]/images
 * Upload an image to a property.
 *
 * FormData: file (required), caption (optional), isPrimary (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { id } = params;

    // Find property and verify ownership
    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.host.toString() !== auth.payload.userId && auth.payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'You do not own this property' },
        { status: 403 }
      );
    }

    // Check image limit
    if (property.images && property.images.length >= MAX_IMAGES_PER_PROPERTY) {
      return NextResponse.json(
        { success: false, message: `Maximum ${MAX_IMAGES_PER_PROPERTY} images per property` },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caption = formData.get('caption') as string | null;
    const isPrimary = formData.get('isPrimary') === 'true';

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
    let uploadResult;
    try {
      uploadResult = await uploadImage(file, `hostn/properties/${id}`);
    } catch (error) {
      console.error('Image upload failed:', error);
      return NextResponse.json(
        { success: false, message: `Upload failed: ${(error as Error).message}` },
        { status: 502 }
      );
    }

    // If setting as primary, unset all existing primary images
    if (isPrimary && property.images) {
      property.images.forEach((img: { isPrimary?: boolean }) => {
        img.isPrimary = false;
      });
    }

    // Add image to property
    const newImage = {
      url: uploadResult.secureUrl,
      caption: caption || undefined,
      isPrimary: isPrimary || (property.images?.length === 0),
    };

    property.images.push(newImage);
    await property.save();

    // Log event (fire-and-forget)
    logEvent(
      'image_uploaded',
      auth.payload.userId,
      'property',
      id,
      `Image uploaded to property: ${uploadResult.secureUrl}`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        image: newImage,
        totalImages: property.images.length,
        cloudinaryId: uploadResult.publicId,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/host/properties/[id]/images
 * Remove an image from a property.
 *
 * Body: { imageUrl: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireHost(request);
    if ('error' in auth) return auth.error;

    await dbConnect();

    const { id } = params;
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, message: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const property = await Property.findById(id);
    if (!property) {
      return NextResponse.json(
        { success: false, message: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.host.toString() !== auth.payload.userId && auth.payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'You do not own this property' },
        { status: 403 }
      );
    }

    // Remove image from array
    const imageIndex = property.images.findIndex((img: { url: string }) => img.url === imageUrl);
    if (imageIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Image not found on this property' },
        { status: 404 }
      );
    }

    property.images.splice(imageIndex, 1);
    await property.save();

    return NextResponse.json({
      success: true,
      message: 'Image removed',
      totalImages: property.images.length,
    });
  } catch (error) {
    console.error('Image delete error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
