import { HomeContent } from './components/home';
import { getDailyEntry } from './lib/daily-content';

export default async function Home() {
  const dailyEntry = await getDailyEntry();
  return <HomeContent dailyEntry={dailyEntry} />;
}
