import { headers as getHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { z } from 'zod';
import { differenceInBusinessDays, differenceInDays } from 'date-fns';
import { getBaseEmailLayout, getEmailServerUrl } from '@/lib/email-template';

const bookingSchema = z.object({
  tutorId: z.string(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid startDate" }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid endDate" }),
  hoursPerDay: z.number().min(1).max(10),
  daysOfWeek: z.array(z.string()).min(1),
  // subjects may arrive as subject IDs or names; resolved to IDs server-side.
  subjects: z.array(z.string()).min(1),
  message: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { user } = await getServerSideUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = bookingSchema.parse(body);

        const payload = await getPayload({ config });

        // Get tutor profile to get the standard hourly rate
        const tutorProfile = await payload.findByID({
            collection: 'tutor-profiles',
            id: parsed.tutorId,
        });

        if (!tutorProfile) {
            return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
        }

        // Extremely simple calculation: (approximate days * hours per day) * hourlyRate
        // Assuming ~4 weeks in a month or estimating active days
        const start = new Date(parsed.startDate);
        const end = new Date(parsed.endDate);
        const daysDiff = Math.max(1, differenceInDays(end, start));
        
        // Rough estimate of how many of the selected days fall into that timeframe
        const weeks = Math.max(1, Math.ceil(daysDiff / 7));
        const estimatedTotalHours = weeks * parsed.daysOfWeek.length * parsed.hoursPerDay;
        const totalPrice = estimatedTotalHours * (tutorProfile.hourlyRate || 0);

        // Resolve incoming subjects (IDs or names) to Subject IDs.
        const subjectIds: (string | number)[] = []
        for (const raw of parsed.subjects) {
            const trimmed = raw.trim()
            if (!trimmed) continue
            // Try matching by slug, name, or id.
            const match = await payload.find({
                collection: 'subjects',
                where: {
                    or: [
                        { id: { equals: trimmed } },
                        { slug: { equals: trimmed.toLowerCase() } },
                        { name: { equals: trimmed } },
                    ],
                },
                limit: 1,
                depth: 0,
            })
            if (match.docs[0]) subjectIds.push(match.docs[0].id)
        }
        if (subjectIds.length === 0) {
            return NextResponse.json({ error: 'No valid subjects supplied' }, { status: 400 })
        }

        type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

        const booking = await payload.create({
            collection: 'bookings',
            data: {
                student: user.id,
                tutor: tutorProfile.id,
                date: start.toISOString(),
                endDate: end.toISOString(),
                hoursPerDay: parsed.hoursPerDay,
                daysOfWeek: parsed.daysOfWeek as DayOfWeek[],
                subjects: subjectIds as any,
                message: parsed.message || '',
                price: totalPrice,
                status: 'pending',
            }
        } as any);

        // Email the tutor
        let tutorEmail = '';
        if (typeof tutorProfile.user === 'object' && tutorProfile.user?.email) {
            tutorEmail = tutorProfile.user.email;
        } else if (typeof tutorProfile.user === 'string') {
            const tutorUser = await payload.findByID({ collection: 'users', id: tutorProfile.user });
            tutorEmail = tutorUser?.email || '';
        }

        if (tutorEmail) {
            const headers = await getHeaders();
            const serverUrl = getEmailServerUrl(headers);
            const htmlContent = `
              <p class="text">Hi there,</p>
              <p class="text">You have received a new booking request from ${user.firstName} ${user.lastName}.</p>
              <p class="text">They are requesting ${parsed.hoursPerDay} hours per day for ${parsed.subjects.join(', ')}.</p>
              ${parsed.message ? `<p class="text">Message: "${parsed.message}"</p>` : ''}
              <div class="btn-container">
                <a href="${serverUrl}/dashboard/bookings" class="btn">View Booking</a>
              </div>
            `;
            await payload.sendEmail({
                to: tutorEmail,
                subject: 'New Booking Request - TutorCourt',
                html: getBaseEmailLayout('New Booking Request', htmlContent, serverUrl),
            });
        }

        return NextResponse.json({ success: true, booking });
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Error creating booking' }, { status: 500 });
    }
}