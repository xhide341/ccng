export type DailyEntry = {
  mantra: string;
  source: string;
};

type ZenQuoteResponseItem = {
  q?: string;
  a?: string;
  h?: string;
};

export async function getDailyEntry(): Promise<DailyEntry | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://zenquotes.io/api/today', {
      next: { revalidate: 86400 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as ZenQuoteResponseItem[];
    if (Array.isArray(data) && data.length > 0) {
      const quoteText = data[0].q?.trim();
      const author = data[0].a?.trim();

      if (quoteText && !quoteText.toLowerCase().includes('too many requests')) {
        return {
          mantra: quoteText,
          source: author || 'Philosophy',
        };
      }
    }
  } catch {
    console.error('Failed to obtain quote.');
  }

  return null;
}
