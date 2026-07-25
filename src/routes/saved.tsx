import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/saved")({
  component: SavedLayout,
});

function SavedLayout() {
  return <Outlet />;
}
