/**
 * Kebutuhan belanja hanya berasal dari tindakan eksplisit pengguna.
 * 'plan' adalah rekomendasi, bukan daftar belanja.
 * Satu slot harian adalah satu masakan; resep yang sama pada dua slot terpilih
 * dihitung dua kali ketika kedua slot dipilih.
 */
export function resolveSelectedRecipes({recipeIndex, plan = [], selectedShoppingRecipes = [], selectedPlanSlots = []}) {
  const chosen = [];
  const seen = new Set();
  for (const id of selectedShoppingRecipes) {
    if (seen.has(id)) continue;
    const recipe = recipeIndex.get(id);
    if (recipe) { chosen.push(recipe); seen.add(id); }
  }
  const slots = new Set();
  for (const slot of selectedPlanSlots) {
    if (!slot || !Number.isInteger(slot.day) || !Number.isInteger(slot.slot) || !slot.id) continue;
    if (plan[slot.day]?.[slot.slot] !== slot.id) continue;
    const key = `${slot.day}:${slot.slot}`;
    if (slots.has(key)) continue;
    const recipe = recipeIndex.get(slot.id);
    if (recipe) { chosen.push(recipe); slots.add(key); }
  }
  return chosen;
}
