import CalendarClient from './calendar-client';

export const metadata = {
    title: 'Calendar | TutorCourt',
    description: 'Manage your tutoring schedule',
};

export default function TutorCalendarPage() {
    return (
        <CalendarClient />
    );
}