import { GraficoBarra } from "~/components/graficoDeBarra"
import { GraficoPizza } from "~/components/graficoDePizza"

export default function VisaoGeral() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-bg-dark p-5">
      <h1 className="pb-5">Seja bem-vindo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 place-content-around sm:items-center">
        <GraficoPizza />

        <div>
          <h1 className="pb-5">IA's tip</h1>

          <p className="w-full h-full lg:h-69 bg-surface-dark border border-surface-border rounded-xl p-4">
            "Boa tarde, você está gastando mais com transporte que o mês passado"
          </p>
        </div>
        

        <GraficoBarra />
      </div>
    </div>
  )
}