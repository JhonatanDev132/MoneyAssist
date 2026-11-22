import { Navigate, useParams } from "react-router";
import { FormularioLancamento } from "~/components/formularioLancamento";

export default function Editar() {
  const { tipo, id } = useParams();
  if (!id || (tipo !== "gasto" && tipo !== "ganho")) return <Navigate to="/listar" replace />;
  return <FormularioLancamento key={`${tipo}-${id}`} tipoInicial={tipo} id={id} />;
}
