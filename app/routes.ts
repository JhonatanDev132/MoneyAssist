import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("cadastro", "routes/cadastro.tsx"),
  layout("layout/protectedRoute.tsx", [
    layout("routes/_index.tsx", [
      index("routes/visaoGeral.tsx"),
      route("registrar", "routes/registrar.tsx"),
    ]),
  ]),
] satisfies RouteConfig;