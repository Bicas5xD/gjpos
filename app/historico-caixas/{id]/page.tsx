"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  amount_received: number;
  change_amount: number;
  payment_method: string;
  created_at: string;
};

type SaleItem = {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
};

type ProductSummary = {
  product_name: string;
  quantity: number;
  total: number;
};

function formatCurrency(value: number | null) {
  return `${Number(value ?? 0).toFixed(2)} €`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CashSessionDetailsPage() {
  const params = useParams();

  const cashSessionId = Number(params.id);

  const [cashSession, setCashSession] =
    useState<CashSession | null>(null);

  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<
    SaleItem[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadDetails = useCallback(async () => {
    if (
      !Number.isInteger(cashSessionId) ||
      cashSessionId <= 0
    ) {
      setErrorMessage("O número da caixa é inválido.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
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
        .eq("id", cashSessionId)
        .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData) {
        setCashSession(null);
        setSales([]);
        setSaleItems([]);
        setErrorMessage(
          "Não foi encontrada nenhuma caixa com este número."
        );
        setIsLoading(false);
        return;
      }

      const formattedSession: CashSession = {
        id: Number(sessionData.id),
        opening_amount: Number(
          sessionData.opening_amount
        ),
        closing_amount:
          sessionData.closing_amount === null
            ? null
            : Number(sessionData.closing_amount),
        expected_amount:
          sessionData.expected_amount === null
            ? null
            : Number(sessionData.expected_amount),
        difference:
          sessionData.difference === null
            ? null
            : Number(sessionData.difference),
        status: sessionData.status,
        opened_at: sessionData.opened_at,
        closed_at: sessionData.closed_at,
        notes: sessionData.notes,
      };

      const {
        data: salesData,
        error: salesError,
      } = await supabase
        .from("sales")
        .select(
          `
          id,
          total,
          amount_received,
          change_amount,
          payment_method,
          created_at
        `
        )
        .eq("cash_session_id", cashSessionId)
        .order("created_at", { ascending: false });

      if (salesError) {
        throw salesError;
      }

      const formattedSales: Sale[] = (
        salesData ?? []
      ).map((sale) => ({
        id: Number(sale.id),
        total: Number(sale.total),
        amount_received: Number(
          sale.amount_received
        ),
        change_amount: Number(sale.change_amount),
        payment_method: sale.payment_method,
        created_at: sale.created_at,
      }));

      const saleIds = formattedSales.map(
        (sale) => sale.id
      );

      let formattedSaleItems: SaleItem[] = [];

      if (saleIds.length > 0) {
        const {
          data: itemsData,
          error: itemsError,
        } = await supabase
          .from("sale_items")
          .select(
            `
            id,
            sale_id,
            product_id,
            product_name,
            unit_price,
            quantity,
            subtotal
          `
          )
          .in("sale_id", saleIds)
          .order("id", { ascending: true });

        if (itemsError) {
          throw itemsError;
        }

        formattedSaleItems = (
          itemsData ?? []
        ).map((item) => ({
          id: Number(item.id),
          sale_id: Number(item.sale_id),
          product_id:
            item.product_id === null
              ? null
              : Number(item.product_id),
          product_name: item.product_name,
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
        }));
      }

      setCashSession(formattedSession);
      setSales(formattedSales);
      setSaleItems(formattedSaleItems);
    } catch (error) {
      console.error(
        "Erro ao carregar os detalhes da caixa:",
        error
      );

      setErrorMessage(
        "Não foi possível carregar os detalhes da caixa."
      );
    } finally {
      setIsLoading(false);
    }
  }, [cashSessionId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const salesTotal = useMemo(
    () =>
      sales.reduce(
        (sum, sale) => sum + sale.total,
        0
      ),
    [sales]
  );

  const expectedAmount =
    cashSession?.expected_amount ??
    (cashSession
      ? cashSession.opening_amount + salesTotal
      : 0);

  const productsSummary = useMemo(() => {
    const summary = new Map<
      string,
      ProductSummary
    >();

    for (const item of saleItems) {
      const existing = summary.get(
        item.product_name
      );

      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.subtotal;
      } else {
        summary.set(item.product_name, {
          product_name: item.product_name,
          quantity: item.quantity,
          total: item.subtotal,
        });
      }
    }

    return Array.from(summary.values()).sort(
      (a, b) => b.quantity - a.quantity
    );
  }, [saleItems]);

  function getItemsFromSale(saleId: number) {
    return saleItems.filter(
      (item) => item.sale_id === saleId
    );
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-6 text-white md:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/historico-caixas"
              className="mb-3 inline-block font-semibold text-gray-400 transition hover:text-orange-400"
            >
              ← Voltar ao histórico
            </Link>

            <h1 className="text-4xl font-bold text-orange-500">
              Detalhes da Caixa
            </h1>

            <p className="mt-2 text-gray-400">
              Resumo completo do turno e respetivas
              vendas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDetails()}
            disabled={isLoading}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-slate-900 p-8">
            <p className="text-gray-400">
              A carregar detalhes da caixa...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-800 bg-red-950 p-8">
            <p className="font-bold text-red-300">
              {errorMessage}
            </p>

            <Link
              href="/historico-caixas"
              className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold hover:bg-orange-600"
            >
              Voltar ao histórico
            </Link>
          </div>
        ) : cashSession ? (
          <>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-bold">
                      Caixa #{cashSession.id}
                    </h2>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        cashSession.status === "open"
                          ? "bg-green-950 text-green-400"
                          : "bg-slate-800 text-gray-300"
                      }`}
                    >
                      {cashSession.status === "open"
                        ? "🟢 Aberta"
                        : "⚫ Fechada"}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-400">
                    Aberta em{" "}
                    {formatDateTime(
                      cashSession.opened_at
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 px-5 py-4">
                  <p className="text-sm text-gray-400">
                    Total vendido
                  </p>

                  <p className="text-3xl font-bold text-orange-400">
                    {formatCurrency(salesTotal)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Hora de abertura
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatTime(
                      cashSession.opened_at
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Hora de fecho
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatTime(
                      cashSession.closed_at
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Número de vendas
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {sales.length}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Fundo inicial
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(
                      cashSession.opening_amount
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Valor esperado
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(expectedAmount)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Valor contado
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {cashSession.closing_amount ===
                    null
                      ? "—"
                      : formatCurrency(
                          cashSession.closing_amount
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Diferença
                  </p>

                  <p
                    className={`mt-1 text-xl font-bold ${
                      cashSession.difference === null
                        ? "text-gray-300"
                        : cashSession.difference === 0
                          ? "text-green-400"
                          : cashSession.difference > 0
                            ? "text-blue-400"
                            : "text-red-400"
                    }`}
                  >
                    {cashSession.difference === null
                      ? "—"
                      : formatCurrency(
                          cashSession.difference
                        )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-4">
                  <p className="text-sm text-gray-400">
                    Estado
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {cashSession.status === "open"
                      ? "Aberta"
                      : "Fechada"}
                  </p>
                </div>
              </div>

              {cashSession.notes && (
                <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-5">
                  <p className="text-sm text-gray-400">
                    Observações
                  </p>

                  <p className="mt-2">
                    {cashSession.notes}
                  </p>
                </div>
              )}
            </article>

            <section className="mt-8 rounded-2xl bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">
                Produtos vendidos
              </h2>

              <p className="mt-2 text-gray-400">
                Resumo dos produtos vendidos neste
                turno.
              </p>

              {productsSummary.length === 0 ? (
                <p className="mt-6 text-gray-400">
                  Ainda não existem produtos vendidos
                  nesta caixa.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {productsSummary.map((product) => (
                    <div
                      key={product.product_name}
                      className="flex flex-col gap-3 rounded-xl bg-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-bold">
                          {product.product_name}
                        </p>

                        <p className="text-sm text-gray-400">
                          Quantidade vendida:{" "}
                          {product.quantity}
                        </p>
                      </div>

                      <p className="text-xl font-bold text-orange-400">
                        {formatCurrency(product.total)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 rounded-2xl bg-slate-900 p-6">
              <h2 className="text-2xl font-bold">
                Vendas realizadas
              </h2>

              <p className="mt-2 text-gray-400">
                Lista completa das vendas associadas
                a esta caixa.
              </p>

              {sales.length === 0 ? (
                <p className="mt-6 text-gray-400">
                  Ainda não existem vendas nesta
                  caixa.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {sales.map((sale) => {
                    const items =
                      getItemsFromSale(sale.id);

                    return (
                      <article
                        key={sale.id}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-xl font-bold">
                              Venda #{sale.id}
                            </h3>

                            <p className="mt-1 text-sm text-gray-400">
                              {formatDateTime(
                                sale.created_at
                              )}
                            </p>
                          </div>

                          <p className="text-2xl font-bold text-orange-400">
                            {formatCurrency(sale.total)}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-gray-400">
                              Recebido
                            </p>

                            <p className="font-bold">
                              {formatCurrency(
                                sale.amount_received
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-gray-400">
                              Troco
                            </p>

                            <p className="font-bold">
                              {formatCurrency(
                                sale.change_amount
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-slate-900 p-3">
                            <p className="text-xs text-gray-400">
                              Pagamento
                            </p>

                            <p className="font-bold">
                              {sale.payment_method ===
                              "cash"
                                ? "Dinheiro"
                                : sale.payment_method}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-4 rounded-lg bg-slate-900 p-3"
                            >
                              <div>
                                <p className="font-semibold">
                                  {item.product_name}
                                </p>

                                <p className="text-sm text-gray-400">
                                  {item.quantity} ×{" "}
                                  {formatCurrency(
                                    item.unit_price
                                  )}
                                </p>
                              </div>

                              <p className="font-bold">
                                {formatCurrency(
                                  item.subtotal
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}