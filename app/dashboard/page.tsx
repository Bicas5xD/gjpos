import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-10 bg-slate-950 text-white">

  <h1 className="text-5xl font-bold text-orange-500 mb-10">
    Bem-vindo ao GjsPOS 👋
  </h1>

  <div className="grid grid-cols-2 gap-8">

    <Link href="/vendas">
      <div className="bg-orange-500 hover:bg-orange-600 rounded-3xl p-10 text-center cursor-pointer transition">
        <div className="text-6xl">🛒</div>
        <h2 className="text-3xl font-bold mt-4">Nova Venda</h2>
      </div>
    </Link>

    <Link href="/produtos">
      <div className="bg-slate-800 hover:bg-slate-700 rounded-3xl p-10 text-center cursor-pointer transition">
        <div className="text-6xl">📦</div>
        <h2 className="text-3xl font-bold mt-4">Produtos</h2>
      </div>
    </Link>

    <Link href="/stock">
      <div className="bg-slate-800 hover:bg-slate-700 rounded-3xl p-10 text-center cursor-pointer transition">
        <div className="text-6xl">📊</div>
        <h2 className="text-3xl font-bold mt-4">Stock</h2>
      </div>
    </Link>

    <Link href="/relatorios">
      <div className="bg-slate-800 hover:bg-slate-700 rounded-3xl p-10 text-center cursor-pointer transition">
        <div className="text-6xl">📈</div>
        <h2 className="text-3xl font-bold mt-4">Relatórios</h2>
      </div>
    </Link>

  </div>

</section>
    </main>
  );
}