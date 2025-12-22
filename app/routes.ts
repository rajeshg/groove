import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("invite", "routes/invite.tsx"),
  route("home", "routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("logout", "routes/logout.tsx"),
  route("board/:id", "routes/board.$id.tsx", [
    route("settings", "routes/board.$id.settings.tsx"),
    route(
      "column/:columnId/settings",
      "routes/board.$id.column.$columnId.settings.tsx"
    ),
  ]),
  route("card/:cardId", "routes/card.$cardId.tsx"),
  route("board/:id/column/:columnId", "routes/board.$id.column.$columnId.tsx"),
  route("profile", "routes/profile.tsx"),
  route("me/assigned", "routes/me.assigned.tsx"),
  route("me/created", "routes/me.created.tsx"),

  // Resource routes
  route("resources/new-card", "routes/resources/new-card.tsx"),
  route("resources/new-column", "routes/resources/new-column.tsx"),
  route("resources/update-card", "routes/resources/update-card.tsx"),
  route("resources/update-column", "routes/resources/update-column.tsx"),
  route("resources/delete-card", "routes/resources/delete-card.tsx"),
  route("resources/delete-column", "routes/resources/delete-column.tsx"),
  route("resources/move-card", "routes/resources/move-card.tsx"),
  route("resources/move-column", "routes/resources/move-column.tsx"),
  route("resources/create-comment", "routes/resources/create-comment.tsx"),
  route("resources/update-comment", "routes/resources/update-comment.tsx"),
  route("resources/delete-comment", "routes/resources/delete-comment.tsx"),
  route("resources/update-board", "routes/resources/update-board.tsx"),
  route("resources/invite-user", "routes/resources/invite-user.tsx"),
  route(
    "resources/update-item-assignee",
    "routes/resources/update-item-assignee.tsx"
  ),
  route("resources/remove-member", "routes/resources/remove-member.tsx"),
] satisfies RouteConfig;
