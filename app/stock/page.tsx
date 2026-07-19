"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  active: boolean;
};

type StockFilter =
  | "all"
  | "available"
  | "low"
  | "out";

type SortOption =
  | "name"
  | "stock-low"
  | "stock-high"
  | "category";

export default function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [stockFilter, setStockFilter] =
    useState<StockFilter>("all");
  const [sortOption, setSortOption] =
    useState<SortOption>("name");
  const [showInactive, setShowInactive] =
    useState(false);

  const [manualValues, setManualValues] = useState<
    Record<number, string>
  >({});

  const [updatingProductId, setUpdatingProductId] =
    useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, price, stock, category, active"
      )
      .order("name", { ascending: true });

    if (error) {
      console.error(
        "Erro ao carregar o stock:",
        error
      );

      setErrorMessage(
        "Não foi possível carregar os produtos."
      );
      setIsLoading(false);
      return;
    }

    const formattedProducts: Product[] = (
      data ?? []
    ).map((product) => ({
      id: Number(product.id),
      name: product.name,
      price: Number(product.price),
      stock: Number(product.stock),
      category: product.category,
      active: Boolean(product.active),
    }));

    setProducts(formattedProducts);

    setManualValues(
      Object.fromEntries(
        formattedProducts.map((product) => [
          product.id,
          product.stock.toString(),
        ])
      )
    );

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function updateStock(
    product: Product,
    newStock: number
  ) {
    if (updatingProductId !== null) {
      return;
    }

    if (!Number.isInteger(newStock) || newStock < 0) {
      alert(
        "O stock deve ser um número inteiro igual ou superior a zero."
      );
      return;
    }

    setUpdatingProductId(product.id);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          stock: newStock,
        })
        .eq("id", product.id);

      if (error) {
        throw error;
      }

      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id
            ? {
                ...currentProduct,
                stock: newStock,
              }
            : currentProduct
        )
      );

      setManualValues((currentValues) => ({
        ...currentValues,
        [product.id]: newStock.toString(),
      }));
    } catch (error) {
      console.error(
        "Erro ao atualizar o stock:",
        error
      );

      alert(
        `Não foi possível atualizar o stock de "${product.name}".`
      );
    } finally {
      setUpdatingProductId(null);
    }
  }

  async function adjustStock(
    product: Product,
    amount: number
  ) {
    const newStock = Math.max(
      0,
      product.stock + amount
    );

    if (newStock === product.stock) {
      return;
    }

    await updateStock(product, newStock);
  }

  async function saveManualStock(product: Product) {
    const value = manualValues[product.id] ?? "";
    const newStock = Number(value);

    if (
      value.trim() === "" ||
      !Number.isInteger(newStock) ||
      newStock < 0
    ) {
      alert(
        "Indica uma quantidade de stock válida."
      );

      setManualValues((currentValues) => ({
        ...currentValues,
        [product.id]: product.stock.toString(),
      }));

      return;
    }

    await updateStock(product, newStock);
  }

  function getStockStatus(product: Product) {
    if (product.stock === 0) {
      return {
        label: "Sem stock",
        className:
          "bg-red-950 text-red-300 border-red-800",
      };
    }

    if (product.stock <= 5) {
      return {
        label: "Stock baixo",
        className:
          "bg-yellow-950 text-yellow-300 border-yellow-800",
      };
    }

    return {
      label: "Disponível",
      className:
        "bg-green-950 text-green-300 border-green-800",
    };
  }

  const categories = useMemo(() => {
    const categorySet = new Set<string>();

    products.forEach((product) => {
      if (product.category?.trim()) {
        categorySet.add(product.category.trim());
      }
    });

    return Array.from(categorySet).sort((a, b) =>
      a.localeCompare(b, "pt")
    );
  }, [products]);

  const visibleProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const filteredProducts = products.filter(
      (product) => {
        if (!showInactive && !product.active) {
          return false;
        }

        const matchesSearch =
          !searchTerm ||
          product.name
            .toLowerCase()
            .includes(searchTerm) ||
          product.category
            ?.toLowerCase()
            .includes(searchTerm);

        const matchesCategory =
          categoryFilter === "all" ||
          product.category === categoryFilter;

        let matchesStock = true;

        if (stockFilter === "available") {
          matchesStock = product.stock > 5;
        }

        if (stockFilter === "low") {
          matchesStock =
            product.stock > 0 &&
            product.stock <= 5;
        }

        if (stockFilter === "out") {
          matchesStock = product.stock === 0;
        }

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStock
        );
      }
    );

    return [...filteredProducts].sort((a, b) => {
      if (sortOption === "stock-low") {
        return a.stock - b.stock;
      }

      if (sortOption === "stock-high") {
        return b.stock - a.stock;
      }

      if (sortOption === "category") {
        const categoryA =
          a.category ?? "Sem categoria";
        const categoryB =
          b.category ?? "Sem categoria";

        const categoryComparison =
          categoryA.localeCompare(
            categoryB,
            "pt"
          );

        if (categoryComparison !== 0) {
          return categoryComparison;
        }
      }

      return a.name.localeCompare(b.name, "pt");
    });
  }, [
    products,
    search,
    categoryFilter,
    stockFilter,
    sortOption,
    showInactive,
  ]);

  const activeProducts = products.filter(
    (product) => product.active
  );

  const totalUnits = activeProducts.reduce(
    (total, product) => total + product.stock,
    0
  );

  const availableProductsCount =
    activeProducts.filter(
      (product) => product.stock > 5
    ).length;

  const lowStockCount = activeProducts.filter(
    (product) =>
      product.stock > 0 && product.stock <= 5
  ).length;

  const outOfStockCount = activeProducts.filter(
    (product) => product.stock === 0
  ).length;

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
    setSortOption("name");
    setShowInactive(false);
  }

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-6 text-white md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-orange-500">
              Stock
            </h1>

            <p className="mt-2 text-gray-400">
              Consulta e atualiza rapidamente as
              quantidades disponíveis.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadProducts()}
            disabled={isLoading}
            className="rounded-xl bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading
              ? "A atualizar..."
              : "Atualizar dados"}
          </button>
        </div>

        {/* Resumo */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setStockFilter("all")}
            className="rounded-2xl bg-slate-900 p-6 text-left transition hover:bg-slate-800"
          >
            <p className="text-gray-400">
              Unidades em stock
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-400">
              {isLoading ? "..." : totalUnits}
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setStockFilter("available")
            }
            className="rounded-2xl bg-slate-900 p-6 text-left transition hover:bg-slate-800"
          >
            <p className="text-gray-400">
              Produtos disponíveis
            </p>

            <p className="mt-2 text-3xl font-bold text-green-400">
              {isLoading
                ? "..."
                : availableProductsCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter("low")}
            className="rounded-2xl bg-slate-900 p-6 text-left transition hover:bg-slate-800"
          >
            <p className="text-gray-400">
              Stock baixo
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {isLoading ? "..." : lowStockCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter("out")}
            className="rounded-2xl bg-slate-900 p-6 text-left transition hover:bg-slate-800"
          >
            <p className="text-gray-400">
              Sem stock
            </p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              {isLoading ? "..." : outOfStockCount}
            </p>
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-8 rounded-2xl bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">
            Pesquisa e filtros
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Pesquisar
              </label>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Nome ou categoria..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Categoria
              </label>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="all">
                  Todas as categorias
                </option>

                {categories.map((category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Estado do stock
              </label>

              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(
                    event.target
                      .value as StockFilter
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="all">
                  Todos
                </option>

                <option value="available">
                  Disponível
                </option>

                <option value="low">
                  Stock baixo
                </option>

                <option value="out">
                  Sem stock
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-300">
                Ordenar por
              </label>

              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(
                    event.target
                      .value as SortOption
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500"
              >
                <option value="name">
                  Nome
                </option>

                <option value="stock-low">
                  Menor stock
                </option>

                <option value="stock-high">
                  Maior stock
                </option>

                <option value="category">
                  Categoria
                </option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) =>
                  setShowInactive(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />

              <span className="text-gray-300">
                Mostrar produtos inativos
              </span>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg bg-slate-700 px-4 py-2 font-bold transition hover:bg-slate-600"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
            <p>{errorMessage}</p>

            <button
              type="button"
              onClick={() => void loadProducts()}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 font-bold hover:bg-red-600"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Produtos */}
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold">
              Inventário
            </h2>

            {!isLoading && (
              <span className="text-sm text-gray-400">
                {visibleProducts.length} produto
                {visibleProducts.length === 1
                  ? ""
                  : "s"}
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-gray-400">
              A carregar o stock...
            </p>
          ) : visibleProducts.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-5xl">📦</div>

              <p className="mt-4 text-gray-400">
                Não foram encontrados produtos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleProducts.map((product) => {
                const status =
                  getStockStatus(product);

                const isUpdating =
                  updatingProductId === product.id;

                return (
                  <div
                    key={product.id}
                    className={`rounded-2xl border p-5 ${
                      product.active
                        ? "border-slate-700 bg-slate-950"
                        : "border-slate-800 bg-slate-950 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 xl:w-1/4">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold">
                            {product.name}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}
                          >
                            {status.label}
                          </span>

                          {!product.active && (
                            <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-bold text-gray-300">
                              Inativo
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-gray-400">
                          {product.category ||
                            "Sem categoria"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 xl:justify-center">
                        <div
                          className={`min-w-24 rounded-xl px-5 py-3 text-center text-3xl font-bold ${
                            product.stock === 0
                              ? "bg-red-950 text-red-400"
                              : product.stock <= 5
                                ? "bg-yellow-950 text-yellow-400"
                                : "bg-green-950 text-green-400"
                          }`}
                        >
                          {product.stock}
                        </div>

                        <span className="text-sm text-gray-400">
                          unidades
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[-10, -5, -1, 1, 5, 10].map(
                          (amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() =>
                                void adjustStock(
                                  product,
                                  amount
                                )
                              }
                              disabled={
                                isUpdating ||
                                updatingProductId !==
                                  null ||
                                (amount < 0 &&
                                  product.stock === 0)
                              }
                              className={`min-w-14 rounded-lg px-3 py-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                amount < 0
                                  ? "bg-red-700 hover:bg-red-600"
                                  : "bg-green-700 hover:bg-green-600"
                              }`}
                            >
                              {amount > 0
                                ? `+${amount}`
                                : amount}
                            </button>
                          )
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            manualValues[
                              product.id
                            ] ?? ""
                          }
                          onChange={(event) =>
                            setManualValues(
                              (currentValues) => ({
                                ...currentValues,
                                [product.id]:
                                  event.target.value,
                              })
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter"
                            ) {
                              void saveManualStock(
                                product
                              );
                            }
                          }}
                          disabled={
                            isUpdating ||
                            updatingProductId !== null
                          }
                          aria-label={`Stock de ${product.name}`}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center font-bold outline-none focus:border-orange-500 disabled:opacity-50 sm:w-28"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            void saveManualStock(
                              product
                            )
                          }
                          disabled={
                            isUpdating ||
                            updatingProductId !== null
                          }
                          className="rounded-xl bg-orange-500 px-5 py-3 font-bold transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUpdating
                            ? "A guardar..."
                            : "Definir"}
                        </button>
                      </div>
                    </div>
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