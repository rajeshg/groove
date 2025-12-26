import { createFileRoute } from "@tanstack/react-router";
import { CardDetailPage } from "~/components/CardDetailPage";

export const Route = createFileRoute("/boards_/$boardId_/cards_/$cardId")({
  component: CardDetailComponent,
  ssr: false,
});

function CardDetailComponent() {
  return <CardDetailPage />;
}
