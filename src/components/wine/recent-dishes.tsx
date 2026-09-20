export function RecentDishes({
  dishes,
  onSelect,
}: {
  dishes: string[];
  onSelect: (dish: string) => void;
}) {
  if (dishes.length === 0) return null;
  return (
    <section className="mt-8">
      <p className="eyebrow">Frühere Anfragen</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {dishes.map((dish) => (
          <button key={dish} type="button" className="pill min-h-11" onClick={() => onSelect(dish)}>
            {dish}
          </button>
        ))}
      </div>
    </section>
  );
}
