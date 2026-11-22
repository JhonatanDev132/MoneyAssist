import { NavBar } from "~/layout/navBar";
import { HotBar } from "~/layout/hotBar";
import { Outlet } from "react-router";

export default function HomeRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-dark">
      <NavBar />
      <div className="flex flex-1">
        <HotBar />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
