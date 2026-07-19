"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type RecentSale = {
  id: number;
  total: number;
  created_at: string;
};

type DashboardData = {
  totalToday: number;
  salesCountToday: number;
  bestSellingProduct: string;
  bestSellingQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentSales: RecentSale[];
};

const initialDashboardData: DashboardData = {
  totalToday: 0,
  salesCountToday: 0,
  bestSellingProduct: "Sem vendas",
  bestSellingQuantity: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  recentSales: [],
};

export default function Dashboard() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialDashboardData);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      /*
       * Criamos o início e o fim do dia no horário local
       * do dispositivo e convertemos para o formato usado
       * pelo Supabase.
       */
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

      /*
       * Vendas realizadas hoje
       */
      const { data: todaySales, error: salesError } =
        await supabase
          .from("sales")
          .select("id, total, created_at")
          .gte("created_at", startOfToday.toISOString())
          .lt("created_at", startOfTomorrow.toISOString())
          .order("created_at", { ascending: false });

      if (salesError) {
        throw salesError;
      }

      const formattedTodaySales = (todaySales ?? []).map(
        (sale) => ({
          id: Number(sale.id),
          total: Number(sale.total),
          created_at: sale.created_at,
        })
      );

      const totalToday = formattedTodaySales.reduce(
        (total, sale) => total + sale.total,
        0
      );

      /*
       * Produto mais vendido hoje
       */
      let bestSellingProduct = "Sem vendas";
      let bestSellingQuantity = 0;

      const todaySaleIds = formattedTodaySales.map(
        (sale) => sale.id
      );

      if (todaySaleIds.length > 0) {
        const { data: saleItems, error: itemsError } =
          await supabase
            .from("sale_items")
            .select("product_name, quantity")
            .in("sale_id", todaySaleIds);

        if (itemsError) {
          throw itemsError;
        }

        const quantitiesByProduct = new Map<
          string,
          number
        >();

        for (const item of saleItems ?? []) {
          const productName =
            item.product_name || "Produto sem nome";

          const currentQuantity =
            quantitiesByProduct.get(productName) ?? 0;

          quantitiesByProduct.set(
            productName,
            currentQuantity + Number(item.quantity)
          );
        }

        for (const [
          productName,
          quantity,
        ] of quantitiesByProduct.entries()) {
          if (quantity > bestSellingQuantity) {
            bestSellingProduct = productName;
            bestSellingQuantity = quantity;
          }
        }
      }

      /*
       * Produtos com pouco stock e sem stock
       */
      const { data: products, error: productsError } =
        await supabase
          .from("products")
          .select("stock, active")
          .eq("active", true);

      if (productsError) {
        throw productsError;
      }

      const activeProducts = products ?? [];

      const lowStockCount = activeProducts.filter(
        (product) => {
          const stock = Number(product.stock);
          return stock > 0 && stock <= 5;
        }
      ).length;

      const outOfStockCount = activeProducts.filter(
        (product) => Number(product.stock) === 0
      ).length;

      /*
       * Últimas cinco vendas
       */
      const { data: recentSales, error: recentSalesError } =
        await supabase
          .from("sales")
          .select("id, total, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

      if (recentSalesError) {
        throw recentSalesError;
      }

      const formattedRecentSales: RecentSale[] = (
        recentSales ?? []
      ).map((sale) => ({
        id: Number(sale.id),
        total: Number(sale.total),
        created_at: sale.created_at,
      }));

      setDashboardData({
        totalToday,
        salesCountToday: formattedTodaySales.length,
        bestSellingProduct,
        bestSellingQuantity,
        lowStockCount,
        outOfStockCount,
        recentSales: formattedRecentSales,
      });
    } catch (error) {
      console.error(
        "Erro ao carregar o Dashboard:",
        error
      );

      setErrorMessage(
        "Não foi possível carregar os dados do Dashboard."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 bg-slate-950 p-10 text-white">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-orange-500 md:text-5xl">
              Bem-vindo ao GjsPOS 👋
            </h1>

            <p className="mt-2 text-gray-400">
              Resumo das vendas e do stock
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "A atualizar..."
              : "Atualizar dados"}
          </button>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 font-bold hover:bg-red-600"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estatísticas */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-900 p-6">
            <div className="text-4xl">💶</div>

            <p className="mt-4 text-gray-400">
              Faturação de hoje
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {isLoading
                ? "..."
                : `${dashboardData.totalToday.toFixed(
                    2
                  )} €`}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6">
            <div className="text-4xl">🛒</div>

            <p className="mt-4 text-gray-400">
              Vendas de hoje
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-400">
              {isLoading
                ? "..."
                : dashboardData.salesCountToday}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6">
            <div className="text-4xl">🏆</div>

            <p className="mt-4 text-gray-400">
              Produto mais vendido hoje
            </p>

            <p className="mt-2 text-xl font-bold text-blue-400">
              {isLoading
                ? "..."
                : dashboardData.bestSellingProduct}
            </p>

            {!isLoading &&
              dashboardData.bestSellingQuantity > 0 && (
                <p className="mt-1 text-sm text-gray-400">
                  {dashboardData.bestSellingQuantity}{" "}
                  unidades
                </p>
              )}
          </div>

          <Link
            href="/stock"
            className="rounded-2xl bg-slate-900 p-6 transition hover:bg-slate-800"
          >
            <div className="text-4xl">⚠️</div>

            <p className="mt-4 text-gray-400">
              Alertas de stock
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {isLoading
                ? "..."
                : dashboardData.lowStockCount +
                  dashboardData.outOfStockCount}
            </p>

            {!isLoading && (
              <p className="mt-1 text-sm text-gray-400">
                {dashboardData.lowStockCount} com pouco
                stock · {dashboardData.outOfStockCount} sem
                stock
              </p>
            )}
          </Link>
        </div>

        {/* Atalhos */}
        <h2 className="mb-5 text-2xl font-bold">
          Acesso rápido
        </h2>

        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/vendas"
            className="rounded-2xl bg-orange-500 p-7 text-center transition hover:bg-orange-600 active:scale-95"
          >
            <div className="text-5xl">🛒</div>

            <h3 className="mt-3 text-xl font-bold">
              Nova Venda
            </h3>
          </Link>

          <Link
            href="/produtos"
            className="rounded-2xl bg-slate-800 p-7 text-center transition hover:bg-slate-700 active:scale-95"
          >
            <div className="text-5xl">📦</div>

            <h3 className="mt-3 text-xl font-bold">
              Produtos
            </h3>
          </Link>

          <Link
            href="/stock"
            className="rounded-2xl bg-slate-800 p-7 text-center transition hover:bg-slate-700 active:scale-95"
          >
            <div className="text-5xl">📊</div>

            <h3 className="mt-3 text-xl font-bold">
              Stock
            </h3>
          </Link>

          <Link
            href="/relatorios"
            className="rounded-2xl bg-slate-800 p-7 text-center transition hover:bg-slate-700 active:scale-95"
          >
            <div className="text-5xl">📈</div>

            <h3 className="mt-3 text-xl font-bold">
              Relatórios
            </h3>
          </Link>
        </div>

        {/* Últimas vendas */}
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Últimas vendas
            </h2>

            <Link
              href="/relatorios"
              className="font-semibold text-orange-400 hover:text-orange-300"
            >
              Ver todas
            </Link>
          </div>

          {isLoading ? (
            <p className="text-gray-400">
              A carregar vendas...
            </p>
          ) : dashboardData.recentSales.length === 0 ? (
            <p className="text-gray-400">
              Ainda não existem vendas registadas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-gray-400">
                    <th className="p-3">Venda</th>
                    <th className="p-3">Data e hora</th>
                    <th className="p-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboardData.recentSales.map(
                    (sale) => (
                      <tr
                        key={sale.id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="p-3 font-semibold">
                          #{sale.id}
                        </td>

                        <td className="p-3 text-gray-300">
                          {formatDate(sale.created_at)}
                        </td>

                        <td className="p-3 text-right font-bold text-green-400">
                          {sale.total.toFixed(2)} €
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}