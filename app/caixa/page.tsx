"use client";

import {
  useCallback,
  useEffect,
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
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
};

export default function Caixa() {
  const [openSession, setOpenSession] =
    useState<CashSession | null>(null);

  const [openingAmount, setOpeningAmount] =
    useState("");

  const [countedAmount, setCountedAmount] =
    useState("");

  const [notes, setNotes] = useState("");

  const [salesTotal, setSalesTotal] = useState(0);
  const [salesCount, setSalesCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadCashSession = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { data: session, error: sessionError } =
        await supabase
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
          .eq("status", "open")
          .maybeSingle();

      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        setOpenSession(null);
        setSalesTotal(0);
        setSalesCount(0);
        setIsLoading(false);
        return;
      }

      const formattedSession: CashSession = {
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
      };

      setOpenSession(formattedSession);

      const { data: sales, error: salesError } =
        await supabase
          .from("sales")
          .select("id, total")
          .eq("cash_session_id", formattedSession.id);

      if (salesError) {
        throw salesError;
      }

      const total = (sales ?? []).reduce(
        (sum, sale) => sum + Number(sale.total),
        0
      );

      setSalesTotal(total);
      setSalesCount((sales ?? []).length);
    } catch (error) {
      console.error(
        "Erro ao carregar a caixa:",
        error
      );

      setErrorMessage(
        "Não foi possível carregar os dados da caixa."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCashSession();
  }, [loadCashSession]);

  async function openCash() {
    if (isSaving || openSession) {
      return;
    }

    const parsedOpeningAmount = Number(
      openingAmount.replace(",", ".")
    );

    if (
      openingAmount.trim() === "" ||
      Number.isNaN(parsedOpeningAmount) ||
      parsedOpeningAmount < 0
    ) {
      alert(
        "Indica um valor inicial válido para abrir a caixa."
      );
      return;
    }

    const confirmed = window.confirm(
      `Abrir a caixa com ${parsedOpeningAmount.toFixed(
        2
      )} €?`
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("cash_sessions")
        .insert({
          opening_amount: parsedOpeningAmount,
          status: "open",
        });

      if (error) {
        throw error;
      }

      setOpeningAmount("");
      await loadCashSession();

      alert("Caixa aberta com sucesso!");
    } catch (error) {
      console.error(
        "Erro ao abrir a caixa:",
        error
      );

      alert(
        "Não foi possível abrir a caixa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function closeCash() {
    if (!openSession || isSaving) {
      return;
    }

    const parsedCountedAmount = Number(
      countedAmount.replace(",", ".")
    );

    if (
      countedAmount.trim() === "" ||
      Number.isNaN(parsedCountedAmount) ||
      parsedCountedAmount < 0
    ) {
      alert(
        "Indica o dinheiro contado na caixa."
      );
      return;
    }

    const expectedAmount =
      openSession.opening_amount + salesTotal;

    const difference =
      parsedCountedAmount - expectedAmount;

    const confirmed = window.confirm(
      [
        "Confirmar fecho de caixa?",
        "",
        `Fundo inicial: ${openSession.opening_amount.toFixed(
          2
        )} €`,
        `Total vendido: ${salesTotal.toFixed(2)} €`,
        `Valor esperado: ${expectedAmount.toFixed(
          2
        )} €`,
        `Valor contado: ${parsedCountedAmount.toFixed(
          2
        )} €`,
        `Diferença: ${difference.toFixed(2)} €`,
      ].join("\n")
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("cash_sessions")
        .update({
          closing_amount: parsedCountedAmount,
          expected_amount: expectedAmount,
          difference,
          status: "closed",
          closed_at: new Date().toISOString(),
          notes: notes.trim() || null,
        })
        .eq("id", openSession.id)
        .eq("status", "open");

      if (error) {
        throw error;
      }

      setCountedAmount("");
      setNotes("");
      await loadCashSession();

      alert(
        `Caixa fechada com sucesso!\nDiferença: ${difference.toFixed(
          2
        )} €`
      );
    } catch (error) {
      console.error(
        "Erro ao fechar a caixa:",
        error
      );

      alert(
        "Não foi possível fechar a caixa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const expectedAmount = openSession
    ? openSession.opening_amount + salesTotal
    : 0;

  const parsedCountedAmount = Number(
    countedAmount.replace(",", ".")
  );

  const currentDifference =
    countedAmount.trim() === "" ||
    Number.isNaN(parsedCountedAmount)
      ? null
      : parsedCountedAmount - expectedAmount;

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-6 text-white md:p-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-500">
            Caixa
          </h1>

          <p className="mt-2 text-gray-400">
            Abre, acompanha e fecha o turno de caixa.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-slate-900 p-8">
            <p className="text-gray-400">
              A carregar os dados da caixa...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-800 bg-red-950 p-6">
            <p className="text-red-300">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadCashSession()
              }
              className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-bold hover:bg-red-600"
            >
              Tentar novamente
            </button>
          </div>
        ) : !openSession ? (
          <div className="mx-auto max-w-2xl rounded-2xl bg-slate-900 p-8">
            <div className="text-center">
              <div className="text-6xl">🔒</div>

              <h2 className="mt-4 text-3xl font-bold">
                Caixa fechada
              </h2>

              <p className="mt-2 text-gray-400">
                Indica o fundo inicial para começar
                um novo turno.
              </p>
            </div>

            <label
              htmlFor="openingAmount"
              className="mt-8 block text-lg font-semibold"
            >
              Fundo inicial
            </label>

            <input
              id="openingAmount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={openingAmount}
              onChange={(event) =>
                setOpeningAmount(event.target.value)
              }
              placeholder="0,00 €"
              disabled={isSaving}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-5 text-center text-3xl font-bold outline-none focus:border-orange-500 disabled:opacity-50"
            />

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[0, 20, 50, 100].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() =>
                    setOpeningAmount(
                      amount.toString()
                    )
                  }
                  disabled={isSaving}
                  className="rounded-xl bg-slate-800 py-4 text-lg font-bold transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {amount} €
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={openCash}
              disabled={isSaving}
              className="mt-6 w-full rounded-xl bg-green-600 py-5 text-xl font-bold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {isSaving
                ? "A abrir caixa..."
                : "Abrir Caixa"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-2xl border border-green-800 bg-green-950 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-green-400">
                    Caixa aberta
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Turno #{openSession.id}
                  </h2>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm text-green-300">
                    Aberta em
                  </p>

                  <p className="font-bold">
                    {formatDate(
                      openSession.opened_at
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-900 p-6">
                <p className="text-gray-400">
                  Fundo inicial
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-400">
                  {openSession.opening_amount.toFixed(
                    2
                  )}{" "}
                  €
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-6">
                <p className="text-gray-400">
                  Número de vendas
                </p>

                <p className="mt-2 text-3xl font-bold text-orange-400">
                  {salesCount}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-6">
                <p className="text-gray-400">
                  Total vendido
                </p>

                <p className="mt-2 text-3xl font-bold text-green-400">
                  {salesTotal.toFixed(2)} €
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-6">
                <p className="text-gray-400">
                  Valor esperado
                </p>

                <p className="mt-2 text-3xl font-bold text-purple-400">
                  {expectedAmount.toFixed(2)} €
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 md:p-8">
              <h2 className="text-2xl font-bold">
                Fechar caixa
              </h2>

              <p className="mt-2 text-gray-400">
                Conta todo o dinheiro existente na
                caixa, incluindo o fundo inicial.
              </p>

              <label
                htmlFor="countedAmount"
                className="mt-6 block text-lg font-semibold"
              >
                Dinheiro contado
              </label>

              <input
                id="countedAmount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={countedAmount}
                onChange={(event) =>
                  setCountedAmount(
                    event.target.value
                  )
                }
                placeholder="0,00 €"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-5 text-center text-3xl font-bold outline-none focus:border-orange-500 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() =>
                  setCountedAmount(
                    expectedAmount.toFixed(2)
                  )
                }
                disabled={isSaving}
                className="mt-3 w-full rounded-xl bg-slate-700 py-3 font-bold hover:bg-slate-600 disabled:opacity-50"
              >
                Usar valor esperado
              </button>

              <div className="mt-5 rounded-xl bg-slate-800 p-5">
                <p className="text-gray-400">
                  Diferença
                </p>

                <p
                  className={`mt-1 text-3xl font-bold ${
                    currentDifference === null
                      ? "text-gray-400"
                      : currentDifference === 0
                        ? "text-green-400"
                        : currentDifference > 0
                          ? "text-blue-400"
                          : "text-red-400"
                  }`}
                >
                  {currentDifference === null
                    ? "—"
                    : `${currentDifference.toFixed(
                        2
                      )} €`}
                </p>

                {currentDifference !== null && (
                  <p className="mt-1 text-sm text-gray-400">
                    {currentDifference === 0
                      ? "A caixa está certa."
                      : currentDifference > 0
                        ? "Existe dinheiro a mais."
                        : "Existe dinheiro em falta."}
                  </p>
                )}
              </div>

              <label
                htmlFor="notes"
                className="mt-6 block text-lg font-semibold"
              >
                Observações
              </label>

              <textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Opcional..."
                rows={3}
                disabled={isSaving}
                className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none focus:border-orange-500 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={closeCash}
                disabled={
                  isSaving ||
                  countedAmount.trim() === ""
                }
                className="mt-6 w-full rounded-xl bg-red-600 py-5 text-xl font-bold transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                {isSaving
                  ? "A fechar caixa..."
                  : "Fechar Caixa"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}