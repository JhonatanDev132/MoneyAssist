import { NavBar } from "~/layout/navBar";
import { HotBar } from "~/layout/hotBar";
import VisaoGeral from "./visaoGeral";


export default function HomeRoute() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-dark">
        <NavBar />
        <div className="flex flex-1">
            <HotBar />
            <VisaoGeral />
        </div>
    </div>
  );
}