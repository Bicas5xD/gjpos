"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type CashSession = {
  id: number;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
};

type Sale = {
  id: number;
  total: number;
  cash_session_id: number | null;
};

type CashSessionWithSales = CashSession & {
  sales_count: number;
  sales_total: number;
};

function formatCurrency(value: number | null) {
  return `${Number(value ?? 0).toFixed(2)} €`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function HistoricoCaixasPage() {
  const [cashSessions, setCashSessions] = useState<
    CashSessionWithSales[]
  >([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCashSessions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: sessionsData,
        error: sessionsError,
      } = await supabase
        .from("cash_sessions")
        .select(
          `
          id,
          opening_amount,
          closing_amount,
          expected_amount,
          difference,
          status,
          opened_at,
          closed_at,
          notes
        `
        )
        .order("opened_at", { ascending: false });

      if (sessionsError) {
        throw sessionsError;
      }

      const {
        data: salesData,
        error: salesError,
      } = await supabase
        .from("sales")
        .select("id, total, cash_session_id")
        .not("cash_session_id", "is", null);

      if (salesError) {
        throw salesError;
      }

      const sessions: CashSession[] = (
        sessionsData ?? []
      ).map((session) => ({
        id: Number(session.id),
        opening_amount: Number(
          session.opening_amount
        ),
        closing_amount:
          session.closing_amount === null
            ? null
            : Number(session.closing_amount),
        expected_amount:
          session.expected_amount === null
            ? null
            : Number(session.expected_amount),
        difference:
          session.difference === null
            ? null
            : Number(session.difference),
        status: session.status,
        opened_at: session.opened_at,
        closed_at: session.closed_at,
        notes: session.notes,
      }));

      const sales: Sale[] = (salesData ?? []).map(
        (sale) => ({
          id: Number(sale.id),
          total: Number(sale.total),
          cash_session_id:
            sale.cash_session_id === null
              ? null
              : Number(sale.cash_session_id),
        })
      );

      const sessionsWithSales =
        sessions.map((session) => {
          const sessionSales = sales.filter(
            (sale) =>
              sale.cash_session_id === session.id
          );

          const salesTotal = sessionSales.reduce(
            (sum, sale) => sum + sale.total,
            0
          );

          return {
            ...session,
            sales_count: sessionSales.length,
            sales_total: salesTotal,
          };
        });

      setCashSessions(sessionsWithSales);
    } catch (error) {
      console.error(
        "Erro ao carregar o histórico de caixas:",
        error
      );

      setErrorMessage(
        "Não foi possível carregar o histórico de caixas."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCashSessions();
  }, [loadCashSessions]);

  const filteredSessions = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return cashSessions.filter((session) => {
      const matchesStatus =
        statusFilter === "all" ||
        session.status === statusFilter;

      const searchableText = [
        session.id.toString(),
        formatDate(session.opened_at),
        session.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [cashSessions, search, statusFilter]);

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-6 text-white md:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-orange-500">
              Histórico de Caixas
            </h1>

            <p className="mt-2 text-gray-400">
              Consulta todos os turnos de caixa
              abertos e fechados.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadCashSessions()}
            disabled={isLoading}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Atualizar
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 rounded-2xl bg-slate-900 p-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="cashSearch"
              className="mb-2 block font-semibold"
            >
              Pesquisar
            </label>

            <input
              id="cashSearch"
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Número da caixa, data ou notas..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label
              htmlFor="statusFilter"
              className="mb-2 block font-semibold"
            >
              Estado
            </label>

            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-orange-500"
            >
              <option value="all">
                Todos os estados
              </option>
              <option value="open">
                Caixas abertas
              </option>
              <option value="closed">
                Caixas fechadas
              </option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-slate-900 p-8">
            <p className="text-gray-400">
              A carregar histórico de caixas...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-800 bg-red-950 p-8">
            <p className="font-bold text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadCashSessions()
              }
              className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-bold hover:bg-red-600"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 p-8">
            <p className="text-gray-400">
              Não foram encontradas caixas.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredSessions.map((session) => {
              const isOpen =
                session.status === "open";

              const expectedAmount =
                session.expected_amount ??
                session.opening_amount +
                  session.sales_total;

              return (
                <article
                  key={session.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold">
                          Caixa #{session.id}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            isOpen
                              ? "bg-green-950 text-green-400"
                              : "bg-slate-800 text-gray-300"
                          }`}
                        >
                          {isOpen
                            ? "🟢 Aberta"
                            : "⚫ Fechada"}
                        </span>
                      </div>

                      <p className="mt-2 text-gray-400">
                        {formatDate(session.opened_at)}
                      </p>
                    </div>

                    <Link
                      href={`/historico-caixas/${session.id}`}
                      className="rounded-xl bg-orange-500 px-6 py-4 text-center font-bold transition hover:bg-orange-600"
                    >
                      Ver detalhes
                    </Link>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Aberta
                      </p>

                      <p className="mt-1 font-bold">
                        {formatTime(session.opened_at)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Fechada
                      </p>

                      <p className="mt-1 font-bold">
                        {formatTime(session.closed_at)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Fundo inicial
                      </p>

                      <p className="mt-1 font-bold">
                        {formatCurrency(
                          session.opening_amount
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Vendas
                      </p>

                      <p className="mt-1 font-bold">
                        {session.sales_count}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Total vendido
                      </p>

                      <p className="mt-1 font-bold text-orange-400">
                        {formatCurrency(
                          session.sales_total
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Esperado
                      </p>

                      <p className="mt-1 font-bold">
                        {formatCurrency(
                          expectedAmount
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Contado
                      </p>

                      <p className="mt-1 font-bold">
                        {formatCurrency(
                          session.closing_amount
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800 p-4">
                      <p className="text-sm text-gray-400">
                        Diferença
                      </p>

                      <p
                        className={`mt-1 font-bold ${
                          session.difference === null
                            ? "text-gray-300"
                            : session.difference === 0
                              ? "text-green-400"
                              : session.difference > 0
                                ? "text-blue-400"
                                : "text-red-400"
                        }`}
                      >
                        {session.difference === null
                          ? "—"
                          : formatCurrency(
                              session.difference
                            )}
                      </p>
                    </div>
                  </div>

                  {session.notes && (
                    <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4">
                      <p className="text-sm text-gray-400">
                        Observações
                      </p>

                      <p className="mt-1">
                        {session.notes}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}