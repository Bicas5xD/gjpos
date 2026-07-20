"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type BackupData = {
  created_at: string;
  version: string;
  products: unknown[];
  sales: unknown[];
  sale_items: unknown[];
  cash_sessions: unknown[];
};

export default function ConfiguracoesPage() {
  const [isCreatingBackup, setIsCreatingBackup] =
    useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  async function createBackup() {
    if (isCreatingBackup) {
      return;
    }

    setIsCreatingBackup(true);
    setMessage("");
    setErrorMessage("");

    try {
      const [
        productsResult,
        salesResult,
        saleItemsResult,
        cashSessionsResult,
      ] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .order("id", { ascending: true }),

        supabase
          .from("sales")
          .select("*")
          .order("id", { ascending: true }),

        supabase
          .from("sale_items")
          .select("*")
          .order("id", { ascending: true }),

        supabase
          .from("cash_sessions")
          .select("*")
          .order("id", { ascending: true }),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      if (salesResult.error) {
        throw salesResult.error;
      }

      if (saleItemsResult.error) {
        throw saleItemsResult.error;
      }

      if (cashSessionsResult.error) {
        throw cashSessionsResult.error;
      }

      const backup: BackupData = {
        created_at: new Date().toISOString(),
        version: "1.0",
        products: productsResult.data ?? [],
        sales: salesResult.data ?? [],
        sale_items: saleItemsResult.data ?? [],
        cash_sessions: cashSessionsResult.data ?? [],
      };

      const json = JSON.stringify(
        backup,
        null,
        2
      );

      const blob = new Blob([json], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const date = new Date();

      const fileName = [
        "backup-gjspos",
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(
          2,
          "0"
        ),
        String(date.getDate()).padStart(2, "0"),
        `${String(date.getHours()).padStart(
          2,
          "0"
        )}-${String(date.getMinutes()).padStart(
          2,
          "0"
        )}`,
      ].join("-");

      const link = document.createElement("a");

      link.href = url;
      link.download = `${fileName}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      setMessage(
        "Cópia de segurança criada com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao criar cópia de segurança:",
        error
      );

      setErrorMessage(
        "Não foi possível criar a cópia de segurança."
      );
    } finally {
      setIsCreatingBackup(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-6 text-white md:p-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-500">
            Configurações
          </h1>

          <p className="mt-2 text-gray-400">
            Gere e descarrega cópias de segurança
            dos dados do GjsPOS.
          </p>
        </div>

        <div className="max-w-3xl rounded-2xl bg-slate-900 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Cópia de segurança
              </h2>

              <p className="mt-2 text-gray-400">
                O ficheiro inclui produtos, vendas,
                artigos vendidos e sessões de caixa.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void createBackup()
              }
              disabled={isCreatingBackup}
              className="rounded-xl bg-green-600 px-6 py-4 text-lg font-bold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingBackup
                ? "A criar cópia..."
                : "💾 Criar cópia de segurança"}
            </button>
          </div>

          {message && (
            <div className="mt-6 rounded-xl border border-green-800 bg-green-950 p-4 text-green-300">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold text-yellow-300">
              Guarda o ficheiro num local seguro.
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Esta primeira versão cria uma cópia
              manual no computador. A restauração
              será adicionada separadamente para
              evitar substituições acidentais.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}