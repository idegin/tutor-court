import { getPayload } from 'payload';
import configPromise from '@payload-config';

export async function GET() {
    const slug = "hector-smith";
    const isObjectId = false;
    const payload = await getPayload({ config: configPromise });
    
    const { docs } = await payload.find({
        collection: 'tutor-profiles',
        where: isObjectId ? { id: { equals: slug } } : { slug: { equals: slug } },
        depth: 2
    });
    
    return Response.json({
        slug,
        docsLength: docs.length,
        hasDoc: !!docs[0],
    });
}
