export type Track = {
  id: string;
  title: string;
  artist: string;
  source: string;
  category: string;
};

export const demoTracks: Track[] = [
  { id: "coast-piano", title: "海岸钢琴", artist: "Built-in", source: "built-in", category: "轻钢琴" },
  { id: "ocean-breath", title: "海浪白噪音", artist: "Built-in", source: "built-in", category: "海浪" },
  { id: "soft-rain", title: "轻柔雨声", artist: "Built-in", source: "built-in", category: "雨声" },
  { id: "forest-air", title: "森林清晨", artist: "Built-in", source: "built-in", category: "自然声" },
  { id: "deep-calm", title: "冥想氛围", artist: "Built-in", source: "built-in", category: "冥想" },
];
