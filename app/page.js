import Home from '@/components/Home';
import { todayIST } from '@/lib/week';

// Rendered on every request so the Date field already holds today's date (IST) in the HTML,
// before any JavaScript runs. Statically pre-rendering would freeze the build-day date.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Home initialToday={todayIST()} />;
}
