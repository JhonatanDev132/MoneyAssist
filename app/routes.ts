import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("cadastro", "routes/cadastro.tsx"),
  layout("layout/protectedRoute.tsx", [
    index("routes/_index.tsx"),
  ]),
] satisfies RouteConfig;