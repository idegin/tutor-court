import { getPayload } from 'payload';
import configPromise from '@payload-config';

export async function GET() {
    const payload = await getPayload({ config: configPromise });
    const { docs } = await payload.find({
        collection: 'tutor-profiles',
        depth: 0,
        limit: 100
    });
    return Response.json(docs.map((d: any) => ({id: d.id, slug: d.slug, isApproved: d.isApproved})));
}
