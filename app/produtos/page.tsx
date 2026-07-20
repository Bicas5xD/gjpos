"use client";

import { FormEvent, useEffect, useState } from "react";
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

type ProductForm = {
  name: string;
  price: string;
  stock: string;
  category: string;
  active: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  price: "",
  stock: "",
  category: "",
  active: true,
};

const categories = [
  "Bebidas",
  "Bar",
  "Comida",
  "Snacks",
  "Sobremesas",
  "Menu",
  "Café",
];

function getCategoryLabel(category: string) {
  switch (category) {
    case "Bebidas":
      return "🥤 Bebidas";

    case "Bar":
      return "🍹 Bar";

    case "Comida":
      return "🍔 Comida";

    case "Snacks":
      return "🍟 Snacks";

    case "Sobremesas":
      return "🍨 Sobremesas";

    case "Menu":
      return "📋 Menu";

    case "Café":
      return "☕ Café";

    default:
      return category;
  }
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadProducts() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, stock, category, active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar produtos:", error);
      setErrorMessage("Não foi possível carregar os produtos.");
      setIsLoading(false);
      return;
    }

    const formattedProducts: Product[] = (data ?? []).map(
      (product) => ({
        id: Number(product.id),
        name: product.name,
        price: Number(product.price),
        stock: Number(product.stock),
        category: product.category,
        active: product.active,
      })
    );

    setProducts(formattedProducts);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function handleChange(
    field: keyof ProductForm,
    value: string | boolean
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function startEditing(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category ?? "",
      active: product.active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const category = form.category.trim();
    const price = Number(form.price.replace(",", "."));
    const stock = Number(form.stock);

    if (!name) {
      alert("Indica o nome do produto.");
      return;
    }

    if (!category) {
      alert("Seleciona uma categoria.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("Indica um preço válido.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      alert("Indica uma quantidade de stock válida.");
      return;
    }

    setIsSaving(true);

    try {
      const productData = {
        name,
        price,
        stock,
        category,
        active: form.active,
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId);

        if (error) {
          throw error;
        }

        alert("Produto atualizado com sucesso.");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);

        if (error) {
          throw error;
        }

        alert("Produto adicionado com sucesso.");
      }

      setForm(emptyForm);
      setEditingId(null);

      await loadProducts();
    } catch (error) {
      console.error("Erro ao guardar produto:", error);

      alert(
        "Não foi possível guardar o produto. Confirma se o nome já existe e verifica o Console."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleProductActive(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({
        active: !product.active,
      })
      .eq("id", product.id);

    if (error) {
      console.error("Erro ao alterar produto:", error);
      alert("Não foi possível alterar o estado do produto.");
      return;
    }

    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Tens a certeza de que queres eliminar "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error("Erro ao eliminar produto:", error);

      alert(
        "Não foi possível eliminar o produto. Pode já estar associado a uma venda."
      );

      return;
    }

    if (editingId === product.id) {
      cancelEditing();
    }

    await loadProducts();
  }

  const filteredProducts = products.filter((product) => {
    const searchTerm = search.trim().toLowerCase();

    if (!searchTerm) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-4 text-white md:p-10">
        <h1 className="mb-8 text-4xl font-bold text-orange-500">
          Produtos
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-2xl bg-slate-900 p-6"
        >
          <h2 className="mb-6 text-2xl font-bold">
            {editingId === null
              ? "Adicionar produto"
              : "Editar produto"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold">
                Nome
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  handleChange("name", event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-orange-500"
                placeholder="Ex.: Coca-Cola"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Categoria
              </label>

              <select
                value={form.category}
                onChange={(event) =>
                  handleChange("category", event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-orange-500"
              >
                <option value="">
                  Selecionar categoria
                </option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Preço
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  handleChange("price", event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-orange-500"
                placeholder="0,00"
              />
            </div>

            <div>
              <label className="mb-2 block font-semibold">
                Stock
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  handleChange("stock", event.target.value)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 outline-none focus:border-orange-500"
                placeholder="0"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                handleChange("active", event.target.checked)
              }
              className="h-5 w-5"
            />

            <span>Produto ativo</span>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-green-600 px-6 py-3 font-bold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "A guardar..."
                : editingId === null
                  ? "Adicionar produto"
                  : "Guardar alterações"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-xl bg-slate-700 px-6 py-3 font-bold hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-bold">
              Lista de produtos
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pesquisar produto ou categoria..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-orange-500 md:w-auto"
            />
          </div>

          {isLoading ? (
            <p className="text-gray-400">
              A carregar produtos...
            </p>
          ) : errorMessage ? (
            <div>
              <p className="text-red-400">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadProducts()}
                className="mt-4 rounded-lg bg-orange-500 px-4 py-2 font-bold hover:bg-orange-600"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-gray-400">
              Não foram encontrados produtos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-gray-400">
                    <th className="p-3">Produto</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Preço</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-800"
                    >
                      <td className="p-3 font-semibold">
                        {product.name}
                      </td>

                      <td className="p-3">
                        {product.category ? (
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-gray-200">
                            {getCategoryLabel(product.category)}
                          </span>
                        ) : (
                          <span className="text-gray-500">
                            Sem categoria
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {product.price.toFixed(2)} €
                      </td>

                      <td className="p-3">
                        <span
                          className={
                            product.stock === 0
                              ? "font-bold text-red-400"
                              : product.stock <= 5
                                ? "font-bold text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {product.stock}
                        </span>
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleProductActive(product)
                          }
                          className={`rounded-full px-3 py-1 text-sm font-bold ${
                            product.active
                              ? "bg-green-900 text-green-300"
                              : "bg-slate-700 text-gray-300"
                          }`}
                        >
                          {product.active
                            ? "Ativo"
                            : "Inativo"}
                        </button>
                      </td>

                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(product)
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold hover:bg-blue-700"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void deleteProduct(product)
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}