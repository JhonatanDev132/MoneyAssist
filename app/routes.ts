import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("cadastro", "routes/cadastro.tsx"),
  route("api/analise", "routes/api.analise.ts"),
  layout("layout/protectedRoute.tsx", [
    layout("routes/_index.tsx", [
      index("routes/visaoGeral.tsx"),
      route("registrar", "routes/registrar.tsx"),
      route("editar/:tipo/:id", "routes/editar.tsx"),
      route("listar", "routes/listarGastos.tsx"),
    ]),
  ]),
] satisfies RouteConfig;