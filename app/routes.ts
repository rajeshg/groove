import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("home", "routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("logout", "routes/logout.tsx"),
  route("board/:id", "routes/board.$id.tsx"),
  route("card/:cardId", "routes/card.$cardId.tsx"),
  route("profile", "routes/profile.tsx"),
] satisfies RouteConfig;
