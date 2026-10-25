import { labelForLanguage, labelForSongGenre } from "@/lib/catalog-enums";
import type { AiMode, ListenPrefs, WatchPrefs } from "@/lib/ai-profile/schema";
import { VOCAB, type VocabOption } from "@/lib/ai-profile/vocabulary";

const tag = (map: Map<string, VocabOption>, id: string) => {
  const option = map.get(id);
  return option ? `${option.emoji} ${option.label}` : null;
};

/** Short chips describing the answers — "What I've understood" in chat, the results header. */
export function summarizePrefs(mode: AiMode, prefs: WatchPrefs | ListenPrefs): string[] {
  if (mode === "watch") {
    const p = prefs as WatchPrefs;
    return [
      ...p.formats.map((id) => tag(VOCAB.formats, id)),
      ...p.vibes.map((id) => tag(VOCAB.vibes, id)),
      ...p.themes.map((id) => tag(VOCAB.themes, id)),
      ...p.worlds.map((id) => tag(VOCAB.worlds, id)),
      ...p.protagonists.map((id) => tag(VOCAB.protagonists, id)),
      p.ending ? tag(VOCAB.ending, p.ending) : null,
      p.intensity ? tag(VOCAB.intensity, p.intensity) : null,
      ...p.occasions.map((id) => tag(VOCAB.occasions, id)),
      p.company ? tag(VOCAB.company, p.company) : null,
      p.subsDubs ? tag(VOCAB.subsDubs, p.subsDubs) : null,
      p.lovedTitles.length ? `❤️ ${p.lovedTitles.length} loved title${p.lovedTitles.length === 1 ? "" : "s"}` : null,
      p.pace ? tag(VOCAB.pace, p.pace) : null,
      p.commitment ? tag(VOCAB.commitment, p.commitment) : null,
      p.weeklyHours ? `⏱️ ${p.weeklyHours} h / week` : null,
      ...p.avoid.map((id) => (VOCAB.avoid.get(id) ? `🚫 ${VOCAB.avoid.get(id)!.label}` : null)),
      ...p.languages.map((id) => `🗣️ ${labelForLanguage(id)}`),
    ].filter((chip): chip is string => Boolean(chip));
  }
  const p = prefs as ListenPrefs;
  return [
    ...p.moods.map((id) => tag(VOCAB.listenMoods, id)),
    ...p.genres.map((id) => `🎵 ${labelForSongGenre(id)}`),
    p.energy ? tag(VOCAB.energy, p.energy) : null,
    p.discovery ? tag(VOCAB.discovery, p.discovery) : null,
    p.vocals ? tag(VOCAB.vocals, p.vocals) : null,
    ...p.eras.map((id) => tag(VOCAB.era, id)),
    p.lovedArtists.length ? `❤️ ${p.lovedArtists.length} loved artist${p.lovedArtists.length === 1 ? "" : "s"}` : null,
    ...p.languages.map((id) => `🗣️ ${labelForLanguage(id)}`),
  ].filter((chip): chip is string => Boolean(chip));
}
