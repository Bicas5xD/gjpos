import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 bg-slate-900 p-6 text-white">
      <h1 className="mb-8 text-3xl font-bold text-orange-500">
        GjsPOS
      </h1>

      <nav className="flex flex-col gap-4">
        <Link
          href="/dashboard"
          className="hover:text-orange-400"
        >
          🏠 Dashboard
        </Link>

        <Link
          href="/vendas"
          className="hover:text-orange-400"
        >
          🛒 Nova Venda
        </Link>

        <Link
          href="/caixa"
          className="hover:text-orange-400"
        >
          💰 Caixa
        </Link>

        <Link
          href="/produtos"
          className="hover:text-orange-400"
        >
          📦 Produtos
        </Link>

        <Link
          href="/stock"
          className="hover:text-orange-400"
        >
          📥 Stock
        </Link>

        <Link
          href="/configuracoes"
          className="hover:text-orange-400"
        >
          ⚙️ Configurações
        </Link>

        <Link
          href="/relatorios"
          className="hover:text-orange-400"
        >
          📊 Relatórios
        </Link>

        <Link
          href="/historico-caixas"
          className="hover:text-orange-400"
        >
          🧾 Histórico de Caixas
        </Link>
      </nav>
    </aside>
  );
}