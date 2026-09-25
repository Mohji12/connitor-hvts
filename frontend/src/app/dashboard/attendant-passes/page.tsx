import { redirect } from 'next/navigation';

export default function AttendantPassesRedirectPage(): never {
  redirect('/dashboard/ams');
}
