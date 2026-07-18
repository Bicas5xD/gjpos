import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white p-6 min-h-screen">
      <h1 className="text-3xl font-bold text-orange-500 mb-8">
        GjsPOS
      </h1>

      <nav className="flex flex-col gap-4">
        <Link href="/dashboard" className="hover:text-orange-400">
          🏠 Dashboard
        </Link>

        <Link href="/vendas" className="hover:text-orange-400">
          🛒 Nova Venda
        </Link>

        <Link href="/produtos" className="hover:text-orange-400">
          📦 Produtos
        </Link>

        <Link href="/stock" className="hover:text-orange-400">
          📥 Stock
        </Link>

        <Link href="/relatorios" className="hover:text-orange-400">
          📊 Relatórios
        </Link>
      </nav>
    </aside>
  );
}