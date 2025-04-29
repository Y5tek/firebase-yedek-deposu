import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/select-branch');
  // Return null or an empty fragment because redirect throws an error and stops rendering
  return null;
}
