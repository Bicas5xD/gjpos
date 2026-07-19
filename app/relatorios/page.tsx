"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: number;
  total: number;
  amount_received: number | null;
  change_amount: number | null;
  created_at: string;
};

type SaleItem = {
  id: number;
  sale_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFirstDayOfMonth() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

export default function Relatorios() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<
    Record<number, SaleItem[]>
  >({});

  const [expandedSaleId, setExpandedSaleId] = useState<
    number | null
  >(null);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(
    getFirstDayOfMonth()
  );
  const [endDate, setEndDate] = useState(getTodayDate());

  const [isLoading, setIsLoading] = useState(true);
  const [loadingItemsId, setLoadingItemsId] = useState<
    number | null
  >(null);

  const [errorMessage, setErrorMessage] = useState("");

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    setExpandedSaleId(null);

    try {
      let query = supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);

        query = query.gte(
          "created_at",
          start.toISOString()
        );
      }

      if (endDate) {
        const end = new Date(`${endDate}T00:00:00`);
        end.setDate(end.getDate() + 1);

        query = query.lt("created_at", end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const formattedSales: Sale[] = (data ?? []).map(
        (sale) => ({
          id: Number(sale.id),
          total: Number(sale.total ?? 0),

          /*
           * Estes campos aparecem caso existam na tabela.
           * Caso tenham outros nomes ou não existam,
           * ficam simplesmente vazios no relatório.
           */
          amount_received:
            sale.amount_received !== undefined &&
            sale.amount_received !== null
              ? Number(sale.amount_received)
              : sale.received_amount !== undefined &&
                  sale.received_amount !== null
                ? Number(sale.received_amount)
                : null,

          change_amount:
            sale.change_amount !== undefined &&
            sale.change_amount !== null
              ? Number(sale.change_amount)
              : sale.change !== undefined &&
                  sale.change !== null
                ? Number(sale.change)
                : null,

          created_at: sale.created_at,
        })
      );

      setSales(formattedSales);
    } catch (error) {
      console.error(
        "Erro ao carregar relatórios:",
        error
      );

      setErrorMessage(
        "Não foi possível carregar as vendas."
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  async function loadSaleItems(saleId: number) {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null);
      return;
    }

    setExpandedSaleId(saleId);

    /*
     * Se os artigos desta venda já foram carregados,
     * não precisamos de voltar a consultar o Supabase.
     */
    if (saleItems[saleId]) {
      return;
    }

    setLoadingItemsId(saleId);

    try {
      const { data, error } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", saleId)
        .order("id", { ascending: true });

      if (error) {
        throw error;
      }

      const formattedItems: SaleItem[] = (
        data ?? []
      ).map((item) => {
        const quantity = Number(item.quantity ?? 0);

        const unitPrice = Number(
          item.unit_price ??
            item.price ??
            item.product_price ??
            0
        );

        const subtotal = Number(
          item.subtotal ?? quantity * unitPrice
        );

        return {
          id: Number(item.id),
          sale_id: Number(item.sale_id),
          product_name:
            item.product_name ??
            item.name ??
            "Produto sem nome",
          quantity,
          unit_price: unitPrice,
          subtotal,
        };
      });

      setSaleItems((currentItems) => ({
        ...currentItems,
        [saleId]: formattedItems,
      }));
    } catch (error) {
      console.error(
        "Erro ao carregar artigos da venda:",
        error
      );

      alert(
        "Não foi possível carregar os produtos desta venda."
      );
    } finally {
      setLoadingItemsId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setStartDate("");
    setEndDate("");
  }

  function useCurrentMonth() {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getTodayDate());
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  const filteredSales = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return sales;
    }

    return sales.filter((sale) => {
      const saleNumber = sale.id.toString();
      const formattedDate = formatDate(
        sale.created_at
      ).toLowerCase();

      return (
        saleNumber.includes(searchTerm) ||
        formattedDate.includes(searchTerm)
      );
    });
  }, [sales, search]);

  const totalRevenue = useMemo(
    () =>
      filteredSales.reduce(
        (total, sale) => total + sale.total,
        0
      ),
    [filteredSales]
  );

  const averageSale =
    filteredSales.length > 0
      ? totalRevenue / filteredSales.length
      : 0;

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-6 text-white md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-orange-500">
              Relatórios
            </h1>

            <p className="mt-2 text-gray-400">
              Consulta o histórico e os detalhes das vendas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadSales()}
            disabled={isLoading}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "A atualizar..."
              : "Atualizar dados"}
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-8 rounded-2xl bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">
            Filtros
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Pesquisar venda
              </label>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Número ou data..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Data inicial
              </label>

              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Data final
              </label>

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={useCurrentMonth}
              className="rounded-lg bg-orange-500 px-4 py-2 font-bold transition hover:bg-orange-600"
            >
              Este mês
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg bg-slate-700 px-4 py-2 font-bold transition hover:bg-slate-600"
            >
              Mostrar todas
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-900 p-6">
            <p className="text-gray-400">
              Faturação do período
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {isLoading
                ? "..."
                : formatCurrency(totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6">
            <p className="text-gray-400">
              Número de vendas
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-400">
              {isLoading ? "..." : filteredSales.length}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6">
            <p className="text-gray-400">
              Valor médio por venda
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-400">
              {isLoading
                ? "..."
                : formatCurrency(averageSale)}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={() => void loadSales()}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 font-bold hover:bg-red-600"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Histórico */}
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">
              Histórico de vendas
            </h2>

            {!isLoading && (
              <span className="text-sm text-gray-400">
                {filteredSales.length} venda
                {filteredSales.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-gray-400">
              A carregar vendas...
            </p>
          ) : filteredSales.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-5xl">🧾</div>

              <p className="mt-4 text-gray-400">
                Não foram encontradas vendas neste período.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((sale) => {
                const isExpanded =
                  expandedSaleId === sale.id;

                const items = saleItems[sale.id] ?? [];

                return (
                  <div
                    key={sale.id}
                    className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void loadSaleItems(sale.id)
                      }
                      className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold">
                          #{sale.id}
                        </div>

                        <div>
                          <p className="font-bold">
                            Venda #{sale.id}
                          </p>

                          <p className="mt-1 text-sm text-gray-400">
                            {formatDate(sale.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <p className="text-xl font-bold text-green-400">
                          {formatCurrency(sale.total)}
                        </p>

                        <span className="text-xl text-gray-400">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-700 p-5">
                        {loadingItemsId === sale.id ? (
                          <p className="text-gray-400">
                            A carregar produtos...
                          </p>
                        ) : items.length === 0 ? (
                          <p className="text-gray-400">
                            Esta venda não tem produtos registados.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-700 text-left text-sm text-gray-400">
                                  <th className="p-3">
                                    Produto
                                  </th>

                                  <th className="p-3 text-center">
                                    Quantidade
                                  </th>

                                  <th className="p-3 text-right">
                                    Preço
                                  </th>

                                  <th className="p-3 text-right">
                                    Subtotal
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {items.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="border-b border-slate-800 last:border-0"
                                  >
                                    <td className="p-3 font-semibold">
                                      {item.product_name}
                                    </td>

                                    <td className="p-3 text-center">
                                      {item.quantity}
                                    </td>

                                    <td className="p-3 text-right text-gray-300">
                                      {formatCurrency(
                                        item.unit_price
                                      )}
                                    </td>

                                    <td className="p-3 text-right font-bold">
                                      {formatCurrency(
                                        item.subtotal
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="mt-5 flex flex-col items-end gap-2 border-t border-slate-700 pt-5">
                          {sale.amount_received !== null && (
                            <p className="text-gray-300">
                              Valor recebido:{" "}
                              <strong>
                                {formatCurrency(
                                  sale.amount_received
                                )}
                              </strong>
                            </p>
                          )}

                          {sale.change_amount !== null && (
                            <p className="text-gray-300">
                              Troco:{" "}
                              <strong>
                                {formatCurrency(
                                  sale.change_amount
                                )}
                              </strong>
                            </p>
                          )}

                          <p className="text-xl">
                            Total:{" "}
                            <strong className="text-green-400">
                              {formatCurrency(sale.total)}
                            </strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}