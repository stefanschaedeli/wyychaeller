import type { WineResponse } from "@/shared/api-contract";
import { WineListItem } from "./wine-list-item";

export function WineList({ wines }: { wines: WineResponse[] }) {
  return (
    <ul className="md:grid md:grid-cols-2 md:gap-x-10">
      {wines.map((wine) => (
        <WineListItem key={wine.id} wine={wine} />
      ))}
    </ul>
  );
}
